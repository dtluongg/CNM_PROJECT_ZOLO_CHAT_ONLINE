import apiClient from '../../../services/apiClient';

const conversationApi = {
  listMyConversations: (archive = 'exclude') =>
    apiClient.get(`/conversations?archive=${archive}`),

  createDm: (targetUserId, initialMessage = 'Xin chào!') =>
    apiClient.post('/conversations/dm', { targetUserId, initialMessage }),

  createGroupConversation: ({ name, avatar = '', memberIds = [], groupType = 'general', description = '' }) =>
    apiClient.post('/conversations/group', { name, avatar, memberIds, groupType, description }),

  leaveConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/leave`),

  getConversationMembers: (conversationId) =>
    apiClient.get(`/conversations/${conversationId}/members`),

  updateGroupInfo: (conversationId, payload) =>
    apiClient.patch(`/conversations/${conversationId}`, payload),

  listTopics: (conversationId) =>
    apiClient.get(`/conversations/${conversationId}/topics`),

  createTopic: (conversationId, payload) =>
    apiClient.post(`/conversations/${conversationId}/topics`, payload),

  updateTopic: (conversationId, topicId, payload) =>
    apiClient.patch(`/conversations/${conversationId}/topics/${topicId}`, payload),

  deleteTopic: (conversationId, topicId) =>
    apiClient.delete(`/conversations/${conversationId}/topics/${topicId}`),
};

export default conversationApi;
