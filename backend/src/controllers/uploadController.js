const Attachment = require('../models/attachmentModel');
const {
    generateS3Key,
    uploadToS3,
    validateImage,
    validateVideo,
    validateFile,
} = require('../services/uploadService');

// ════════════════════════════════════════════════════════════════
//  POST /uploads/file  –  Upload tài liệu / file thông thường
//  Chấp nhận mọi loại file ngoại trừ file thực thi, tối đa 50MB
// ════════════════════════════════════════════════════════════════
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có file được gửi lên' });
        }

        const validationError = validateFile(req.file);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const s3Key = generateS3Key('files', req.file.originalname);
        const url   = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

        const attachment = await Attachment.create({
            uploadedBy: req.user._id,
            url,
            fileName:  req.file.originalname,
            mimeType:  req.file.mimetype,
            fileSize:  req.file.size,
        });

        return res.status(201).json({
            message: 'Upload file thành công',
            file: {
                fileId:   attachment._id,
                url:      attachment.url,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileSize: attachment.fileSize,
            },
        });
    } catch (error) {
        console.error('uploadFile error:', error);
        return res.status(500).json({ message: 'Lỗi server khi upload file' });
    }
};

// ════════════════════════════════════════════════════════════════
//  POST /uploads/image  –  Upload ảnh đơn
//  Hỗ trợ: jpg, png, gif, webp – tối đa 10MB
// ════════════════════════════════════════════════════════════════
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có ảnh được gửi lên' });
        }

        const validationError = validateImage(req.file);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const s3Key = generateS3Key('images', req.file.originalname);
        const url   = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

        const attachment = await Attachment.create({
            uploadedBy: req.user._id,
            url,
            fileName:  req.file.originalname,
            mimeType:  req.file.mimetype,
            fileSize:  req.file.size,
        });

        return res.status(201).json({
            message: 'Upload ảnh thành công',
            file: {
                fileId:   attachment._id,
                url:      attachment.url,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileSize: attachment.fileSize,
            },
        });
    } catch (error) {
        console.error('uploadImage error:', error);
        return res.status(500).json({ message: 'Lỗi server khi upload ảnh' });
    }
};

// ════════════════════════════════════════════════════════════════
//  POST /uploads/video  –  Upload video
//  Hỗ trợ: mp4, mov, avi, mkv, webm – tối đa 100MB
// ════════════════════════════════════════════════════════════════
const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có video được gửi lên' });
        }

        const validationError = validateVideo(req.file);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const s3Key = generateS3Key('videos', req.file.originalname);
        const url   = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

        const attachment = await Attachment.create({
            uploadedBy: req.user._id,
            url,
            fileName:  req.file.originalname,
            mimeType:  req.file.mimetype,
            fileSize:  req.file.size,
        });

        return res.status(201).json({
            message: 'Upload video thành công',
            file: {
                fileId:   attachment._id,
                url:      attachment.url,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileSize: attachment.fileSize,
            },
        });
    } catch (error) {
        console.error('uploadVideo error:', error);
        return res.status(500).json({ message: 'Lỗi server khi upload video' });
    }
};

module.exports = { uploadFile, uploadImage, uploadVideo };
