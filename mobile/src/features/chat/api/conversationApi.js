import apiClient from '../../../services/apiClient';

const conversationApi = {
  listMyConversations: (archive = 'exclude') =>
    apiClient.get(`/conversations?archive=${archive}`),

  createDm: (targetUserId, initialMessage = 'Xin chào!') =>
    apiClient.post('/conversations/dm', { targetUserId, initialMessage }),

  createGroupConversation: (name, avatar, memberIds, groupType = 'general', description = '') =>
    apiClient.post('/conversations/group', { name, avatar, memberIds, groupType, description }),

  leaveConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/leave`),

  deleteConversationForMe: (conversationId) =>
    apiClient.delete(`/conversations/${conversationId}`),

  getConversationMembers: (conversationId, includeLeft = false) =>
    apiClient.get(`/conversations/${conversationId}/members?includeLeft=${includeLeft}`),

  addConversationMembers: (conversationId, memberUserIds) =>
    apiClient.post(`/conversations/${conversationId}/members`, { memberUserIds }),

  updateConversationMember: (conversationId, userId, payload) =>
    apiClient.patch(`/conversations/${conversationId}/members/${userId}/role`, payload),

  listRoles: (conversationId) =>
    apiClient.get(`/conversations/${conversationId}/roles`),

  createRole: (conversationId, payload) =>
    apiClient.post(`/conversations/${conversationId}/roles`, payload),

  updateRole: (conversationId, roleId, payload) =>
    apiClient.patch(`/conversations/${conversationId}/roles/${roleId}`, payload),

  deleteRole: (conversationId, roleId) =>
    apiClient.delete(`/conversations/${conversationId}/roles/${roleId}`),

  assignMemberCustomRole: (conversationId, userId, customRoleId) =>
    apiClient.patch(`/conversations/${conversationId}/members/${userId}/role-assign`, { customRoleId }),

  // Backward-compatible alias
  assignMemberRole: (conversationId, userId, customRoleId) =>
    apiClient.patch(`/conversations/${conversationId}/members/${userId}/role-assign`, { customRoleId }),

  updateMemberTopicOverrides: (conversationId, userId, overrides) =>
    apiClient.patch(`/conversations/${conversationId}/members/${userId}/topic-overrides`, { overrides }),

  getEffectivePermissions: (conversationId, userId) =>
    apiClient.get(`/conversations/${conversationId}/members/${userId}/effective-permissions`),

  kickConversationMember: (conversationId, userId, reason = null) =>
    apiClient.delete(`/conversations/${conversationId}/members/${userId}`, { data: { reason } }),

  transferConversationOwner: (conversationId, newOwnerUserId) =>
    apiClient.patch(`/conversations/${conversationId}/transfer-owner`, { newOwnerUserId }),

  disbandConversation: (conversationId) =>
    apiClient.post(`/conversations/${conversationId}/disband`),

  updateConversation: (conversationId, payload) =>
    apiClient.patch(`/conversations/${conversationId}`, payload),

  // Alias used by some modules
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

  listJoinRequests: (conversationId) =>
    apiClient.get(`/conversations/${conversationId}/join-requests`),

  reviewJoinRequest: (conversationId, requestId, action) =>
    apiClient.patch(`/conversations/${conversationId}/join-requests/${requestId}`, { action }),
};

export default conversationApi;
