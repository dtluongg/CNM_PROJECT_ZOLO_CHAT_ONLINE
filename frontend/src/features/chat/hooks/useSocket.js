import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { normalizeMsg } from '../utils/normalizeMsg';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';

/**
 * @param {object} options
 * @param {string|null}  options.token
 * @param {string|null}  options.currentUserId
 * @param {React.MutableRefObject} options.activeConvRef  - ref to active conversation id
 * @param {function} options.onNewMessage       - (conversationId, msg) => void
 * @param {function} options.onTyping           - (conversationId, userId, displayName) => void
 * @param {function} options.onStopTyping       - (conversationId) => void
 * @param {function} options.onMessageRevoked   - (conversationId, messageId) => void
 * @param {function} options.onMessageEdited    - (conversationId, msg) => void
 * @param {function} options.onUnreadReset      - (conversationId) => void
 */
export const useSocket = (options) => {
  const {
    token,
    currentUserId,
    activeConvRef,
    ...handlers
  } = options;

  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Sync handlers to ref so listeners always use the latest ones
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const accessToken = token || localStorage.getItem('accessToken');
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('chat:new-message', ({ conversationId, message }) => {
      const msg = normalizeMsg(message);
      handlersRef.current.onNewMessage?.(conversationId, msg, activeConvRef);
    });

    socket.on('chat:typing', ({ conversationId, userId, displayName }) => {
      if (userId === currentUserId) return;
      handlersRef.current.onTyping?.(conversationId, userId, displayName);
    });

    socket.on('chat:stop-typing', ({ conversationId }) => {
      handlersRef.current.onStopTyping?.(conversationId);
    });

    socket.on('chat:message-revoked', ({ conversationId, messageId }) => {
      handlersRef.current.onMessageRevoked?.(conversationId, messageId);
    });

    socket.on('chat:message-edited', ({ conversationId, message }) => {
      const msg = normalizeMsg(message);
      handlersRef.current.onMessageEdited?.(conversationId, msg);
    });

    socket.on('chat:unread-reset', ({ conversationId }) => {
      handlersRef.current.onUnreadReset?.(conversationId);
    });
    
    socket.on('chat:reminder-alert', (data) => {
      handlersRef.current.onReminderAlert?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return socketRef;
};