import apiClient from '../../../services/apiClient';

/**
 * messageApi.js
 * ─────────────────────────────────────────────────────────────────────
 * Tất cả API calls liên quan đến tin nhắn:
 *   - Lấy lịch sử tin nhắn (cursor-based pagination)
 *   - Gửi text / voice / image / file
 *   - Upload voice recording và file đính kèm
 */

const messageApi = {
  // ── Lấy tin nhắn (cursor pagination) ─────────────────────────────
  // before: messageId cũ nhất đang hiển thị (để load thêm tin cũ hơn)
  getMessages: (conversationId, { before, limit = 30 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    return apiClient.get(`/messages/${conversationId}?${params}`);
  },

  // ── Gửi text message ─────────────────────────────────────────────
  sendText: (conversationId, content, replyToMessageId = null) =>
    apiClient.post(`/messages/${conversationId}`, {
      type: 'text',
      content,
      replyToMessageId,
    }),

  // ── Gửi voice message (sau khi upload xong) ──────────────────────
  sendVoice: (conversationId, attachmentId, replyToMessageId = null) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'voice', attachmentId, replyToMessageId }),

  // ── Gửi image message (sau khi upload xong) ──────────────────────
  sendImage: (conversationId, attachmentId, replyToMessageId = null) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'image', attachmentId, replyToMessageId }),

  // ── Gửi file message (sau khi upload xong) ───────────────────────
  sendFile: (conversationId, attachmentId, replyToMessageId = null) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'file', attachmentId, replyToMessageId }),

  // ── Upload voice blob lên S3 ──────────────────────────────────────
  // formData phải chứa field "voice" (blob) và "duration" (số giây, optional)
  uploadVoice: (formData) =>
    apiClient.post('/voice/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── Upload file lên S3 ────────────────────────────────────────────
  // formData phải chứa field "file"
  uploadFile: (formData) =>
    apiClient.post('/uploads/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── Upload image lên S3 ───────────────────────────────────────────
  // formData phải chứa field "file"
  uploadImage: (formData) =>
    apiClient.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  // ── Reaction APIs ────────────────────────────────────────────────
  getReactionTypes: () =>
    apiClient.get('/reactions/types'),

  toggleReaction: (messageId, emoji) =>
    apiClient.post(`/reactions/${messageId}`, { emoji }),

  getMessageReactions: (messageId) =>
    apiClient.get(`/reactions/${messageId}`),

  // ── Chỉnh sửa tin nhắn ──────────────────────────────────────────────
  editMessage: (messageId, content) =>
    apiClient.patch(`/messages/${messageId}`, { content }),

  // ── Thu hồi tin nhắn ───────────────────────────────────────────────
  revokeMessage: (messageId) =>
    apiClient.patch(`/messages/${messageId}/revoke`),

  // ── Lấy danh sách ảnh và file đã gửi trong conversation ──────────
  getAttachments: (conversationId) =>
    apiClient.get(`/messages/${conversationId}/attachments`),

  // ── Đánh dấu đã đọc ────────────────────────────────────────────────
  markAsRead: (conversationId, messageId) =>
    apiClient.post(`/messages/${conversationId}/read/${messageId}`),

  // ── Chuyển tiếp tin nhắn ───────────────────────────────────────────
  forwardMessage: (conversationId, forwardFromMessageId) =>
    apiClient.post(`/messages/${conversationId}`, { forwardFromMessageId }),

  // ── Xóa tin nhắn ở phía tôi ────────────────────────────────────────
  deleteForMe: (messageId) =>
    apiClient.patch(`/messages/${messageId}/delete-for-me`),

  // ── AI tóm tắt tin nhắn chưa đọc ──────────────────────────────────
  // fromMessageId: snapshot lastReadMessageId lúc user mở conversation (trước markAsRead)
  getAiSummary: (conversationId, fromMessageId = null) =>
    apiClient.post(`/messages/${conversationId}/aiSummary`, { fromMessageId }),

  // ── Ghim tin nhắn ──────────────────────────────────────────────────
  pinMessage: (conversationId, messageId) =>
    apiClient.post(`/conversations/${conversationId}/pin/${messageId}`),

  unpinMessage: (conversationId, messageId) =>
    apiClient.post(`/conversations/${conversationId}/unpin/${messageId}`),

  // ── Bình chọn (Poll) ────────────────────────────────────────────────
  createPoll: (conversationId, { topic, options, multipleChoice }) =>
    apiClient.post(`/messages/${conversationId}/poll`, { topic, options, multipleChoice }),

  votePoll: (messageId, { optionId, optionIds, newOptions, votedNewOptions } = {}) =>
    apiClient.patch(`/messages/poll/${messageId}/vote`, { optionId, optionIds, newOptions, votedNewOptions }),
};


export default messageApi;
