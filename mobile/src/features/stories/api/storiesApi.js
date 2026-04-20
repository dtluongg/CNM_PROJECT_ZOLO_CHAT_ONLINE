import apiClient from '../../../services/apiClient';

const storiesApi = {
    // Lấy bản tin (feed)
    getFeed: () => apiClient.get('/stories/feed'),

    // Đăng tin mới
    createStory: (mediaUrl, mediaType = 'image') => 
        apiClient.post('/stories', { mediaUrl, mediaType }),

    // Phản hồi story (Gửi tin nhắn DM hoặc thả tim ❤️)
    replyToStory: (storyId, content, isHeart = false) => 
        apiClient.post('/stories/reply', { storyId, content, isHeart }),

    // Đánh dấu đã xem story
    markViewed: (storyId) => 
        apiClient.post(`/stories/${storyId}/view`),

    // Lấy danh sách người xem (Chỉ chủ tin)
    getStoryViewers: (storyId) => 
        apiClient.get(`/stories/${storyId}/viewers`),

    // Xóa tin (Chỉ chủ tin)
    deleteStory: (storyId) => 
        apiClient.delete(`/stories/${storyId}`)
};

export default storiesApi;
