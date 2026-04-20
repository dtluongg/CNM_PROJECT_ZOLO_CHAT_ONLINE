const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
    createStory,
    getStoriesFeed,
    replyToStory,
    markStoryAsViewed,
    getStoryViewers,
    deleteStory
} = require('../controllers/storyController');

// ════════════════════════════════════════════════════════════════
//  STORY API
// ════════════════════════════════════════════════════════════════

// Đăng tin mới
router.post('/', verifyToken, createStory);

// Lấy bản tin (Feed)
router.get('/feed', verifyToken, getStoriesFeed);

// Phản hồi story (Gửi tin nhắn DM hoặc thả tim)
router.post('/reply', verifyToken, replyToStory);

// Đánh dấu đã xem tin
router.post('/:id/view', verifyToken, markStoryAsViewed);

// Lấy danh sách người xem (Chỉ chủ tin)
router.get('/:id/viewers', verifyToken, getStoryViewers);

// Xóa tin (Chỉ chủ tin)
router.delete('/:id', verifyToken, deleteStory);

module.exports = router;
