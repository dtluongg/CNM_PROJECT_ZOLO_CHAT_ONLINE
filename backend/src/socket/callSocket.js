/**
 * callSocket.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Xử lý toàn bộ WebRTC signaling cho cuộc gọi audio / video 1-1.
 *
 * Kiến trúc:
 *   - Backend là "signaling server" thuần túy – KHÔNG xử lý media stream.
 *   - Media đi peer-to-peer qua WebRTC (STUN/TURN do client cấu hình).
 *   - Backend relay SDP offer/answer và ICE candidates, lưu trạng thái DB.
 *
 * Socket Rooms:
 *   user:{userId}   – room cá nhân, nhận incoming call / notifications
 *   call:{callId}   – room cuộc gọi, relay ICE candidates sau khi đã kết nối
 *
 * Luồng cuộc gọi:
 *   Caller  ──call:initiate──►  Server  ──call:incoming──►  Callee
 *   Callee  ──call:answer───►  Server  ──call:answered──►  Caller
 *   (cả hai) ──call:ice-candidate──► Server ──relay──► peer còn lại
 *   (một bên) ──call:end──► Server ──call:ended──► cả hai
 * ─────────────────────────────────────────────────────────────────────────────
 */
const getFullAvatarUrl = (avatar) => {
    if (!avatar) return null;
    // Nếu bạn dùng Cloudinary / S3 signed URL có expire, nên transform về version không expire hoặc permanent URL
    // Ví dụ Cloudinary:
    // return avatar.replace(/\/upload\//, '/upload/q_auto,f_auto/');
    return avatar;
};
const Call       = require('../models/callModel');
const userModel  = require('../models/userModel');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
// Thời gian chờ nhấc máy: 30 giây
const RING_TIMEOUT_MS = 30_000;

// callId (string) → NodeJS.Timeout  — timers cho auto-missed
// Module-level: dùng chung cho mọi socket instance
const callTimers = new Map();
async function createCallSystemMessage(io, call, duration, finalStatus) {
    try {
        if (!call.conversationId) return;
        const conv = await Conversation.findById(call.conversationId);
        if (!conv || conv.type !== 'dm') return;

        const icon = call.type === 'video' ? '📹' : '📞';
        const [caller, callee] = await Promise.all([
            userModel.findById(call.callerId).select('displayName avatar').lean(),
            userModel.findById(call.calleeId).select('displayName avatar').lean(),
        ]);
        const callerAvatar = getFullAvatarUrl(caller?.avatar);
        const calleeAvatar = getFullAvatarUrl(callee?.avatar);
        let content;
        if (finalStatus === 'missed') {
            content = `${icon} Cuộc gọi nhỡ`;
        } else if (finalStatus === 'rejected') {
            content = `${icon} Cuộc gọi bị từ chối`;
        } else {
            const m = Math.floor(duration / 60);
            const s = duration % 60;
            const dur = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
            content = `${icon} Cuộc gọi ${call.type === 'video' ? 'video' : 'thoại'} · ${dur}`;
        }

        const msg = await Message.create({
            conversationId: conv._id,
            senderId: call.callerId,
            type: 'system',
            content,
            payload: {
                event: 'call_ended',
                callType: call.type,
                duration,
                status: finalStatus,
                callId: call._id,

                callerId: call.callerId.toString(),
                calleeId: call.calleeId.toString(),

                callerName: caller?.displayName || '?',
                callerAvatar,
                calleeName: callee?.displayName || '?',
                calleeAvatar,
            },
        });

        await Conversation.findByIdAndUpdate(conv._id, {
            lastMessageId:      msg._id,
            lastMessagePreview: content,
            lastMessageTime:    msg.createdAt,
        });

        const formatted = {
            _id: msg._id,
            conversationId: conv._id.toString(),
            senderId: call.callerId.toString(),
            type: 'system',
            content,
            payload: msg.payload,
            createdAt: msg.createdAt,

            callerName: msg.payload.callerName,
            callerAvatar: msg.payload.callerAvatar,
            calleeName: msg.payload.calleeName,
            calleeAvatar: msg.payload.calleeAvatar,

            time: new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        };

        [call.callerId.toString(), call.calleeId.toString()].forEach(uid => {
            io.to(`user:${uid}`).emit('chat:new-message', {
                conversationId: conv._id.toString(),
                message:        formatted,
            });
        });
    } catch (err) {
        console.error('createCallSystemMessage error:', err);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
//  Factory: được gọi 1 lần mỗi khi có socket kết nối mới
// ─────────────────────────────────────────────────────────────────────────────
module.exports = (io, socket, onlineUsers) => {
    const userId = socket.user._id.toString();

    // ═══════════════════════════════════════════════════════════════════════
    //  call:initiate  –  Caller bắt đầu gọi
    //
    //  Client gửi:
    //    { calleeId: string, type: 'audio'|'video', offer: RTCSessionDescription }
    //
    //  Server ack:
    //    { success: true, callId: string }
    //    { error: string, callId?: string }   ← callId có khi callee offline
    //
    //  Server emit tới callee:
    //    'call:incoming'  →  { callId, callerId, callerInfo, type, offer }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:initiate', async (data, ack) => {
        try {
            const { calleeId, type, offer } = data || {};

            if (!calleeId || !['audio', 'video'].includes(type) || !offer) {
                return ack?.({ error: 'Dữ liệu không hợp lệ. Cần: calleeId, type (audio|video), offer' });
            }
            if (calleeId === userId) {
                return ack?.({ error: 'Không thể gọi cho chính mình' });
            }

            const callee = await userModel.findById(calleeId).select('displayName avatar');
            if (!callee) return ack?.({ error: 'Người dùng không tồn tại' });
            const callerConvs = await ConversationMember.find({
                userId: userId, leftAt: null,
            }).distinct('conversationId');

            const sharedMember = await ConversationMember.findOne({
                conversationId: { $in: callerConvs },
                userId:         calleeId,
                leftAt:         null,
            }).lean();
            // Tạo bản ghi cuộc gọi trong DB
            const call = await Call.create({
                callerId: userId,
                calleeId,
                type,
                conversationId: sharedMember?.conversationId || null,
            });
            const callId = call._id.toString();

            // Caller join call room để nhận call:answered và ICE candidates
            socket.join(`call:${callId}`);
            socket.currentCallId = callId; // để cleanup khi disconnect

            // Callee offline → kết thúc ngay với status 'missed'
            if (!onlineUsers.has(calleeId)) {
                await Call.findByIdAndUpdate(callId, {
                    status:  'missed',
                    endedAt: new Date(),
                });
                return ack?.({ error: 'Người dùng đang offline', callId });
            }

            // Gửi thông báo đến callee qua personal room
            io.to(`user:${calleeId}`).emit('call:incoming', {
                callId,
                callerId: userId,
                callerInfo: {
                    _id:         socket.user._id,
                    displayName: socket.user.displayName,
                    avatar:      socket.user.avatar || null,
                },
                type,
                offer,
            });

            // Auto-timeout: 30s không nhấc → missed
            const timer = setTimeout(async () => {
                try {
                    const current = await Call.findById(callId);
                    if (current?.status === 'calling') {
                        await Call.findByIdAndUpdate(callId, {
                            status:  'missed',
                            endedAt: new Date(),
                        });
                        // Báo cả hai bên
                        io.to(`call:${callId}`).emit('call:timeout', { callId });
                        io.to(`user:${calleeId}`).emit('call:timeout', { callId });
                    }
                } catch (e) {
                    console.error('call timeout cleanup error:', e);
                } finally {
                    callTimers.delete(callId);
                }
            }, RING_TIMEOUT_MS);

            callTimers.set(callId, timer);

            ack?.({ success: true, callId });
        } catch (err) {
            console.error('call:initiate error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  call:answer  –  Callee chấp nhận cuộc gọi
    //
    //  Client gửi:
    //    { callId: string, answer: RTCSessionDescription }
    //
    //  Server ack:
    //    { success: true }  |  { error: string }
    //
    //  Server emit tới caller (trong call room):
    //    'call:answered'  →  { callId, answer }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:answer', async (data, ack) => {
        try {
            const { callId, answer } = data || {};
            if (!callId || !answer) {
                return ack?.({ error: 'Thiếu callId hoặc answer (RTCSessionDescription)' });
            }

            const call = await Call.findById(callId);
            if (!call)                          return ack?.({ error: 'Cuộc gọi không tồn tại' });
            if (call.calleeId.toString() !== userId) return ack?.({ error: 'Không có quyền trả lời cuộc gọi này' });
            if (call.status !== 'calling')       return ack?.({ error: 'Cuộc gọi không còn ở trạng thái chờ' });

            // Hủy timeout
            if (callTimers.has(callId)) {
                clearTimeout(callTimers.get(callId));
                callTimers.delete(callId);
            }

            await Call.findByIdAndUpdate(callId, {
                status:    'ongoing',
                startedAt: new Date(),
            });

            // Callee join call room để relay ICE candidates
            socket.join(`call:${callId}`);
            socket.currentCallId = callId;

            // Gửi answer về cho caller (đang ngồi trong call room)
            socket.to(`call:${callId}`).emit('call:answered', { callId, answer });

            ack?.({ success: true });
        } catch (err) {
            console.error('call:answer error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  call:reject  –  Callee từ chối cuộc gọi
    //
    //  Client gửi:
    //    { callId: string }
    //
    //  Server ack:
    //    { success: true }  |  { error: string }
    //
    //  Server emit tới caller:
    //    'call:rejected'  →  { callId, reason: 'rejected' }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:reject', async (data, ack) => {
        try {
            const { callId } = data || {};
            if (!callId) return ack?.({ error: 'Thiếu callId' });

            const call = await Call.findById(callId);
            if (!call)                          return ack?.({ error: 'Cuộc gọi không tồn tại' });
            if (call.calleeId.toString() !== userId) return ack?.({ error: 'Không có quyền' });

            // Hủy timeout
            if (callTimers.has(callId)) {
                clearTimeout(callTimers.get(callId));
                callTimers.delete(callId);
            }

            await Call.findByIdAndUpdate(callId, {
                status:  'rejected',
                endedAt: new Date(),
            });
            await createCallSystemMessage(io, call, 0, 'rejected');


            // Thông báo caller qua call room (caller đang ở đó) và personal room (backup)
            socket.to(`call:${callId}`).emit('call:rejected', { callId, reason: 'rejected' });
            io.to(`user:${call.callerId.toString()}`).emit('call:rejected', {
                callId,
                reason: 'rejected',
            });

            ack?.({ success: true });
        } catch (err) {
            console.error('call:reject error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  call:end  –  Kết thúc cuộc gọi (bất kỳ bên nào)
    //
    //  Client gửi:
    //    { callId: string }
    //
    //  Server ack:
    //    { success: true, duration: number }  |  { error: string }
    //
    //  Server emit tới cả hai bên (call room):
    //    'call:ended'  →  { callId, endedBy, duration, reason? }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:end', async (data, ack) => {
        try {
            const { callId } = data || {};
            if (!callId) return ack?.({ error: 'Thiếu callId' });

            const call = await Call.findById(callId);
            if (!call) return ack?.({ error: 'Cuộc gọi không tồn tại' });

            // Chỉ caller hoặc callee mới được kết thúc
            const isParticipant =
                call.callerId.toString() === userId ||
                call.calleeId.toString() === userId;
            if (!isParticipant) return ack?.({ error: 'Không có quyền kết thúc cuộc gọi này' });

            // Hủy timeout nếu vẫn đang ringing
            if (callTimers.has(callId)) {
                clearTimeout(callTimers.get(callId));
                callTimers.delete(callId);
            }

            const endedAt  = new Date();
            let   duration = 0;
            if (call.startedAt) {
                duration = Math.max(0, Math.round((endedAt - call.startedAt) / 1000));
            }

            // Nếu caller cúp khi đang ringing → missed; ngược lại → ended
            const newStatus = call.status === 'calling' ? 'missed' : 'ended';

            await Call.findByIdAndUpdate(callId, {
                status:  newStatus,
                endedAt,
                duration,
                endedBy: userId,
            });
            await createCallSystemMessage(io, call, duration, newStatus);
            socket.currentCallId = null;

            // Broadcast cho tất cả trong call room (bao gồm người gửi)
            io.to(`call:${callId}`).emit('call:ended', {
                callId,
                endedBy: userId,
                duration,
            });

            ack?.({ success: true, duration });
        } catch (err) {
            console.error('call:end error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  call:ice-candidate  –  Relay ICE candidate giữa 2 peer (WebRTC)
    //
    //  Client gửi:
    //    { callId: string, candidate: RTCIceCandidate }
    //
    //  Server relay tới peer còn lại trong call room.
    //  Server ack:
    //    { success: true }  |  { error: string }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:ice-candidate', (data, ack) => {
        try {
            const { callId, candidate } = data || {};
            if (!callId || !candidate) {
                return ack?.({ error: 'Thiếu callId hoặc candidate' });
            }

            // Relay cho peer còn lại trong call room (socket.to = trừ sender)
            socket.to(`call:${callId}`).emit('call:ice-candidate', { callId, candidate });

            ack?.({ success: true });
        } catch (err) {
            console.error('call:ice-candidate error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  Xử lý disconnect đột ngột (mất mạng, đóng tab, crash app)
    //  Nếu người dùng đang trong cuộc gọi → tự động kết thúc cuộc gọi
    //  và thông báo cho peer còn lại.
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('disconnect', async () => {
        const callId = socket.currentCallId;
        if (!callId) return;

        try {
            const call = await Call.findById(callId);
            if (!call || !['calling', 'ongoing'].includes(call.status)) return;

            // Hủy timeout
            if (callTimers.has(callId)) {
                clearTimeout(callTimers.get(callId));
                callTimers.delete(callId);
            }

            const endedAt  = new Date();
            let   duration = 0;
            if (call.startedAt) {
                duration = Math.max(0, Math.round((endedAt - call.startedAt) / 1000));
            }

            await Call.findByIdAndUpdate(callId, {
                status:  call.status === 'calling' ? 'missed' : 'ended',
                endedAt,
                duration,
                endedBy: userId,
            });
            await createCallSystemMessage(io, call, duration, call.status === 'calling' ? 'missed' : 'ended');

            // Thông báo peer còn lại (socket đã ngắt nên dùng io.to thay vì socket.to)
            socket.to(`call:${callId}`).emit('call:ended', {
                callId,
                endedBy:  userId,
                duration,
                reason:   'disconnected',
            });
        } catch (err) {
            console.error('call disconnect cleanup error:', err);
        }
    });
};
