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
  getMessages: (conversationId, { before, limit = 30 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    return apiClient.get(`/messages/${conversationId}?${params}`);
  },

  sendText: (conversationId, content, replyToMessageId = null) =>
    apiClient.post(`/messages/${conversationId}`, {
      type: 'text',
      content,
      replyToMessageId,
    }),

  sendVoice: (conversationId, attachmentId) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'voice', attachmentId }),

  sendImage: (conversationId, attachmentId) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'image', attachmentId }),

  sendFile: (conversationId, attachmentId) =>
    apiClient.post(`/messages/${conversationId}`, { type: 'file', attachmentId }),

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
};

export default messageApi;
