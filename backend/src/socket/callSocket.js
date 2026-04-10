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

const Call       = require('../models/callModel');
const userModel  = require('../models/userModel');

// Thời gian chờ nhấc máy: 30 giây
const RING_TIMEOUT_MS = 30_000;

// callId (string) → NodeJS.Timeout  — timers cho auto-missed
// Module-level: dùng chung cho mọi socket instance
const callTimers = new Map();

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

            // Tạo bản ghi cuộc gọi trong DB
            const call   = await Call.create({ callerId: userId, calleeId, type });
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
