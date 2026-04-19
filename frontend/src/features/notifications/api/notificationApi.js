import apiClient from '../../../services/apiClient';

const notificationApi = {
  list: ({ cursor, limit = 20, unreadOnly = false, type } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    if (unreadOnly) params.set('unreadOnly', 'true');
    if (type) params.set('type', type);
    const query = params.toString();
    return apiClient.get(`/notifications${query ? `?${query}` : ''}`);
  },

  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (notificationId) => apiClient.patch(`/notifications/${notificationId}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),

  getSetting: (conversationId) =>
    apiClient.get(`/notifications/settings/${conversationId}`),

  updateSetting: (conversationId, payload) =>
    apiClient.patch(`/notifications/settings/${conversationId}`, payload),
};

export default notificationApi;
