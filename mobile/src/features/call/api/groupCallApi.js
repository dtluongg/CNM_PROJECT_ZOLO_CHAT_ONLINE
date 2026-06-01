import apiClient from '../../../services/apiClient';

const groupCallApi = {
  active:  (conversationId) => apiClient.get('/group-calls/active', { params: { conversationId } }),
  token:   (groupCallId)    => apiClient.post('/group-calls/token', { groupCallId }),
  history: (conversationId, page = 1, limit = 20) =>
    apiClient.get('/group-calls/history', { params: { conversationId, page, limit } }),
};

export default groupCallApi;