const mongoose = require('mongoose');

// Model này chỉ dùng cho LOCAL auth (username/password)
// OAuth qua Supabase tự quản lý refresh token của họ

const authSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        refreshToken: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Tự động xóa document khi hết hạn
authSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const authModel = mongoose.model('Auth', authSchema);
module.exports = authModel;