const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET, CLOUDFRONT_DOMAIN } = require('../config/s3Config');
const path = require('path');
const crypto = require('crypto');

// ── Giới hạn kích thước ──────────────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100MB
const MAX_FILE_SIZE  = 50 * 1024 * 1024;   // 50MB

// ── Định dạng được cho phép ──────────────────────────────────────
const ALLOWED_IMAGE_MIME = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
];

const ALLOWED_VIDEO_MIME = [
    'video/mp4',
    'video/quicktime',     // .mov
    'video/x-msvideo',     // .avi
    'video/x-matroska',    // .mkv
    'video/webm',
];

// Đuôi file thực thi bị chặn (bảo mật)
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.app', '.deb', '.rpm', '.vbs', '.jar'];

// ═══════════════════════════════════════════════════════════════════
//  Sinh S3 key duy nhất:  folder/timestamp_randomhex.ext
// ═══════════════════════════════════════════════════════════════════
const generateS3Key = (folder, originalName) => {
    const ext       = path.extname(originalName).toLowerCase();
    const uniqueId  = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${folder}/${timestamp}_${uniqueId}${ext}`;
};

// ═══════════════════════════════════════════════════════════════════
//  Upload buffer lên S3 và trả về CloudFront URL
// ═══════════════════════════════════════════════════════════════════
const uploadToS3 = async (buffer, key, mimeType) => {
    try {
        if (!S3_BUCKET) {
            throw new Error('AWS_S3_BUCKET_NAME is not defined in .env');
        }
        if (!CLOUDFRONT_DOMAIN) {
            throw new Error('AWS_CLOUDFRONT_DOMAIN is not defined in .env');
        }

        console.log(`[S3 Upload] Starting → Bucket: ${S3_BUCKET}, Key: ${key}, Size: ${buffer.length} bytes`);

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            // Không cần ACL: 'public-read' vì dùng OAC + CloudFront
        });

        await s3Client.send(command);

        const fileUrl = `${CLOUDFRONT_DOMAIN.replace(/\/$/, '')}/${key}`;
        console.log(`[S3 Upload] Success → ${fileUrl}`);

        return fileUrl;

    } catch (error) {
        console.error('=== S3 UPLOAD ERROR ===');
        console.error('Error Name :', error.name);
        console.error('Error Code :', error.code);
        console.error('Error Message:', error.message);
        console.error('Full Error  :', error);

        // Phân loại lỗi phổ biến để dễ debug
        if (error.name === 'CredentialsProviderError' || error.code === 'CredentialsError') {
            throw new Error('AWS credentials không đúng hoặc chưa cấu hình');
        }
        if (error.code === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
            throw new Error('Access Denied: IAM hoặc Bucket Policy chưa cho phép PutObject');
        }
        if (error.code === 'NoSuchBucket') {
            throw new Error('Bucket không tồn tại hoặc sai tên');
        }

        throw error; // ném lỗi gốc ra để controller bắt
    }
};
// ═══════════════════════════════════════════════════════════════════
//  Validation helpers
// ═══════════════════════════════════════════════════════════════════
const validateImage = (file) => {
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
        return `Định dạng ảnh không được hỗ trợ. Chấp nhận: jpg, png, gif, webp`;
    }
    if (file.size > MAX_IMAGE_SIZE) {
        return 'Ảnh quá lớn, tối đa 10MB';
    }
    return null;
};

const validateVideo = (file) => {
    if (!ALLOWED_VIDEO_MIME.includes(file.mimetype)) {
        return `Định dạng video không được hỗ trợ. Chấp nhận: mp4, mov, avi, mkv, webm`;
    }
    if (file.size > MAX_VIDEO_SIZE) {
        return 'Video quá lớn, tối đa 100MB';
    }
    return null;
};

const validateFile = (file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
        return 'Loại file này không được phép upload vì lý do bảo mật';
    }
    if (file.size > MAX_FILE_SIZE) {
        return 'File quá lớn, tối đa 50MB';
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════════
//  Khôi phục tên file UTF-8 (tiếng Việt) — multer/busboy giải mã header
//  tên file dạng latin1 nên ký tự có dấu bị hỏng. Đọc lại bytes theo
//  latin1 rồi decode utf8 để lấy lại tên gốc.
// ═══════════════════════════════════════════════════════════════════
const decodeFileName = (name = '') => {
    if (!name) return '';
    try {
        const decoded = Buffer.from(name, 'latin1').toString('utf8');
        // Nếu decode ra ký tự thay thế (�) tức là không phải mojibake latin1 → giữ nguyên
        return decoded.includes('�') ? name : decoded;
    } catch {
        return name;
    }
};

// ═══════════════════════════════════════════════════════════════════
//  Trích đoạn văn bản preview cho tài liệu (PDF / DOCX / TXT) — kiểu Zalo.
//  Trả về '' nếu không hỗ trợ hoặc lỗi (không chặn luồng upload).
// ═══════════════════════════════════════════════════════════════════
const MAX_PREVIEW_LEN = 240;
const extractTextPreview = async (buffer, fileName = '', mimeType = '') => {
    try {
        const ext = path.extname(fileName).toLowerCase().replace('.', '');
        let text = '';

        if (ext === 'pdf' || mimeType === 'application/pdf') {
            const { PDFParse } = require('pdf-parse');
            const parser = new PDFParse({ data: buffer });
            const res = await parser.getText();
            text = res?.text || '';
            await parser.destroy?.();
        } else if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
            const mammoth = require('mammoth');
            const res = await mammoth.extractRawText({ buffer });
            text = res?.value || '';
        } else if (ext === 'txt' || (mimeType || '').startsWith('text/')) {
            text = buffer.toString('utf8');
        } else {
            return '';
        }

        text = (text || '')
            .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, ' ') // bỏ marker trang của pdf-parse
            .replace(/\s+/g, ' ')
            .trim();
        if (text.length > MAX_PREVIEW_LEN) {
            text = text.slice(0, MAX_PREVIEW_LEN).trim() + '…';
        }
        return text;
    } catch (e) {
        console.error('[extractTextPreview] error:', e.message);
        return '';
    }
};

module.exports = {
    generateS3Key,
    uploadToS3,
    validateImage,
    validateVideo,
    validateFile,
    decodeFileName,
    extractTextPreview,
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
    MAX_FILE_SIZE,
};