const userModel = require('../models/userModel');
const authModel = require('../models/authModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verifyOtp } = require('../services/otpService');

// ── Helper: tạo cặp token local ──────────────────────────────────
const createLocalTokens = async (userId, res) => {
    // Access token ngắn hạn (15 phút)
    const accessToken = jwt.sign(
        { user_id: userId },
        process.env.acc_secret,
        { expiresIn: '15m' }
    );

    // Refresh token dài hạn (7 ngày) lưu vào DB
    const refreshToken = crypto.randomBytes(64).toString('hex');
    await authModel.create({
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Gửi refresh token qua cookie httpOnly
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return accessToken;
};

// ── SIGNUP ────────────────────────────────────────────────────────
const signup = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, phone, emailOtp, phoneOtp } = req.body;

        // Validate input
        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
        }

        // ── Xác thực OTP: cần ít nhất 1 trong 2 (email HOẶC phone) ─
        const hasEmailOtp = !!emailOtp;
        const hasPhoneOtp = !!(phone && phoneOtp);

        if (!hasEmailOtp && !hasPhoneOtp) {
            return res.status(400).json({ message: 'Cần xác thực ít nhất một phương thức: email OTP hoặc số điện thoại OTP' });
        }

        let isEmailVerifiedResult = false;
        if (hasEmailOtp) {
            const emailResult = await verifyOtp(email, 'email', emailOtp);
            if (!emailResult.success) {
                return res.status(400).json({ message: emailResult.message });
            }
            isEmailVerifiedResult = true;
        }

        let isPhoneVerified = false;
        if (hasPhoneOtp) {
            const phoneResult = await verifyOtp(phone, 'phone', phoneOtp);
            if (!phoneResult.success) {
                return res.status(400).json({ message: phoneResult.message });
            }
            isPhoneVerified = true;
        }

        // ── Kiểm tra trùng lặp ───────────────────────────────────
        const existingUsername = await userModel.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username đã tồn tại, vui lòng chọn tên khác' });
        }

        const existingEmail = await userModel.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        // ── Tạo user ─────────────────────────────────────────────
        const passwordHash = await bcrypt.hash(password, 10);
        await userModel.create({
            username,
            passwordHash,
            email,
            displayName: `${firstName} ${lastName}`,
            phone: phone || undefined,
            isEmailVerified: isEmailVerifiedResult,
            isPhoneVerified,
            authProvider: 'local',
        });

        return res.status(201).json({ message: 'Đăng ký tài khoản thành công' });

    } catch (error) {
        console.error('Signup error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};

// ── SIGNIN ────────────────────────────────────────────────────────
const signin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập username và password' });
        }

        // Tìm user (có thể đăng nhập bằng username hoặc email)
        const userFind = await userModel.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!userFind) {
            return res.status(400).json({ message: 'Username hoặc email không tồn tại' });
        }

        // Kiểm tra user có dùng OAuth không
        if (!userFind.passwordHash) {
            return res.status(400).json({
                message: `Tài khoản này đăng nhập qua ${userFind.authProvider}. Vui lòng dùng nút đăng nhập tương ứng`,
            });
        }

        // So sánh password
        const passwordMatch = await bcrypt.compare(password, userFind.passwordHash);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Mật khẩu không chính xác' });
        }

        // Tạo tokens
        const accessToken = await createLocalTokens(userFind._id, res);

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            accessToken,
            user: {
                _id: userFind._id,
                username: userFind.username,
                email: userFind.email,
                displayName: userFind.displayName,
                avatar: userFind.avatar,
                authProvider: userFind.authProvider,
            },
        });

    } catch (error) {
        console.error('Signin error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};

// ── SIGNOUT ───────────────────────────────────────────────────────
const signout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            // OAuth user không có refresh token cookie — vẫn trả 200
            return res.status(200).json({ message: 'Đăng xuất thành công' });
        }

        // Xóa cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        // Xóa trong DB
        await authModel.findOneAndDelete({ refreshToken });

        return res.status(200).json({ message: 'Đăng xuất thành công' });

    } catch (error) {
        console.error('Signout error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
    }
};

// ── REFRESH ACCESS TOKEN ──────────────────────────────────────────
const getNewAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Không có refresh token', code: 'NO_REFRESH_TOKEN' });
        }

        // Tìm session hợp lệ
        const authSession = await authModel.findOne({
            refreshToken,
            expiresAt: { $gt: new Date() },
        });

        if (!authSession) {
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn', code: 'REFRESH_EXPIRED' });
        }

        // Kiểm tra user còn tồn tại
        const user = await userModel.findById(authSession.userId);
        if (!user) {
            await authModel.deleteOne({ _id: authSession._id });
            return res.status(401).json({ message: 'User không tồn tại' });
        }

        // Tạo access token mới
        const newAccessToken = jwt.sign(
            { user_id: user._id },
            process.env.acc_secret,
            { expiresIn: '15m' }
        );

        return res.status(200).json({
            message: 'Lấy access token mới thành công',
            accessToken: newAccessToken,
        });

    } catch (error) {
        console.error('Refresh token error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { signup, signin, signout, getNewAccessToken };
