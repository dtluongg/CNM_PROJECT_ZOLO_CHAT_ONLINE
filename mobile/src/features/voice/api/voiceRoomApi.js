import apiClient from '../../../services/apiClient';

const voiceRoomApi = {
  create:      (conversationId, topicId = null) =>
    apiClient.post('/voice-rooms/create', { conversationId, topicId }),

  join:        (conversationId, topicId = null) =>
    apiClient.post('/voice-rooms/join', { conversationId, topicId }),

  leave:       (conversationId, topicId = null) =>
    apiClient.post('/voice-rooms/leave', { conversationId, topicId }),

  status:      (conversationId, topicId = null) =>
    apiClient.get('/voice-rooms/status', { params: { conversationId, topicId } }),

  statusBatch: (conversationId) =>
    apiClient.get('/voice-rooms/status-batch', { params: { conversationId } }),
};

export default voiceRoomApi;
