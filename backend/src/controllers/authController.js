const userModel = require('../models/userModel');
const { supabaseAdmin } = require('../config/supabase');
const { userResponse } = require('../utils/userHelper');

// ════════════════════════════════════════════════════════════════
//  SUPABASE OAUTH
// ════════════════════════════════════════════════════════════════
const syncOAuthUser = async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) {
            return res.status(400).json({ message: 'Thiếu access_token' });
        }

        const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(access_token);
        if (error || !supabaseUser) {
            return res.status(401).json({ message: 'Token Supabase không hợp lệ' });
        }

        const rawProvider = supabaseUser.app_metadata?.provider
            || supabaseUser.app_metadata?.providers?.[0]
            || 'google';
        const provider = rawProvider.includes('facebook') ? 'facebook'
            : rawProvider.includes('google') ? 'google' : 'google';

        const email = supabaseUser.email || null;
        const displayName = supabaseUser.user_metadata?.full_name
            || supabaseUser.user_metadata?.name
            || (email ? email.split('@')[0] : `user_${supabaseUser.id.slice(0, 8)}`);
        const avatar = supabaseUser.user_metadata?.avatar_url
            || supabaseUser.user_metadata?.picture || null;

        console.log(`[syncOAuth] provider=${provider} email=${email} supabaseId=${supabaseUser.id}`);

        // ── Trường hợp không có email (Facebook chưa cấp quyền) ──────
        // Yêu cầu người dùng nhập email + xác thực OTP trước
        if (!email) {
            return res.status(200).json({
                needsEmailVerification: true,
                supabaseId: supabaseUser.id,
                provider,
                displayName,
                avatar,
            });
        }

        // ── Tìm hoặc tạo user ────────────────────────────────────────
        let dbUser = await userModel.findOne({ supabaseId: supabaseUser.id })
            || await userModel.findOne({ email });

        if (dbUser) {
            // Cập nhật supabaseId nếu chưa có (tài khoản local)
            if (!dbUser.supabaseId) dbUser.supabaseId = supabaseUser.id;
            if (!dbUser.avatar && avatar) dbUser.avatar = avatar;
            dbUser.isEmailVerified = true;
            await dbUser.save();
            console.log(`🔗 OAuth (${provider}) matched existing account: ${email}`);
        } else {
            dbUser = await userModel.create({
                supabaseId: supabaseUser.id,
                email, displayName, avatar,
                isEmailVerified: true,
                isPhoneVerified: false,
                authProvider: provider,
            });
            console.log(`✅ New OAuth user created: ${email} (${provider})`);
        }

        return res.status(200).json({
            message: 'Đồng bộ tài khoản thành công',
            user: userResponse(dbUser),
        });

    } catch (error) {
        console.error('syncOAuthUser error:', error.message);
        console.error('syncOAuthUser stack:', error.stack);
        return res.status(500).json({
            message: 'Lỗi server khi đồng bộ tài khoản',
            detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        });
    }
};

// ════════════════════════════════════════════════════════════════
//  HOÀN TẤT ĐĂNG KÝ OAUTH (khi Facebook không trả email)
// ════════════════════════════════════════════════════════════════
const completeOAuthProfile = async (req, res) => {
    try {
        const { supabaseId, provider, email, emailOtp, displayName, avatar } = req.body;

        if (!supabaseId || !email || !emailOtp) {
            return res.status(400).json({ message: 'Thiếu supabaseId, email hoặc mã OTP' });
        }

        // Xác thực OTP email
        const otpResult = await verifyOtp(email, 'email', emailOtp);
        if (!otpResult.success) {
            return res.status(400).json({ message: otpResult.message });
        }

        // Kiểm tra email đã được dùng chưa
        let dbUser = await userModel.findOne({ email });

        if (dbUser) {
            // Email đã có → link supabaseId vào tài khoản này
            if (!dbUser.supabaseId) dbUser.supabaseId = supabaseId;
            dbUser.isEmailVerified = true;
            if (!dbUser.avatar && avatar) dbUser.avatar = avatar;
            await dbUser.save();
            console.log(`🔗 Completed OAuth profile linked to existing account: ${email}`);
        } else {
            // Tạo user mới
            dbUser = await userModel.create({
                supabaseId,
                email,
                displayName: displayName || email.split('@')[0],
                avatar: avatar || null,
                isEmailVerified: true,
                isPhoneVerified: false,
                authProvider: provider || 'facebook',
            });
            console.log(`✅ New OAuth user created via complete-profile: ${email}`);
        }

        return res.status(200).json({
            message: 'Hoàn tất đăng ký thành công',
            user: userResponse(dbUser),
        });

    } catch (error) {
        console.error('completeOAuthProfile error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi hoàn tất đăng ký' });
    }
};

// ════════════════════════════════════════════════════════════════
//  AUTH ME
// ════════════════════════════════════════════════════════════════

// Lấy thông tin user hiện tại (dùng sau verifyToken middleware)
// ════════════════════════════════════════════════════════════════
//  AUTH ME
// ════════════════════════════════════════════════════════════════
const authMe = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Chưa xác thực' });
        }

        return res.status(200).json({
            message: `Xác thực thành công, chào mừng ${user.displayName}`,
            authType: req.authType || 'unknown',
            user: userResponse(user),
        });

    } catch (error) {
        console.error('authMe error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = {
    syncOAuthUser,
    completeOAuthProfile,
    authMe,
};
