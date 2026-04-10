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
  sendVoice: (conversationId, attachmentId) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'voice', attachmentId }),

  // ── Gửi image message (sau khi upload xong) ──────────────────────
  sendImage: (conversationId, attachmentId) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'image', attachmentId }),

  // ── Gửi file message (sau khi upload xong) ───────────────────────
  sendFile: (conversationId, attachmentId) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'file', attachmentId }),

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
};

export default messageApi;
