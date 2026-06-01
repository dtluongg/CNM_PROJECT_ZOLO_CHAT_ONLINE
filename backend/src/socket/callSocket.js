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

const Call               = require('../models/callModel');
const userModel          = require('../models/userModel');
const Message            = require('../models/messageModel');
const Conversation       = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const { createAndEmitNotification } = require('../services/notificationService');

// ─── Hằng số ────────────────────────────────────────────────────────────────
const RING_TIMEOUT_MS = 30_000; // 30 giây chờ nhấc máy

// ─── Module-level state (dùng chung mọi socket instance) ────────────────────
const callTimers          = new Map(); // callId → NodeJS.Timeout
const iceCandidateBuffers = new Map(); // callId → RTCIceCandidate[]

// ─── Helper: URL avatar ──────────────────────────────────────────────────────
const getFullAvatarUrl = (avatar) => {
    if (!avatar) return null;
    // Nếu dùng Cloudinary signed URL, transform về permanent URL tại đây
    return avatar;
};

// ─── Helper: Dọn dẹp toàn bộ state của một cuộc gọi ────────────────────────
function cleanupCall(callId) {
    if (callTimers.has(callId)) {
        clearTimeout(callTimers.get(callId));
        callTimers.delete(callId);
    }
    iceCandidateBuffers.delete(callId);
}

// ─── Helper: Tạo system message sau khi cuộc gọi kết thúc ───────────────────
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

        let content;
        if (finalStatus === 'missed') {
            content = `${icon} Cuộc gọi nhỡ`;
        } else if (finalStatus === 'rejected') {
            content = `${icon} Cuộc gọi bị từ chối`;
        } else {
            const m   = Math.floor(duration / 60);
            const s   = duration % 60;
            const dur = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
            content   = `${icon} Cuộc gọi ${call.type === 'video' ? 'video' : 'thoại'} · ${dur}`;
        }

        const msg = await Message.create({
            conversationId: conv._id,
            senderId:       call.callerId,
            type:           'system',
            content,
            payload: {
                event:       'call_ended',
                callType:    call.type,
                duration,
                status:      finalStatus,
                callId:      call._id,
                callerId:    call.callerId.toString(),
                calleeId:    call.calleeId.toString(),
                callerName:  caller?.displayName  || '?',
                callerAvatar: getFullAvatarUrl(caller?.avatar),
                calleeName:  callee?.displayName  || '?',
                calleeAvatar: getFullAvatarUrl(callee?.avatar),
            },
        });

        await Conversation.findByIdAndUpdate(conv._id, {
            lastMessageId:      msg._id,
            lastMessagePreview: content,
            lastMessageTime:    msg.createdAt,
        });

        const formatted = {
            _id:            msg._id,
            conversationId: conv._id.toString(),
            senderId:       call.callerId.toString(),
            type:           'system',
            content,
            payload:        msg.payload,
            createdAt:      msg.createdAt,
            callerName:     msg.payload.callerName,
            callerAvatar:   msg.payload.callerAvatar,
            calleeName:     msg.payload.calleeName,
            calleeAvatar:   msg.payload.calleeAvatar,
            time: new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                hour:   '2-digit',
                minute: '2-digit',
            }),
        };

        [call.callerId.toString(), call.calleeId.toString()].forEach((uid) => {
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
//  Factory – gọi 1 lần mỗi khi có socket kết nối mới
// ─────────────────────────────────────────────────────────────────────────────
module.exports = (io, socket, onlineUsers) => {
    const userId = socket.user._id.toString();

    // ═══════════════════════════════════════════════════════════════════════
    //  call:initiate  –  Caller bắt đầu gọi
    //
    //  Client gửi : { calleeId, type: 'audio'|'video', offer: RTCSessionDescription }
    //  Ack thành  : { success: true, callId }
    //  Ack lỗi    : { error: string, callId? }
    //  Emit callee: 'call:incoming' → { callId, callerId, callerInfo, type, offer }
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

            // Tìm conversation chung (nếu có)
            const callerConvs = await ConversationMember.find({
                userId:  userId,
                leftAt:  null,
            }).distinct('conversationId');

            const sharedMember = await ConversationMember.findOne({
                conversationId: { $in: callerConvs },
                userId:         calleeId,
                leftAt:         null,
            }).lean();

            // Tạo bản ghi cuộc gọi
            const call   = await Call.create({
                callerId:       userId,
                calleeId,
                type,
                conversationId: sharedMember?.conversationId || null,
            });
            const callId = call._id.toString();

            // Caller join call room để nhận call:answered và ICE candidates
            socket.join(`call:${callId}`);
            socket.currentCallId = callId;

            // Callee offline → kết thúc ngay
            if (!onlineUsers.has(calleeId)) {
                await Call.findByIdAndUpdate(callId, {
                    status:  'missed',
                    endedAt: new Date(),
                });
                cleanupCall(callId);
                return ack?.({ error: 'Người dùng đang offline', callId });
            }

            // Gửi incoming call tới callee
            io.to(`user:${calleeId}`).emit('call:incoming', {
                callId,
                callerId:   userId,
                callerInfo: {
                    _id:         socket.user._id,
                    displayName: socket.user.displayName,
                    avatar:      socket.user.avatar || null,
                },
                type,
                offer,
            });

            // Push notification
            try {
                await createAndEmitNotification({
                    userId:         calleeId,
                    actorId:        userId,
                    type:           'call_incoming',
                    title:          `Cuộc gọi ${type === 'video' ? 'video' : 'thoại'} đến`,
                    body:           `${socket.user.displayName || 'Ai đó'} đang gọi cho bạn`,
                    callId:         call._id,
                    conversationId: call.conversationId,
                    data:           { callType: type },
                });
            } catch (notifyErr) {
                console.error('call incoming notification error:', notifyErr.message);
            }

            // Auto-timeout 30 giây không nhấc → missed
            const timer = setTimeout(async () => {
                try {
                    const current = await Call.findById(callId);
                    if (current?.status === 'calling') {
                        await Call.findByIdAndUpdate(callId, {
                            status:  'missed',
                            endedAt: new Date(),
                        });

                        try {
                            await createAndEmitNotification({
                                userId:         userId,
                                actorId:        calleeId,
                                type:           'call_missed',
                                title:          'Cuộc gọi nhỡ',
                                body:           `Bạn đã gọi ${callee.displayName || 'người dùng'} nhưng không có phản hồi`,
                                callId:         call._id,
                                conversationId: call.conversationId,
                            });
                        } catch (notifyErr) {
                            console.error('call missed notification error:', notifyErr.message);
                        }

                        io.to(`call:${callId}`).emit('call:timeout', { callId });
                        io.to(`user:${calleeId}`).emit('call:timeout', { callId });
                    }
                } catch (e) {
                    console.error('call timeout cleanup error:', e);
                } finally {
                    cleanupCall(callId);
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
    //  Client gửi : { callId, answer: RTCSessionDescription }
    //  Ack thành  : { success: true }
    //  Ack lỗi    : { error: string }
    //  Emit caller: 'call:answered' → { callId, answer }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:answer', async (data, ack) => {
        try {
            const { callId, answer } = data || {};
            if (!callId || !answer) {
                return ack?.({ error: 'Thiếu callId hoặc answer (RTCSessionDescription)' });
            }

            const call = await Call.findById(callId);
            if (!call)                               return ack?.({ error: 'Cuộc gọi không tồn tại' });
            if (call.calleeId.toString() !== userId) return ack?.({ error: 'Không có quyền trả lời cuộc gọi này' });
            if (call.status !== 'calling')           return ack?.({ error: 'Cuộc gọi không còn ở trạng thái chờ' });

            // Hủy ring timeout
            if (callTimers.has(callId)) {
                clearTimeout(callTimers.get(callId));
                callTimers.delete(callId);
            }

            await Call.findByIdAndUpdate(callId, {
                status:    'ongoing',
                startedAt: new Date(),
            });

            // Bước 1: Callee join call room
            socket.join(`call:${callId}`);
            socket.currentCallId = callId;

            // Bước 2: Báo caller TRƯỚC để caller gọi setRemoteDescription ngay
            socket.to(`call:${callId}`).emit('call:answered', { callId, answer });

            // Bước 3: Flush ICE candidates của caller đã buffer khi callee chưa trong room
            //         Delay nhỏ để callee kịp setRemoteDescription trước khi addIceCandidate
            const buffered = iceCandidateBuffers.get(callId) || [];
            if (buffered.length > 0) {
                setTimeout(() => {
                    for (const candidate of buffered) {
                        socket.emit('call:ice-candidate', { callId, candidate });
                    }
                }, 100);
            }

            // Bước 4: Xóa buffer tránh memory leak
            iceCandidateBuffers.delete(callId);

            ack?.({ success: true });
        } catch (err) {
            console.error('call:answer error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  call:reject  –  Callee từ chối cuộc gọi
    //
    //  Client gửi : { callId }
    //  Ack thành  : { success: true }
    //  Ack lỗi    : { error: string }
    //  Emit caller: 'call:rejected' → { callId, reason: 'rejected' }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:reject', async (data, ack) => {
        try {
            const { callId } = data || {};
            if (!callId) return ack?.({ error: 'Thiếu callId' });

            const call = await Call.findById(callId);
            if (!call)                               return ack?.({ error: 'Cuộc gọi không tồn tại' });
            if (call.calleeId.toString() !== userId) return ack?.({ error: 'Không có quyền' });

            cleanupCall(callId);

            await Call.findByIdAndUpdate(callId, {
                status:  'rejected',
                endedAt: new Date(),
            });
            await createCallSystemMessage(io, call, 0, 'rejected');

            try {
                await createAndEmitNotification({
                    userId:         call.callerId,
                    actorId:        userId,
                    type:           'call_rejected',
                    title:          'Cuộc gọi bị từ chối',
                    body:           `${socket.user.displayName || 'Người dùng'} đã từ chối cuộc gọi của bạn`,
                    callId:         call._id,
                    conversationId: call.conversationId,
                    data:           { callType: call.type },
                });
            } catch (notifyErr) {
                console.error('call rejected notification error:', notifyErr.message);
            }

            // Báo caller qua call room + personal room (backup)
            socket.to(`call:${callId}`).emit('call:rejected', { callId, reason: 'rejected' });
            io.to(`user:${call.callerId.toString()}`).emit('call:rejected', { callId, reason: 'rejected' });

            ack?.({ success: true });
        } catch (err) {
            console.error('call:reject error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  call:end  –  Kết thúc cuộc gọi (bất kỳ bên nào)
    //
    //  Client gửi : { callId }
    //  Ack thành  : { success: true, duration: number }
    //  Ack lỗi    : { error: string }
    //  Emit cả hai: 'call:ended' → { callId, endedBy, duration, reason? }
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:end', async (data, ack) => {
        try {
            const { callId } = data || {};
            if (!callId) return ack?.({ error: 'Thiếu callId' });

            const call = await Call.findById(callId);
            if (!call) return ack?.({ error: 'Cuộc gọi không tồn tại' });

            const isParticipant =
                call.callerId.toString() === userId ||
                call.calleeId.toString() === userId;
            if (!isParticipant) return ack?.({ error: 'Không có quyền kết thúc cuộc gọi này' });

            cleanupCall(callId);

            const endedAt  = new Date();
            const duration = call.startedAt
                ? Math.max(0, Math.round((endedAt - call.startedAt) / 1000))
                : 0;

            // Caller cúp khi đang ringing → missed; các trạng thái khác → ended
            const newStatus = call.status === 'calling' ? 'missed' : 'ended';

            await Call.findByIdAndUpdate(callId, {
                status:  newStatus,
                endedAt,
                duration,
                endedBy: userId,
            });
            await createCallSystemMessage(io, call, duration, newStatus);

            socket.currentCallId = null;

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
    //  call:ice-candidate  –  Relay ICE candidate giữa 2 peer
    //
    //  Client gửi : { callId, candidate: RTCIceCandidate }
    //  Ack thành  : { success: true }
    //  Ack lỗi    : { error: string }
    //
    //  Nếu peer chưa trong room → buffer lại, flush khi callee answer.
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('call:ice-candidate', (data, ack) => {
        try {
            const { callId, candidate } = data || {};
            if (!callId || !candidate) {
                return ack?.({ error: 'Thiếu callId hoặc candidate' });
            }

            const room        = io.sockets.adapter.rooms.get(`call:${callId}`);
            const peersInRoom = room ? [...room].filter((id) => id !== socket.id).length : 0;

            if (peersInRoom > 0) {
                // Peer đã trong room → relay trực tiếp
                socket.to(`call:${callId}`).emit('call:ice-candidate', { callId, candidate });
            } else {
                // Peer chưa trong room → buffer
                if (!iceCandidateBuffers.has(callId)) iceCandidateBuffers.set(callId, []);
                iceCandidateBuffers.get(callId).push(candidate);
            }

            ack?.({ success: true });
        } catch (err) {
            console.error('call:ice-candidate error:', err);
            ack?.({ error: 'Lỗi server' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  disconnect  –  Mất kết nối đột ngột (đóng tab, mất mạng, crash)
    //  Tự động kết thúc cuộc gọi và thông báo peer còn lại.
    // ═══════════════════════════════════════════════════════════════════════
    socket.on('disconnect', async () => {
        const callId = socket.currentCallId;
        if (!callId) return;

        try {
            const call = await Call.findById(callId);
            if (!call || !['calling', 'ongoing'].includes(call.status)) return;

            cleanupCall(callId);

            const endedAt  = new Date();
            const duration = call.startedAt
                ? Math.max(0, Math.round((endedAt - call.startedAt) / 1000))
                : 0;

            const finalStatus = call.status === 'calling' ? 'missed' : 'ended';

            await Call.findByIdAndUpdate(callId, {
                status:  finalStatus,
                endedAt,
                duration,
                endedBy: userId,
            });
            await createCallSystemMessage(io, call, duration, finalStatus);

            // socket đã ngắt → dùng io.to thay vì socket.to
            io.to(`call:${callId}`).emit('call:ended', {
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