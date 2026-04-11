const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middlewares/verifytoken');
const { sendMessage, getMessages, getAttachments } = require('../controllers/messageController');

// ════════════════════════════════════════════════════════════════
//  GET  /backend/api/messages/:conversationId/attachments – Ảnh & file
//  GET  /backend/api/messages/:conversationId             – Lấy tin nhắn
//  POST /backend/api/messages/:conversationId             – Gửi tin nhắn
//
//  Tất cả đều yêu cầu Authorization: Bearer <token>
// ════════════════════════════════════════════════════════════════
router.get( '/:conversationId/attachments', verifyToken, getAttachments);
router.get( '/:conversationId',             verifyToken, getMessages);
router.post('/:conversationId',             verifyToken, sendMessage);

module.exports = router;
