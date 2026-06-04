const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['user', 'message', 'conversation'],
            required: true,
        },
        targetId: {
            type: String,   // linh hoạt cho cả 3 loại target
            required: true,
            index: true,
        },
        // snapshot tên để xem khi target đã bị xoá
        targetSnapshot: {
            type: String,
            default: null,
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'spam',
                'harassment',
                'hate_speech',
                'violence',
                'sexual_content',
                'fake_account',
                'scam',
                'other',
            ],
        },
        description: {
            type: String,
            default: '',
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
            default: 'pending',
            index: true,
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        adminNote: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);