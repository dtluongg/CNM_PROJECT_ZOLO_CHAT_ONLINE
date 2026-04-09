import apiClient from '../../../services/apiClient';

const userApi = {
  getUserProfile: (userId) => apiClient.get(`/users/${userId}/profile`),
  searchUsers: (query) => apiClient.get(`/users/search?q=${encodeURIComponent(query)}`),
  updateProfile: (data) => apiClient.patch('/users/update-profile', data),
};

export default userApi;
