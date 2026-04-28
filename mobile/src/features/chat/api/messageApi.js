import { Platform } from 'react-native';
import apiClient from '../../../services/apiClient';

// On React Native (iOS/Android), Axios doesn't recognise RN's custom FormData
// (kindOf() check fails) → default transformRequest tries to JSON.stringify it
// → AxiosError: Network Error.  Fix: pass FormData untouched + set Content-Type
// so RN's XHR appends the correct boundary automatically.
//
// On Expo Web, FormData IS the native browser FormData that Axios handles
// correctly on its own — no special config needed (manually setting
// Content-Type without boundary breaks browser multipart encoding).
const rnUploadConfig = Platform.OS !== 'web'
  ? {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: [(data) => data],
  }
  : {};

const messageApi = {
  getMessages: (conversationId, { before, limit = 30, topicId } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    if (topicId) params.set('topicId', topicId);
    return apiClient.get(`/messages/${conversationId}?${params}`);
  },

  sendText: (conversationId, content, replyToMessageId = null, topicId = null) =>
    apiClient.post(`/messages/${conversationId}`, {
      type: 'text',
      content,
      replyToMessageId,
      topicId,
    }),

  // GỬI TIN NHẮN MEDIA (CÓ TRẢ LỜI)
  sendVoice: (conversationId, attachmentId, replyToMessageId = null, topicId = null) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'voice', attachmentId, replyToMessageId, topicId }),

  sendImage: (conversationId, attachmentId, replyToMessageId = null, topicId = null) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'image', attachmentId, replyToMessageId, topicId }),

  sendFile: (conversationId, attachmentId, replyToMessageId = null, topicId = null) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'file', attachmentId, replyToMessageId, topicId }),

  uploadVoice: (formData) => apiClient.post('/voice/upload', formData, rnUploadConfig),
  uploadFile: (formData) => apiClient.post('/uploads/file', formData, rnUploadConfig),
  uploadImage: (formData) => apiClient.post('/uploads/image', formData, rnUploadConfig),

  // REACTION API
  getReactionTypes: () => apiClient.get('/reactions/types'),

  toggleReaction: (messageId, emoji) =>
    apiClient.post(`/reactions/${messageId}`, { emoji }),

  getMessageReactions: (messageId) =>
    apiClient.get(`/reactions/${messageId}`),

  revokeMessage: (messageId) =>
    apiClient.patch(`/messages/${messageId}/revoke`),

  editMessage: (messageId, content) =>
    apiClient.patch(`/messages/${messageId}`, { content }),

  markAsRead: (conversationId, messageId) =>
    apiClient.post(`/messages/${conversationId}/read/${messageId}`),

  forwardMessage: (conversationId, forwardFromMessageId) =>
    apiClient.post(`/messages/${conversationId}`, { forwardFromMessageId }),

  deleteForMe: (messageId) =>
    apiClient.patch(`/messages/${messageId}/delete-for-me`),

  // Lấy ảnh & file đã chia sẻ trong conversation
  getAttachments: (conversationId) =>
    apiClient.get(`/messages/${conversationId}/attachments`),

  // ── AI tóm tắt tin nhắn chưa đọc ──────────────────────────────────
  // fromMessageId: snapshot lastReadMessageId lúc mở màn chat (trước markAsRead)
  getAiSummary: (conversationId, fromMessageId = null) =>
    apiClient.post(`/messages/${conversationId}/aiSummary`, { fromMessageId }),

  // ── Ghim tin nhắn ──────────────────────────────────────────────────
  pinMessage: (conversationId, messageId) =>
    apiClient.post(`/conversations/${conversationId}/pin/${messageId}`),

  unpinMessage: (conversationId, messageId) =>
    apiClient.post(`/conversations/${conversationId}/unpin/${messageId}`),

  // ── AI Translate ───────────────────────────────────────────────────
  translateMessage: (text, targetLanguage = 'Auto') =>
    apiClient.post('/messages/ai/translate', { text, targetLanguage }),

  // ── REMINDER ───────────────────────────────────────────────────
  createReminder: (conversationId, { content, reminderTime, topicId }) =>
    apiClient.post(`/messages/${conversationId}`, {
      type: 'reminder',
      content,
      payload: { reminderTime },
      topicId,
    }),
  
  // ── POLL ──────────────────────────────────────────────────────────
  createPoll: (conversationId, { topic, options, multipleChoice, topicId }) =>
    apiClient.post(`/messages/${conversationId}/poll`, { topic, options, multipleChoice, topicId }),

  votePoll: (messageId, { optionId, optionIds, newOptions, votedNewOptions }) =>
    apiClient.patch(`/messages/poll/${messageId}/vote`, { optionId, optionIds, newOptions, votedNewOptions }),
};

export default messageApi;
