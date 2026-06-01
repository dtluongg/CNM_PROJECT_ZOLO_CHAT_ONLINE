const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middlewares/verifytoken');

const {
    getCallHistory,
    getCallDetail,
} = require('../controllers/callController');

// ════════════════════════════════════════════════════════════════
//  GET /backend/api/calls/turn-credentials  – Lấy TURN credentials
//  GET /backend/api/calls/history           – Lịch sử cuộc gọi
//  GET /backend/api/calls/:callId           – Chi tiết một cuộc gọi
//
//  QUAN TRỌNG: /turn-credentials và /history phải đứng TRƯỚC /:callId
//  Tất cả route đều yêu cầu Authorization: Bearer <token>
// ════════════════════════════════════════════════════════════════

router.get('/turn-credentials', verifyToken, async (req, res) => {
    try {
        const response = await fetch(
            `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
        );
        if (!response.ok) throw new Error(`Metered API lỗi: ${response.status}`);
        const iceServers = await response.json();
        res.json(iceServers);
    } catch (err) {
        console.error('turn-credentials error:', err.message);
        // Fallback STUN để client không bị lỗi hoàn toàn
        res.status(200).json([
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ]);
    }
});

router.get('/history', verifyToken, getCallHistory);
router.get('/:callId', verifyToken, getCallDetail);

module.exports = router;