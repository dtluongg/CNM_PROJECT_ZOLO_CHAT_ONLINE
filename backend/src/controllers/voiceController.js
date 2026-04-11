/**
 * voiceController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Xử lý upload ghi âm trực tiếp (voice message) lên AWS S3 + CloudFront.
 *
 * Tái sử dụng uploadToS3 / generateS3Key từ uploadService mà KHÔNG sửa file đó.
 * Lưu metadata vào Attachment model (messageId = null, gán sau khi gửi message).
 *
 * MIME types hỗ trợ (tất cả browser phổ biến):
 *   Chrome/Edge  →  audio/webm;codecs=opus  →  .webm
 *   Firefox      →  audio/ogg;codecs=opus   →  .ogg
 *   Safari       →  audio/mp4               →  .m4a
 *   Fallback     →  audio/wav, audio/mpeg   →  .wav / .mp3
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Attachment = require('../models/attachmentModel');
const { uploadToS3, generateS3Key } = require('../services/uploadService');

// ── Giới hạn ─────────────────────────────────────────────────────────────────
const MAX_VOICE_SIZE = 25 * 1024 * 1024; // 25 MB

// ── Map MIME → extension (xử lý cả codec params như audio/webm;codecs=opus) ──
const AUDIO_EXT_MAP = {
    'audio/webm':        '.webm',
    'audio/ogg':         '.ogg',
    'audio/mp4':         '.m4a',
    'audio/mpeg':        '.mp3',
    'audio/mp3':         '.mp3',
    'audio/wav':         '.wav',
    'audio/x-wav':       '.wav',
    'audio/aac':         '.aac',
    'audio/flac':        '.flac',
    'audio/3gpp':        '.3gp',
    'audio/3gpp2':       '.3g2',
};

/**
 * Lấy extension từ MIME type (bỏ phần codec params nếu có).
 * Ví dụ: "audio/webm;codecs=opus" → ".webm"
 */
const getAudioExtension = (mimetype) => {
    const base = mimetype.split(';')[0].trim().toLowerCase();
    return AUDIO_EXT_MAP[base] || '.webm'; // fallback an toàn
};

/**
 * Kiểm tra MIME type có phải audio không.
 * Chấp nhận mọi audio/* để tương thích tối đa với các browser/device khác nhau.
 */
const isAudioMime = (mimetype) =>
    typeof mimetype === 'string' && mimetype.trim().toLowerCase().startsWith('audio/');

// ════════════════════════════════════════════════════════════════════════════
//  POST /backend/api/voice/upload
//
//  Request:  multipart/form-data
//    - Field "voice"    : file ghi âm (binary)
//    - Field "duration" : (optional) thời lượng tính bằng giây (số thực)
//
//  Header:   Authorization: Bearer <token>
//
//  Response 201:
//    {
//      message: string,
//      voice: {
//        fileId:   string,   ← Attachment._id, dùng để gắn vào message sau
//        url:      string,   ← CloudFront URL phát trực tiếp
//        fileName: string,
//        mimeType: string,
//        fileSize: number,   ← bytes
//        duration: number|null  ← giây, null nếu client không gửi
//      }
//    }
// ════════════════════════════════════════════════════════════════════════════
const uploadVoice = async (req, res) => {
    try {
        // ── 1. Kiểm tra có file không ────────────────────────────────────
        if (!req.file) {
            return res.status(400).json({
                message: 'Không có file ghi âm. Gửi multipart/form-data với field "voice"',
            });
        }

        const { file } = req;

        // ── 2. Validate MIME type ─────────────────────────────────────────
        if (!isAudioMime(file.mimetype)) {
            return res.status(400).json({
                message: `Định dạng không hợp lệ: "${file.mimetype}". Chỉ chấp nhận file âm thanh (audio/*)`,
            });
        }

        // ── 3. Validate kích thước ────────────────────────────────────────
        if (file.size > MAX_VOICE_SIZE) {
            return res.status(400).json({
                message: 'File ghi âm quá lớn, tối đa 25MB',
            });
        }

        // ── 4. Parse duration từ form field ──────────────────────────────
        //      Client MediaRecorder biết duration → nên gửi kèm
        let duration = null;
        if (req.body?.duration !== undefined && req.body.duration !== '') {
            const parsed = parseFloat(req.body.duration);
            if (!isNaN(parsed) && parsed >= 0) {
                // Làm tròn lên 1 chữ số thập phân để giữ độ chính xác hợp lý
                duration = Math.round(parsed * 10) / 10;
            }
        }

        // ── 5. Sinh tên file gốc có nghĩa (browser thường gửi "blob") ────
        const ext          = getAudioExtension(file.mimetype);
        const safeOriginal = (file.originalname && file.originalname !== 'blob')
            ? file.originalname
            : `voice_${Date.now()}${ext}`;

        // ── 6. Upload lên S3, lưu trong folder voices/ ───────────────────
        const s3Key = generateS3Key('voices', safeOriginal);
        const url   = await uploadToS3(file.buffer, s3Key, file.mimetype);

        // ── 7. Lưu metadata vào Attachment ───────────────────────────────
        //      messageId = null → sẽ được gán khi user gửi tin nhắn
        const attachment = await Attachment.create({
            uploadedBy: req.user._id,
            url,
            fileName:  safeOriginal,
            mimeType:  file.mimetype,
            fileSize:  file.size,
            duration,           // giây (null nếu client không gửi)
        });

        return res.status(201).json({
            message: 'Upload ghi âm thành công',
            voice: {
                fileId:   attachment._id,
                url:      attachment.url,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileSize: attachment.fileSize,
                duration: attachment.duration,
            },
        });
    } catch (err) {
        console.error('uploadVoice error:', err);
        return res.status(500).json({ message: 'Lỗi server khi upload ghi âm' });
    }
};

module.exports = { uploadVoice };
