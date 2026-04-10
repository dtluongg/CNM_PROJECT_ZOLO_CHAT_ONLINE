import apiClient from '../../../services/apiClient';

const conversationApi = {
  listMyConversations: (archive = 'exclude') =>
    apiClient.get(`/conversations?archive=${archive}`),

  createDmConversation: (targetUserId) =>
    apiClient.post('/conversations/dm', { targetUserId }),

  createGroupConversation: ({ name, avatar = '', memberIds = [] }) =>
    apiClient.post('/conversations/group', { name, avatar, memberIds }),

  leaveConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/leave`),

  getConversationMembers: (conversationId, includeLeft = false) =>
    apiClient.get(`/conversations/${conversationId}/members?includeLeft=${includeLeft ? 'true' : 'false'}`),

  addConversationMembers: (conversationId, memberUserIds = []) =>
    apiClient.post(`/conversations/${conversationId}/members`, { memberUserIds }),

  updateConversationMember: (conversationId, userId, payload) =>
    apiClient.patch(`/conversations/${conversationId}/members/${userId}/role`, payload),

  kickConversationMember: (conversationId, userId) =>
    apiClient.delete(`/conversations/${conversationId}/members/${userId}`),

  transferConversationOwner: (conversationId, newOwnerUserId) =>
    apiClient.patch(`/conversations/${conversationId}/transfer-owner`, { newOwnerUserId }),

  disbandConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/disband`),
};

export default conversationApi;
