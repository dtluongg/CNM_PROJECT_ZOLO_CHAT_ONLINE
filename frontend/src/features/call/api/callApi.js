import apiClient from '../../../services/apiClient';

const callApi = {
  getHistory: (params = {}) => apiClient.get('/calls/history', { params }),
  getDetail: (callId) => apiClient.get(`/calls/${callId}`),
};

export default callApi;
