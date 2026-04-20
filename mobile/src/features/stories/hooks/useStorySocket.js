import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../../config/env';

/**
 * Hook lắng nghe các sự kiện socket liên quan đến Story.
 * Dùng để cập nhật bản tin (feed) theo thời gian thực.
 * 
 * @param {string} token - Token xác thực cho socket
 * @param {object} handlers - Các hàm xử lý sự kiện:
 *   - onStoryNew({ storyId, userId, displayName })
 *   - onStoryDeleted({ storyId, authorId })
 */
const useStorySocket = (token, handlers) => {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Giữ record handlers mới nhất mà không làm effect re-run
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!token) return;

    // Khởi tạo kết nối socket cho cụm Story
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    // ── Lắng nghe tin mới ───────────────────────────────────────────
    socket.on('story:new', (data) => {
      handlersRef.current.onStoryNew?.(data);
    });

    // ── Lắng nghe xóa tin ───────────────────────────────────────────
    socket.on('story:deleted', (data) => {
      handlersRef.current.onStoryDeleted?.(data);
    });

    // Cleanup khi component dùng hook này bị unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef;
};

export default useStorySocket;
