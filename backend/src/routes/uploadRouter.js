const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const verifyToken = require('../middlewares/verifytoken');

const {
    uploadFile,
    uploadImage,
    uploadVideo,
} = require('../controllers/uploadController');

const {
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
    MAX_FILE_SIZE,
} = require('../services/uploadService');

// ── Multer dùng memory storage (buffer truyền thẳng lên S3) ─────
const storage = multer.memoryStorage();

// Tạo multer instance riêng theo giới hạn từng loại
const multerImage = multer({ storage, limits: { fileSize: MAX_IMAGE_SIZE } });
const multerVideo = multer({ storage, limits: { fileSize: MAX_VIDEO_SIZE } });
const multerFile  = multer({ storage, limits: { fileSize: MAX_FILE_SIZE  } });

// ── Wrapper bắt lỗi multer (LIMIT_FILE_SIZE...) rồi mới next ────
const handleMulter = (upload) => (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File vượt quá giới hạn kích thước cho phép' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: 'Field upload không hợp lệ, vui lòng dùng key "file"' });
        }
        next(err);
    });
};

// ════════════════════════════════════════════════════════════════
//  POST /backend/api/uploads/file    – tài liệu/file (≤50MB)
//  POST /backend/api/uploads/image   – ảnh đơn       (≤10MB)
//  POST /backend/api/uploads/video   – video          (≤100MB)
//
//  Header: Authorization: Bearer <token>
//  Body:   multipart/form-data  →  field "file"
//
//  Response 201:
//    { message, file: { fileId, url, fileName, mimeType, fileSize } }
// ════════════════════════════════════════════════════════════════
router.post('/file',  verifyToken, handleMulter(multerFile),  uploadFile);
router.post('/image', verifyToken, handleMulter(multerImage), uploadImage);
router.post('/video', verifyToken, handleMulter(multerVideo), uploadVideo);

module.exports = router;
