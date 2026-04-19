import apiClient from '../../../services/apiClient';

const friendApi = {
    // 1. Gửi lời mời kết bạn (POST /friends/requests)
    sendRequest: (toUserId) => apiClient.post('/friends/requests', { toUserId }),

    // 2. Xem danh sách đến (GET /friends/requests/incoming)
    getIncomingRequests: () => apiClient.get('/friends/requests/incoming'),

    // 3. Xem danh sách đã gửi (GET /friends/requests/outgoing)
    getOutgoingRequests: () => apiClient.get('/friends/requests/outgoing'),

    // 4. Đồng ý kết bạn (POST /friends/requests/:id/accept)
    acceptRequest: (requestId) => apiClient.post(`/friends/requests/${requestId}/accept`),

    // 5. Từ chối kết bạn (POST /friends/requests/:id/reject)
    rejectRequest: (requestId) => apiClient.post(`/friends/requests/${requestId}/reject`),

    // 6. Thu hồi lời mời đã gửi (DELETE /friends/requests/:id)
    cancelRequest: (requestId) => apiClient.delete(`/friends/requests/${requestId}`),

    // 7. Lấy danh bạ bạn bè (GET /friends/list)
    getFriendList: () => apiClient.get('/friends/list'),

    // 8. Hủy kết bạn (DELETE /friends/:userId)
    unfriend: (userId) => apiClient.delete(`/friends/${userId}`),

    // 9. Đổi biệt danh (PATCH /friends/:userId/nickname)
    updateNickname: (userId, nickname) => apiClient.patch(`/friends/${userId}/nickname`, { nickname }),

    // 10. Chặn (POST /friends/:userId/block)
    blockFriend: (userId) => apiClient.post(`/friends/${userId}/block`),

    // 11. Lấy danh sách người bị chặn (GET /friends/blocked)
    getBlockedList: () => apiClient.get('/friends/blocked'),

    // 12. Lấy trạng thái bạn bè / chặn (GET /friends/:userId/status)
    getFriendStatus: (userId) => apiClient.get(`/friends/${userId}/status`),

    // Tiện ích Tìm kiếm (Ánh xạ qua users)
    searchUsers: (q) => apiClient.get(`/users/search?q=${q}`),
};

export default friendApi;
