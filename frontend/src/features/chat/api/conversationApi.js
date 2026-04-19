import apiClient from '../../../services/apiClient';

const conversationApi = {
  listMyConversations: (archive = 'exclude') =>
    apiClient.get(`/conversations?archive=${archive}`),

  createDmConversation: (targetUserId, initialMessage = '') =>
    apiClient.post('/conversations/dm', { targetUserId, initialMessage }),

  createGroupConversation: ({ name, avatar = '', memberIds = [], groupType = 'general', description = '' }) =>
    apiClient.post('/conversations/group', { name, avatar, memberIds, groupType, description }),

  leaveConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/leave`),

  deleteConversationForMe: (conversationId) =>
    apiClient.delete(`/conversations/${conversationId}`),

  getConversationMembers: (conversationId, includeLeft = false) =>
    apiClient.get(`/conversations/${conversationId}/members?includeLeft=${includeLeft ? 'true' : 'false'}`),

  addConversationMembers: (conversationId, memberUserIds = []) =>
    apiClient.post(`/conversations/${conversationId}/members`, { memberUserIds }),

  updateConversationMember: (conversationId, userId, payload) =>
    apiClient.patch(`/conversations/${conversationId}/members/${userId}/role`, payload),

  kickConversationMember: (conversationId, userId, reason = null) =>
    apiClient.delete(`/conversations/${conversationId}/members/${userId}`, { data: { reason } }),

  transferConversationOwner: (conversationId, newOwnerUserId) =>
    apiClient.patch(`/conversations/${conversationId}/transfer-owner`, { newOwnerUserId }),

  disbandConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/disband`),

  updateGroupInfo: (conversationId, payload) =>
    apiClient.patch(`/conversations/${conversationId}`, payload),

  // Topics
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