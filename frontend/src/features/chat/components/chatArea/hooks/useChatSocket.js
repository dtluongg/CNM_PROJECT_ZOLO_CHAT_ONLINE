import { useEffect } from 'react';

/**
 * Quản lý toàn bộ socket listeners liên quan đến chat:
 * - reaction (thả cảm xúc)
 * - read (đã đọc)
 * - delete-for-me (xóa phía mình)
 */
const useChatSocket = ({ socket, conversation, currentUserId, setMessages, onPinnedMessagesChange }) => {
  useEffect(() => {
    if (!socket) return;

    const convId = (conversation?.id || conversation?._id)?.toString();

    // ── Reaction ──────────────────────────────────────────────
    const handleReaction = (data) => {
      const { conversationId: cid, messageId, userId, emoji, action, reactions: serverReactions } = data;
      if (convId && cid !== convId) return;

      setMessages(prev => prev.map(m => {
        if ((m._id || m.id)?.toString() !== messageId) return m;
        const newReactions  = serverReactions || m.reactions || {};
        const newMyReaction = userId === currentUserId
          ? (action === 'removed' ? null : emoji)
          : m.myReaction;
        return { ...m, reactions: newReactions, myReaction: newMyReaction };
      }));
    };

    // ── Read ──────────────────────────────────────────────────
    const handleRead = (data) => {
      const { conversationId: cid, messageId, userId, displayName, avatar, readAt } = data;
      if (convId && cid !== convId) return;

      setMessages(prev => prev.map(m => {
        if ((m._id || m.id)?.toString() !== messageId) return m;
        if (m.readBy?.some(r => r.userId === userId)) return m;
        return { ...m, readBy: [...(m.readBy || []), { userId, displayName, avatar, readAt }] };
      }));
    };

    // ── Delete for me ─────────────────────────────────────────
    const handleDeleteForMeSync = (data) => {
      const { conversationId: cid, messageId } = data;
      if (convId && cid !== convId) return;
      setMessages(prev => prev.filter(m => (m._id || m.id)?.toString() !== messageId));
    };

    // ── Update Poll ───────────────────────────────────────────
    const handleUpdatePoll = (updatedMsg) => {
      const { conversationId: cid, _id: messageId } = updatedMsg;
      if (convId && cid !== convId) return;

      setMessages(prev => prev.map(m => 
        (m._id || m.id)?.toString() === messageId ? { ...m, ...updatedMsg } : m
      ));
    };

    // ── Pin/Unpin ─────────────────────────────────────────────
    const handlePinSync = (data) => {
      const { conversationId: cid, pinnedMessages: newPins } = data;
      if (convId && cid !== convId) return;
      onPinnedMessagesChange?.(newPins);
    };

    socket.on('chat:message-reaction',        handleReaction);
    socket.on('chat:message-read',            handleRead);
    socket.on('chat:message-deleted-for-me',  handleDeleteForMeSync);
    socket.on('chat:pin-message',             handlePinSync);
    socket.on('chat:unpin-message',           handlePinSync);
    socket.on('chat:update-poll',             handleUpdatePoll);

    return () => {
      socket.off('chat:message-reaction',        handleReaction);
      socket.off('chat:message-read',            handleRead);
      socket.off('chat:message-deleted-for-me',  handleDeleteForMeSync);
      socket.off('chat:pin-message',             handlePinSync);
      socket.off('chat:unpin-message',           handlePinSync);
      socket.off('chat:update-poll',             handleUpdatePoll);
    };
  }, [socket, conversation?.id, conversation?._id, currentUserId, setMessages, onPinnedMessagesChange]);
};

export default useChatSocket;