import apiClient from '../../../services/apiClient';

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

  uploadVoice: (formData) =>
    apiClient.post('/voice/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadFile: (formData) =>
    apiClient.post('/uploads/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadImage: (formData) =>
    apiClient.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default messageApi;
