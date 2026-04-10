/**
 * voiceRouter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Route upload ghi âm trực tiếp.
 * Tách riêng khỏi uploadRouter để không xung đột.
 *
 * Base: /backend/api/voice
 *
 * POST /upload
 *   multipart/form-data
 *     field "voice"    → file âm thanh (webm / ogg / mp4 / wav / mp3 ...)
 *     field "duration" → (optional) thời lượng giây, ví dụ "12.5"
 *   Header: Authorization: Bearer <token>
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express     = require('express');
const router      = express.Router();
const multer      = require('multer');
const verifyToken = require('../middlewares/verifytoken');
const { uploadVoice } = require('../controllers/voiceController');

// ── Multer: memory storage, giới hạn 25MB ────────────────────────────────────
const MAX_VOICE_SIZE = 25 * 1024 * 1024; // 25MB

const multerVoice = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: MAX_VOICE_SIZE },
});

/**
 * Wrapper bắt lỗi multer (LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, v.v.)
 * trước khi chuyển qua controller.
 *
 * Field name: "voice" — khác với uploadRouter dùng "file",
 * tránh nhầm lẫn khi client tích hợp cả hai.
 */
const handleVoiceMulter = (req, res, next) => {
    multerVoice.single('voice')(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File ghi âm vượt quá giới hạn 25MB',
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                message: 'Field không hợp lệ. Dùng key "voice" để gửi file ghi âm',
            });
        }

        // Lỗi multer khác → ném về global error handler
        next(err);
    });
};

// ════════════════════════════════════════════════════════════════
//  POST /backend/api/voice/upload
// ════════════════════════════════════════════════════════════════
router.post('/upload', verifyToken, handleVoiceMulter, uploadVoice);

module.exports = router;
