const userModel = require('../models/userModel');
const { supabaseAdmin } = require('../config/supabase');
const { saveOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const { sendOtpSms, checkBalance } = require('../services/smsService');

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
            user: {
                _id: dbUser._id,
                email: dbUser.email,
                displayName: dbUser.displayName,
                avatar: dbUser.avatar,
                authProvider: dbUser.authProvider,
                isEmailVerified: dbUser.isEmailVerified,
                isPhoneVerified: dbUser.isPhoneVerified,
            },
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
            user: {
                _id: dbUser._id,
                email: dbUser.email,
                displayName: dbUser.displayName,
                avatar: dbUser.avatar,
                authProvider: dbUser.authProvider,
                isEmailVerified: dbUser.isEmailVerified,
                isPhoneVerified: dbUser.isPhoneVerified,
            },
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
            user: {
                _id: user._id,
                username: user.username || null, // ✅ Trả về null thay vì undefined
                email: user.email,
                displayName: user.displayName,
                phone: user.phone || null,
                avatar: user.avatar || null,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                authProvider: user.authProvider,
                createdAt: user.createdAt,
                bio: user.bio,
                status: user.status,
                statusText: user.statusText,
                banner: user.banner || null,
                usernameColor: user.usernameColor,
                themeName: user.themeName,
                themeColors: user.themeColors || null,
            },
        });

    } catch (error) {
        console.error('authMe error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// ════════════════════════════════════════════════════════════════
//  EMAIL OTP (gửi qua Gmail, không dùng Supabase)
// ════════════════════════════════════════════════════════════════

// Gửi OTP về email — dùng khi đăng ký tài khoản local
const sendEmailOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập email' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Email không hợp lệ' });
        }

        // Kiểm tra email đã được dùng chưa
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email này đã được sử dụng' });
        }

        // Tạo và lưu OTP (có cooldown 60s)
        let otp;
        try {
            otp = await saveOtp(email, 'email');
        } catch (cooldownError) {
            return res.status(429).json({ message: cooldownError.message });
        }

        // Gửi email
        await sendOtpEmail(email, otp);

        return res.status(200).json({
            message: `Mã OTP đã được gửi về ${email}. Vui lòng kiểm tra hộp thư.`,
        });

    } catch (error) {
        console.error('sendEmailOtp error:', error.message);
        return res.status(500).json({ message: error.message || 'Không thể gửi OTP email' });
    }
};

// Xác minh OTP email
const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mã OTP' });
        }

        const result = await verifyOtp(email, 'email', otp);

        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }

        return res.status(200).json({ message: 'Xác thực email thành công' });

    } catch (error) {
        console.error('verifyEmailOtp error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi xác thực OTP' });
    }
};

// ════════════════════════════════════════════════════════════════
//  PHONE OTP (gửi qua SpeedSMS)
// ════════════════════════════════════════════════════════════════

// Gửi OTP về số điện thoại
const sendPhoneOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Vui lòng nhập số điện thoại' });
        }

        // Validate số điện thoại VN cơ bản
        const phoneRegex = /^(0|\+84|84)(3[2-9]|5[6-9]|7[0|6-9]|8[0-9]|9[0-9])[0-9]{7}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ (phải là số VN)' });
        }

        // Tạo và lưu OTP
        let otp;
        try {
            otp = await saveOtp(phone, 'phone');
        } catch (cooldownError) {
            return res.status(429).json({ message: cooldownError.message });
        }

        // Gửi SMS qua SpeedSMS
        await sendOtpSms(phone, otp);

        return res.status(200).json({
            message: `Mã OTP đã được gửi về số ${phone}`,
        });

    } catch (error) {
        console.error('sendPhoneOtp error:', error.message);
        return res.status(500).json({ message: error.message || 'Không thể gửi OTP SMS' });
    }
};

// Xác minh OTP điện thoại
const verifyPhoneOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Vui lòng nhập số điện thoại và mã OTP' });
        }

        const result = await verifyOtp(phone, 'phone', otp);

        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }

        // Nếu user đã đăng nhập → cập nhật isPhoneVerified trong DB
        if (req.user) {
            await userModel.findByIdAndUpdate(req.user._id, {
                phone,
                isPhoneVerified: true,
            });
        }

        return res.status(200).json({ message: 'Xác thực số điện thoại thành công' });

    } catch (error) {
        console.error('verifyPhoneOtp error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi xác thực OTP' });
    }
};

// ════════════════════════════════════════════════════════════════
//  CẬP NHẬT PROFILE (avatar, displayName, and extended settings)
// ════════════════════════════════════════════════════════════════
const updateProfile = async (req, res) => {
    try {
        const {
            avatar, displayName,
            bio, status, statusText, banner, usernameColor, themeName, themeColors,
        } = req.body;
        const userId = req.user._id;

        const updates = {};
        if (displayName !== undefined && displayName.trim()) {
            updates.displayName = displayName.trim();
        }
        if (avatar !== undefined) {
            // Chấp nhận URL hoặc base64 data URL
            if (avatar && avatar.length > 5 * 1024 * 1024) {
                return res.status(400).json({ message: 'Ảnh quá lớn, tối đa 5MB' });
            }
            updates.avatar = avatar;
        }
        if (bio !== undefined) updates.bio = bio;
        if (status !== undefined) updates.status = status;
        if (statusText !== undefined) updates.statusText = statusText;
        if (banner !== undefined) updates.banner = banner;
        if (usernameColor !== undefined) updates.usernameColor = usernameColor;
        if (themeName !== undefined) updates.themeName = themeName;
        if (themeColors !== undefined) updates.themeColors = themeColors;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updates,
            { new: true, select: '-passwordHash' }
        );

        return res.status(200).json({
            message: 'Cập nhật profile thành công',
            user: {
                _id: updatedUser._id,
                username: updatedUser.username || null,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                phone: updatedUser.phone || null,
                avatar: updatedUser.avatar || null,
                isEmailVerified: updatedUser.isEmailVerified,
                isPhoneVerified: updatedUser.isPhoneVerified,
                authProvider: updatedUser.authProvider,
                bio: updatedUser.bio,
                status: updatedUser.status,
                statusText: updatedUser.statusText,
                banner: updatedUser.banner || null,
                usernameColor: updatedUser.usernameColor,
                themeName: updatedUser.themeName,
                themeColors: updatedUser.themeColors || null,
            },
        });

    } catch (error) {
        console.error('updateProfile error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
    }
};

// ════════════════════════════════════════════════════════════════
//  TIỆN ÍCH
// ════════════════════════════════════════════════════════════════

// Kiểm tra số dư Twilio (chỉ dùng nội bộ/admin)
const getSmsBalance = async (req, res) => {
    try {
        const balance = await checkBalance();
        return res.status(200).json(balance);
    } catch (error) {
        return res.status(500).json({ message: 'Không thể kiểm tra số dư Twilio' });
    }
};

module.exports = {
    syncOAuthUser,
    completeOAuthProfile,
    authMe,
    updateProfile,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    getSmsBalance,
};