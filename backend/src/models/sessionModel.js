const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        deviceName: {
            type: String,
            default: 'Unknown Device',
        },
        platform: {
            type: String,
            enum: ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Web', 'Unknown'],
            default: 'Unknown',
        },
        ipAddress: {
            type: String,
        },
        location: {
            type: String,
            default: 'Không rõ vị trí',
        },
        userAgent: {
            type: String,
        },
        loginMethod: {
            type: String,
            enum: ['password', 'qr', 'google', 'facebook', 'otp', 'supabase'],
            default: 'password',
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
        },
        isTrusted: {
            type: Boolean,
            default: false,
        },
        refreshToken: {
            type: String,
            index: true,
        },
        expiresAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Tự động xóa các session đã hết hạn lâu ngày (ví dụ 30 ngày sau expiresAt)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const sessionModel = mongoose.model('Session', sessionSchema);
module.exports = sessionModel;
