const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifytoken');
const {
    sendFriendRequest,
    acceptFriendRequest,
    getFriendList,
    getIncomingRequests,
    getOutgoingRequests,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    updateNickname,
    blockFriend,
    getBlockedList
} = require('../controllers/friendController');

// Mọi hoạt động Bạn bè đều phải đăng nhập
router.use(verifyToken);

// ── Các endpoint của Bạn Bè ──────────────────────────────────────

router.get('/list', getFriendList);
router.get('/blocked', getBlockedList);
router.post('/requests', sendFriendRequest);
router.get('/requests/incoming', getIncomingRequests);
router.get('/requests/outgoing', getOutgoingRequests);
router.post('/requests/:id/accept', acceptFriendRequest);
router.post('/requests/:id/reject', rejectFriendRequest);
router.delete('/requests/:id', cancelFriendRequest);
router.delete('/:userId', unfriend);
router.patch('/:userId/nickname', updateNickname);
router.post('/:userId/block', blockFriend);

module.exports = router;
