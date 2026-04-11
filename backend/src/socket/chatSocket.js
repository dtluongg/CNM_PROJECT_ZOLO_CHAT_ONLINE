/**
 * chatSocket.js
 * ──────────────────────────────────────────────────────────────────────────
 * Xử lý các socket event liên quan đến chat:
 *   - Tham gia / rời room conversation (để nhận typing indicator)
 *   - Typing indicator (ai đang nhập)
 *
 * Lưu ý: việc delivery tin nhắn KHÔNG qua socket.emit từ client.
 * Tin nhắn gửi qua REST API → controller → getIO().to().emit()
 * → client nhận qua event 'chat:new-message'.
 *
 * Socket Rooms:
 *   user:{userId}        – personal room (nhận tin nhắn mới, call events)
 *   conv:{conversationId} – conversation room (nhận typing indicators)
 * ──────────────────────────────────────────────────────────────────────────
 */

const ConversationMember = require('../models/conversationMemberModel');

module.exports = (io, socket, onlineUsers) => {
    const userId = socket.user._id.toString();

    // ═══════════════════════════════════════════════════════════════
    //  chat:join  –  Client tham gia room conversation
    //  data: { conversationId }
    //
    //  Dùng khi user mở conversation để nhận typing indicators.
    //  Kiểm tra membership trước khi join để tránh leak event.
    // ═══════════════════════════════════════════════════════════════
    socket.on('chat:join', async (data) => {
        const { conversationId } = data || {};
        if (!conversationId) return;

        try {
            const isMember = await ConversationMember.findOne({
                conversationId,
                userId,
                leftAt: null,
            });
            if (!isMember) return;

            socket.join(`conv:${conversationId}`);
        } catch (err) {
            console.error('chat:join error:', err);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    //  chat:leave  –  Client rời room conversation
    //  data: { conversationId }
    // ═══════════════════════════════════════════════════════════════
    socket.on('chat:leave', (data) => {
        const { conversationId } = data || {};
        if (conversationId) {
            socket.leave(`conv:${conversationId}`);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    //  chat:typing  –  Người dùng đang nhập
    //  data: { conversationId }
    //
    //  Server relay tới các thành viên khác trong conv room.
    //  Server emit:  { conversationId, userId, displayName }
    // ═══════════════════════════════════════════════════════════════
    socket.on('chat:typing', (data) => {
        const { conversationId } = data || {};
        if (!conversationId) return;

        socket.to(`conv:${conversationId}`).emit('chat:typing', {
            conversationId,
            userId,
            displayName: socket.user.displayName,
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  chat:stop-typing  –  Người dùng ngừng nhập
    //  data: { conversationId }
    //
    //  Server relay tới các thành viên khác trong conv room.
    //  Server emit:  { conversationId, userId }
    // ═══════════════════════════════════════════════════════════════
    socket.on('chat:stop-typing', (data) => {
        const { conversationId } = data || {};
        if (!conversationId) return;

        socket.to(`conv:${conversationId}`).emit('chat:stop-typing', {
            conversationId,
            userId,
        });
    });
};
