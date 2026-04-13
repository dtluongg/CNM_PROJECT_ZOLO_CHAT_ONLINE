import { useEffect, useRef } from 'react';

/**
 * Tự động cuộn xuống cuối danh sách tin nhắn khi:
 * - Có tin nhắn mới (ID thay đổi + số lượng tăng)
 * - Chính người dùng vừa gửi tin nhắn
 */
const useScrollBehavior = ({ messages, currentUserId }) => {
  const bottomRef         = useRef(null);
  const prevMsgCountRef   = useRef(messages.length);
  const prevLastMsgIdRef  = useRef(null);

  useEffect(() => {
    const lastMsg  = messages[messages.length - 1];
    const lastId   = lastMsg?._id || lastMsg?.id;
    const isNew    = lastId !== prevLastMsgIdRef.current;
    const grew     = messages.length > prevMsgCountRef.current;
    const isMine   = lastMsg?.senderId === currentUserId;

    if ((isNew && grew) || (isNew && isMine)) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMsgCountRef.current  = messages.length;
    prevLastMsgIdRef.current = lastId;
  }, [messages, currentUserId]);

  return { bottomRef };
};

export default useScrollBehavior;