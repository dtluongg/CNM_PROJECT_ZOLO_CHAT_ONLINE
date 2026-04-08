import axiosClient from './axiosClient';

const friendApi = {
  getFriendList: () => axiosClient.get('/friends/list'),
  getIncomingRequests: () => axiosClient.get('/friends/requests/incoming'),
  sendRequest: (toUserId) => axiosClient.post('/friends/requests', { toUserId }),
  acceptRequest: (requestId) => axiosClient.post(`/friends/requests/${requestId}/accept`),
};

export default friendApi;
