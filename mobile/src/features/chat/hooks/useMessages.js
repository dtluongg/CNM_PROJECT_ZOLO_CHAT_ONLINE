import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import messageApi from '../api/messageApi';

// Định dạng thời gian ISO → "HH:mm"
const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// Chuẩn hoá dữ liệu tin nhắn từ server
const normalizeMsg = (msg) => {
  if (!msg) return {};
  return {
    ...msg,
    senderId: (msg.senderId?._id || msg.senderId)?.toString(),
    time: fmtTime(msg.createdAt)
  };
};

/**
 * Hook quản lý toàn bộ danh sách tin nhắn của một cuộc hội thoại.
 * Bao gồm: load từ API, xử lý sự kiện socket, gửi/chỉnh sửa/xoá/react tin nhắn.
 *
 * @param {string} conversationId - ID cuộc hội thoại
 * @param {string} currentUserId  - ID người dùng hiện tại
 * @returns {object} state và các hàm thao tác tin nhắn
 */
const useMessages = (conversationId, currentUserId, topicId = null) => {
  const [messages, setMessages] = useState([]);

  // Tải tin nhắn từ API, lọc trùng lặp theo _id
  const loadMessages = useCallback(async () => {
    try {
      const res = await messageApi.getMessages(conversationId, { topicId });
      const raw = (res.data.messages || []).map(normalizeMsg);
      const seen = new Set();
      const msgs = raw.filter((m) => {
        const k = m._id?.toString();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setMessages(msgs);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, [conversationId, topicId]);

  // Load lần đầu khi mount
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = false;
    loadMessages().then(() => { mountedRef.current = true; });
  }, [loadMessages]);

  // Reload khi focus lại — chỉ sau lần mount đầu (tránh double-load)
  // Cần thiết để cập nhật tin nhắn hệ thống (vd: lịch sử cuộc gọi) khi quay lại từ call screen
  useFocusEffect(
    useCallback(() => {
      if (mountedRef.current) loadMessages();
    }, [loadMessages])
  );

  // ── Xử lý các sự kiện socket ────────────────────────────────────────

  // Thêm tin nhắn mới vào danh sách (bỏ qua nếu đã tồn tại)
  const addMessage = useCallback((message) => {
    const msg = normalizeMsg(message);
    setMessages((prev) => {
      if (prev.some((m) => m._id?.toString() === msg._id?.toString())) return prev;
      return [...prev, msg];
    });
  }, []);

  // Đánh dấu tin nhắn đã thu hồi
  const revokeMessage = useCallback((messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        (m._id || m.id)?.toString() === messageId?.toString() ? { ...m, revoked: true } : m
      )
    );
  }, []);

  // Cập nhật nội dung tin nhắn đã chỉnh sửa (giữ lại reactions cũ)
  const editMessage = useCallback((message) => {
    setMessages((prev) =>
      prev.map((m) => {
        if ((m._id || m.id)?.toString() !== (message._id || message.id)?.toString()) return m;
        return {
          ...m,
          ...normalizeMsg(message),
          reactions: m.reactions,   // giữ lại reactions hiện tại
          myReaction: m.myReaction,
        };
      })
    );
  }, []);

  // Cập nhật reaction theo dữ liệu từ server
  const updateReaction = useCallback(({ messageId, userId, emoji, action, reactions: serverReactions, currentUserId: cuid }) => {
    setMessages((prev) =>
      prev.map((m) => {
        if ((m._id || m.id)?.toString() !== messageId?.toString()) return m;
        const newReactions = serverReactions || m.reactions || {};
        let newMyReaction = m.myReaction;
        if (userId === cuid) {
          newMyReaction = action === 'removed' ? null : emoji;
        }
        return { ...m, reactions: newReactions, myReaction: newMyReaction };
      })
    );
  }, []);

  // Cập nhật danh sách người đã đọc
  const markRead = useCallback(({ messageId, userId, displayName, avatar, readAt }) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id?.toString() !== messageId?.toString()) return m;
        // Tránh thêm trùng
        const alreadyRead = (m.readBy || []).some(
          (r) => r.userId?.toString() === userId?.toString()
        );
        if (alreadyRead) return m;
        return {
          ...m,
          readBy: [...(m.readBy || []), { userId, displayName, avatar, readAt }],
        };
      })
    );
  }, []);

  // Xoá tin nhắn khỏi danh sách (phía tôi)
  const deleteMessage = useCallback((messageId) => {
    setMessages((prev) =>
      prev.filter((m) => (m._id || m.id)?.toString() !== messageId?.toString())
    );
  }, []);

  // Thay thế tin nhắn tạm (tempId) bằng tin nhắn thật từ server
  const replaceTemp = useCallback((tempId, realMsg) => {
    const normalized = normalizeMsg(realMsg);
    const realId = normalized._id?.toString();
    setMessages((prev) => {
      const cleaned = prev.filter((m) => m._id?.toString() !== realId);
      return cleaned.map((m) => (m._id === tempId ? normalized : m));
    });
  }, []);

  // Thêm tin nhắn tạm (optimistic update khi gửi)
  const addTempMessage = useCallback((tempMsg) => {
    setMessages((prev) => [...prev, tempMsg]);
  }, []);

  // Xoá tin nhắn tạm (khi gửi thất bại)
  const removeTempMessage = useCallback((tempId) => {
    setMessages((prev) => prev.filter((m) => m._id !== tempId));
  }, []);

  // Đánh dấu tin nhắn bị chặn
  const markBlocked = useCallback((tempId) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === tempId ? { ...m, blocked: true } : m))
    );
  }, []);

  // Cập nhật optimistic khi chỉnh sửa tin nhắn
  const applyEdit = useCallback((messageId, newContent) => {
    setMessages((prev) =>
      prev.map((m) =>
        m._id?.toString() === messageId ? { ...m, content: newContent, edited: true } : m
      )
    );
  }, []);

  return {
    messages,
    normalizeMsg,
    loadMessages,
    addMessage,
    revokeMessage,
    editMessage,
    updateReaction,
    markRead,
    deleteMessage,
    replaceTemp,
    addTempMessage,
    removeTempMessage,
    markBlocked,
    applyEdit,
  };
};

export default useMessages;