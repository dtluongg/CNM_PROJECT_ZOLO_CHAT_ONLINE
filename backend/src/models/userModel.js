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

        // ── Cài đặt người dùng mở rộng ────────────────────────────
        bio: { type: String, default: '' },
        status: { type: String, default: 'online', enum: ['online', 'idle', 'dnd', 'invisible'] },
        statusText: { type: String, default: '' },
        banner: { type: String, default: null },
        usernameColor: { type: String, default: '#5865f2' },
        themeName: { type: String, default: 'dark' },
        themeColors: { type: Object, default: null },
        language: { type: String, default: 'vi', enum: ['vi', 'en'] },

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

        // ── Phân quyền & trạng thái tài khoản ─────────────────────
        role: {
            type: String,
            enum: ['user', 'moderator', 'admin'],
            default: 'user',
            index: true,
        },
        isBanned: {
            type: Boolean,
            default: false,
            index: true,
        },
        bannedReason: {
            type: String,
            default: null,
        },
        bannedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // tự thêm createdAt, updatedAt
    }
);

const userModel = mongoose.model('User', userSchema);
module.exports = userModel;