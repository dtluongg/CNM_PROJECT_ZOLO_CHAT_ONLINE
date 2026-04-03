const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        // ── Liên kết Supabase ──────────────────────────────────────
        // Mỗi user OAuth sẽ có supabaseId từ Supabase Auth
        supabaseId: {
            type: String,
            unique: true,
            sparse: true, // cho phép null (user local cũ không có)
            index: true,
        },

        // ── Thông tin đăng nhập local ──────────────────────────────
        username: {
            type: String,
            unique: true,
            sparse: true, // user OAuth có thể không có username
            trim: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
            // Không required — user OAuth không có password
        },

        // ── Thông tin cá nhân ──────────────────────────────────────
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            sparse: true,
            trim: true,
        },
        avatar: {
            type: String, // URL ảnh đại diện (từ Google/Facebook)
        },

        // ── Trạng thái xác thực ────────────────────────────────────
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },

        // ── Nhà cung cấp xác thực ──────────────────────────────────
        authProvider: {
            type: String,
            enum: ['local', 'google', 'facebook'],
            default: 'local',
        },
        // Danh sách tất cả các provider đã từng link vào tài khoản này
        linkedProviders: [{
            provider: { type: String },   // 'google' | 'facebook'
            supabaseId: { type: String },
        }],
    },
    {
        timestamps: true, // tự thêm createdAt, updatedAt
    }
);

const userModel = mongoose.model('User', userSchema);
module.exports = userModel;