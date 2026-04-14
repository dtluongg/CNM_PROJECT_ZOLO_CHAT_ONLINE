const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifytoken');
const { sendMessage, getMessages, getAttachments, revokeMessage, editMessage, markAsRead, deleteMessageForMe } = require('../controllers/messageController');
const { summarizeUnread } = require('../controllers/aiController');

// ════════════════════════════════════════════════════════════════
//  GET  /backend/api/messages/:conversationId/attachments – Ảnh & file
//  GET  /backend/api/messages/:conversationId             – Lấy tin nhắn
//  POST /backend/api/messages/:conversationId             – Gửi tin nhắn
//  PATCH /backend/api/messages/:messageId/revoke          – Thu hồi tin nhắn
//  PATCH /backend/api/messages/:messageId                 – Chỉnh sửa tin nhắn
//  PATCH /backend/api/messages/:messageId/delete-for-me   – Xóa phía tôi
//
//  POST /backend/api/messages/:conversationId/aiSummary  – AI tóm tắt tin chưa đọc
//
//  Tất cả đều yêu cầu Authorization: Bearer <token>
// ════════════════════════════════════════════════════════════════
router.get('/:conversationId/attachments', verifyToken, getAttachments);
router.post('/:conversationId/aiSummary',  verifyToken, summarizeUnread);
router.get('/:conversationId', verifyToken, getMessages);
router.post('/:conversationId', verifyToken, sendMessage);
router.post('/:conversationId/read/:messageId', verifyToken, markAsRead);
router.patch('/:messageId/delete-for-me', verifyToken, deleteMessageForMe);
router.patch('/:messageId/revoke', verifyToken, revokeMessage);
router.patch('/:messageId', verifyToken, editMessage);

module.exports = router;
