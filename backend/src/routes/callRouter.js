const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middlewares/verifytoken');

const {
    getCallHistory,
    getCallDetail,
} = require('../controllers/callController');

// ════════════════════════════════════════════════════════════════
//  GET /backend/api/calls/history  – Lịch sử cuộc gọi của user
//  GET /backend/api/calls/:callId  – Chi tiết một cuộc gọi
//
//  Tất cả route đều yêu cầu Authorization: Bearer <token>
// ════════════════════════════════════════════════════════════════

// QUAN TRỌNG: /history phải đứng TRƯỚC /:callId để không bị bắt nhầm
router.get('/history',   verifyToken, getCallHistory);
router.get('/:callId',   verifyToken, getCallDetail);

module.exports = router;
