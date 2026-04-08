import axiosClient from '../../../api/axiosClient';

const friendApi = {
    // 1. Lấy danh sách bạn bè đã kết bạn
    getFriendList: () => axiosClient.get('/friends/list'),
    
    // 2. Lấy danh sách lời mời chờ duyệt (người khác gửi mình)
    getIncomingRequests: () => axiosClient.get('/friends/requests/incoming'),
    
    // 3. Gửi lời mời kết bạn bằng ID (Sau này ráp với trang Search User để lấy ID)
    sendRequest: (toUserId) => axiosClient.post('/friends/requests', { toUserId }),
    
    // 4. Bấm đồng ý kết bạn
    acceptRequest: (requestId) => axiosClient.post(`/friends/requests/${requestId}/accept`),
};

export default friendApi;
