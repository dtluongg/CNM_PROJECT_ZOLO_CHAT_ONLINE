const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
    sendFriendRequest,
    acceptFriendRequest,
    getFriendList,
    getIncomingRequests
} = require('../controllers/friendController');

// Mọi hoạt động Bạn bè đều phải đăng nhập
router.use(verifyToken);

// ── Các endpoint của Bạn Bè ──────────────────────────────────────

router.get('/list', getFriendList);
router.post('/requests', sendFriendRequest);
router.get('/requests/incoming', getIncomingRequests);
router.post('/requests/:id/accept', acceptFriendRequest);

module.exports = router;
