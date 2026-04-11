const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifytoken');
const {
    getAllReactionTypes,
    toggleReaction,
    getMessageReactions
} = require('../controllers/reactionController');

// Lấy danh sách emoji có sẵn (Công khai)
router.get('/types', getAllReactionTypes);


// Thả/Hủy reaction trên 1 tin nhắn
router.post('/:messageId', verifyToken, toggleReaction);

// Xem danh sách người đã reaction trên 1 tin nhắn
router.get('/:messageId', verifyToken, getMessageReactions);

module.exports = router;
