const mongoose = require('mongoose');

// Lưu OTP tạm thời cho email và SMS
// TTL index tự động xóa sau khi hết hạn

const otpSchema = new mongoose.Schema(
    {
        target: {
            type: String,
            required: true,
            index: true,
            // Giá trị: email address hoặc số điện thoại
        },
        type: {
            type: String,
            enum: ['email', 'phone'],
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        // Giới hạn số lần thử sai
        attempts: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Tự động xóa OTP document sau khi đến thời điểm expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index tổng hợp để query nhanh
otpSchema.index({ target: 1, type: 1 });

const otpModel = mongoose.model('Otp', otpSchema);
module.exports = otpModel;