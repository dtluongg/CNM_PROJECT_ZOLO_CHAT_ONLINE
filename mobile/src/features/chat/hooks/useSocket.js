import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// URL socket server lấy từ biến môi trường
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.88.135:2026/backend/api')
    .replace('/backend/api', '');

/**
 * Hook quản lý kết nối Socket.io cho màn hình chat.
 * Tự động kết nối khi mount, ngắt kết nối khi unmount.
 * Lắng nghe tất cả sự kiện liên quan đến tin nhắn và thông báo.
 *
 * @param {string}   token           - Access token để xác thực socket
 * @param {string}   conversationId  - ID cuộc hội thoại hiện tại
 * @param {string}   currentUserId   - ID người dùng hiện tại
 * @param {object}   handlers        - Object chứa các callback xử lý sự kiện:
 *   - onNewMessage(message)         - Nhận tin nhắn mới
 *   - onTyping({ userId, displayName }) - Người khác đang nhập
 *   - onStopTyping()                - Người khác dừng nhập
 *   - onReaction(data)              - Cập nhật reaction
 *   - onRevoked(messageId)          - Tin nhắn bị thu hồi
 *   - onEdited(message)             - Tin nhắn bị chỉnh sửa
 *   - onRead(data)                  - Tin nhắn được đọc
 *   - onDeletedForMe(messageId)     - Tin nhắn bị xoá phía tôi
 */
const useSocket = (token, conversationId, currentUserId, handlers) => {
  const socketRef = useRef(null);

  const handlersRef = useRef(handlers);

  // Cập nhật ref mỗi khi handlers thay đổi để các listener luôn dùng bản mới nhất
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!token) return;

    // Khởi tạo kết nối socket với access token
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    // Tham gia phòng chat
    socket.emit('chat:join', { conversationId });

    // ── Tin nhắn mới ───────────────────────────────────────────────────
    socket.on('chat:new-message', ({ conversationId: cid, message }) => {
      if (cid !== conversationId) return;
      handlersRef.current.onNewMessage?.(message);
    });

    // ── Đang nhập ─────────────────────────────────────────────────────
    socket.on('chat:typing', ({ conversationId: cid, userId, displayName }) => {
      if (cid !== conversationId || userId === currentUserId) return;
      handlersRef.current.onTyping?.({ userId, displayName });
    });

    // ── Dừng nhập ─────────────────────────────────────────────────────
    socket.on('chat:stop-typing', ({ conversationId: cid }) => {
      if (cid !== conversationId) return;
      handlersRef.current.onStopTyping?.();
    });

    // ── Cập nhật reaction ─────────────────────────────────────────────
    socket.on('chat:message-reaction', (data) => {
      if (data.conversationId !== conversationId) return;
      handlersRef.current.onReaction?.({ ...data, currentUserId });
    });

    // ── Thu hồi tin nhắn ──────────────────────────────────────────────
    socket.on('chat:message-revoked', ({ conversationId: cid, messageId }) => {
      if (cid !== conversationId) return;
      handlersRef.current.onRevoked?.(messageId);
    });

    // ── Chỉnh sửa tin nhắn ────────────────────────────────────────────
    socket.on('chat:message-edited', ({ conversationId: cid, message }) => {
      if (cid !== conversationId) return;
      handlersRef.current.onEdited?.(message);
    });

    // ── Đánh dấu đã đọc ───────────────────────────────────────────────
    socket.on('chat:message-read', (data) => {
      if (data.conversationId !== conversationId) return;
      handlersRef.current.onRead?.(data);
    });

    // ── Xoá tin nhắn phía tôi ─────────────────────────────────────────
    socket.on('chat:message-deleted-for-me', ({ conversationId: cid, messageId }) => {
      if (cid !== conversationId) return;
      handlersRef.current.onDeletedForMe?.(messageId);
    });

    // ── Ghim/Bỏ ghim tin nhắn ─────────────────────────────────────────
    socket.on('chat:pin-message', (data) => {
      if (data.conversationId !== conversationId) return;
      handlersRef.current.onPinnedMessagesChange?.(data.pinnedMessages);
    });

    socket.on('chat:unpin-message', (data) => {
      if (data.conversationId !== conversationId) return;
      handlersRef.current.onPinnedMessagesChange?.(data.pinnedMessages);
    });

    // Rời phòng và ngắt kết nối khi unmount
    return () => {
      socket.emit('chat:leave', { conversationId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, conversationId, currentUserId]);

  return socketRef;
};

export default useSocket;