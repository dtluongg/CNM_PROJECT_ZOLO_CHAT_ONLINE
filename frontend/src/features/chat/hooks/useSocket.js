import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { normalizeMsg } from '../utils/normalizeMsg';
import { getAccessToken } from '../../../utils/authStorage';

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';
// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:2026');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL


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
 * @param {function} options.onConversationDisbanded - (conversationId) => void
 */
export const useSocket = ({
  token,
  currentUserId,
  activeConvRef,
  onNewMessage,
  onTyping,
  onStopTyping,
  onMessageRevoked,
  onMessageEdited,
  onUnreadReset,
  onConversationDisbanded,
}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const accessToken = token || getAccessToken();
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['polling'],
    });

    socketRef.current = socket;

    socket.on('chat:new-message', ({ conversationId, message }) => {
      const msg = normalizeMsg(message);
      onNewMessage?.(conversationId, msg, activeConvRef);
    });

    socket.on('chat:typing', ({ conversationId, userId, displayName }) => {
      if (userId === currentUserId) return;
      onTyping?.(conversationId, userId, displayName);
    });

    socket.on('chat:stop-typing', ({ conversationId }) => {
      onStopTyping?.(conversationId);
    });

    socket.on('chat:message-revoked', ({ conversationId, messageId }) => {
      onMessageRevoked?.(conversationId, messageId);
    });

    socket.on('chat:message-edited', ({ conversationId, message }) => {
      const msg = normalizeMsg(message);
      onMessageEdited?.(conversationId, msg);
    });

    socket.on('chat:unread-reset', ({ conversationId }) => {
      onUnreadReset?.(conversationId);
    });

    socket.on('chat:conversation-disbanded', ({ conversationId }) => {
      onConversationDisbanded?.(conversationId);
    });

    socket.on('conversation:updated', ({ conversationId, changes }) => {
      onConversationUpdated?.(conversationId, changes);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return socketRef;
};