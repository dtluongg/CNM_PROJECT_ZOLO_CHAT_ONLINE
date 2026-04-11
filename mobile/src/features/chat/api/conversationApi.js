import apiClient from '../../../services/apiClient';

const conversationApi = {
  listMyConversations: (archive = 'exclude') =>
    apiClient.get(`/conversations?archive=${archive}`),

  // Get existing DM conversation or create a new one with targetUserId.
  // Backend returns 200 if already exists, 201 if newly created.
  createDm: (targetUserId) =>
    apiClient.post('/conversations/dm', { targetUserId }),
};

export default conversationApi;
