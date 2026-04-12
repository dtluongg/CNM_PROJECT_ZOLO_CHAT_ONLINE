import apiClient from '../../../services/apiClient';

const conversationApi = {
  listMyConversations: (archive = 'exclude') =>
    apiClient.get(`/conversations?archive=${archive}`),

  // Backend yêu cầu bắt buộc có initialMessage mới tạo được DM
  createDm: (targetUserId, initialMessage = 'Xin chào!') =>
    apiClient.post('/conversations/dm', { targetUserId, initialMessage }),
};

export default conversationApi;