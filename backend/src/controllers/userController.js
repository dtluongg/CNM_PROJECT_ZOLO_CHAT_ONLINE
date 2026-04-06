const userModel = require('../models/userModel');
const authModel = require('../models/authModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { saveOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const { userResponse } = require('../utils/userHelper');

// ── Helper: validate mật khẩu mới ───────────────────────────────
const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return 'Mật khẩu không hợp lệ';
    }

    if (password.length < 8) {
        return 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    // Ít nhất 1 chữ hoa, 1 chữ thường và 1 số
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'Mật khẩu phải bao gồm chữ hoa, chữ thường và số';
    }

    return null;
};

// ── Helper: tạo cặp token local ──────────────────────────────────
const createLocalTokens = async (userId, res) => {
    // Access token 7 ngày (mobile không thể dùng cookie-based refresh)
    const accessToken = jwt.sign(
        { user_id: userId },
        process.env.acc_secret,
        { expiresIn: '7d' }
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

        // Tạo tokens (refreshToken cũng trả về body để mobile lưu vào AsyncStorage)
        const plainRefreshToken = crypto.randomBytes(64).toString('hex');
        await authModel.create({
            userId: userFind._id,
            refreshToken: plainRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        res.cookie('refreshToken', plainRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        const accessToken = jwt.sign(
            { user_id: userFind._id },
            process.env.acc_secret,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            accessToken,
            refreshToken: plainRefreshToken,
            user: userResponse(userFind),
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
// Chấp nhận refreshToken từ cookie (web) HOẶC body (mobile)
const getNewAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
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

        // Tạo access token mới (7 ngày)
        const newAccessToken = jwt.sign(
            { user_id: user._id },
            process.env.acc_secret,
            { expiresIn: '7d' }
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
// ── ĐỔI MẬT KHẨU (khi đang đăng nhập) ───────────────────────────
// Yêu cầu: verifyLocalToken trước, body: { oldPassword, newPassword }
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới' });
        }

        const userId = req.user && req.user._id;
        if (!userId) {
            return res.status(401).json({ message: 'Không xác định được người dùng' });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại' });
        }

        if (user.authProvider !== 'local' || !user.passwordHash) {
            return res.status(400).json({ message: 'Tài khoản này không hỗ trợ đổi mật khẩu local' });
        }

        const isOldCorrect = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isOldCorrect) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        // Không cho phép trùng mật khẩu cũ
        const isSameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSameAsOld) {
            return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = newHash;
        await user.save();

        // Invalidate toàn bộ refresh token cũ
        await authModel.deleteMany({ userId: user._id });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        return res.status(200).json({ message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' });

    } catch (error) {
        console.error('Change password error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' });
    }
};

// ── QUÊN MẬT KHẨU: gửi OTP tới email ───────────────────────────
// Body: { username }  (có thể là username hoặc email)
const forgotPassword = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Vui lòng nhập username hoặc email' });
        }

        const identifier = username.toLowerCase();

        const user = await userModel.findOne({
            $or: [
                { username: identifier },
                { email: identifier },
            ],
        });

        // Trả về message chung để tránh lộ thông tin tài khoản tồn tại hay không
        const genericMessage = 'Nếu tài khoản tồn tại, chúng tôi đã gửi mã OTP tới email đăng ký';

        if (!user) {
            return res.status(200).json({ message: genericMessage });
        }

        if (user.authProvider !== 'local' || !user.passwordHash) {
            return res.status(200).json({ message: genericMessage });
        }

        try {
            const otp = await saveOtp(user.email, 'email');
            await sendOtpEmail(user.email, otp);
        } catch (error) {
            // Nếu lỗi do cooldown, có thể trả về chi tiết để UX tốt hơn
            return res.status(429).json({ message: error.message || 'Vui lòng thử lại sau một lúc' });
        }

        return res.status(200).json({ message: genericMessage });

    } catch (error) {
        console.error('Forgot password error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi gửi OTP reset mật khẩu' });
    }
};

// ── QUÊN MẬT KHẨU: đặt lại mật khẩu bằng OTP ──────────────────
// Body: { username, otp, newPassword }
const resetPassword = async (req, res) => {
    try {
        const { username, otp, newPassword } = req.body;

        if (!username || !otp || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ username, OTP và mật khẩu mới' });
        }

        const identifier = username.toLowerCase();

        const user = await userModel.findOne({
            $or: [
                { username: identifier },
                { email: identifier },
            ],
        });

        if (!user || user.authProvider !== 'local' || !user.passwordHash) {
            // Không tiết lộ chi tiết vì lý do bảo mật
            return res.status(400).json({ message: 'Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại thông tin hoặc yêu cầu OTP mới' });
        }

        // Xác thực OTP theo email của user
        const otpResult = await verifyOtp(user.email, 'email', otp);
        if (!otpResult.success) {
            return res.status(400).json({ message: otpResult.message });
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        // Không cho phép dùng lại mật khẩu cũ
        const isSameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSameAsOld) {
            return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = newHash;
        await user.save();

        await authModel.deleteMany({ userId: user._id });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        return res.status(200).json({ message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' });

    } catch (error) {
        console.error('Reset password error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
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
            user: userResponse(updatedUser),
        });

    } catch (error) {
        console.error('updateProfile error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
    }
};

// ════════════════════════════════════════════════════════════════
//  TÌM KIẾM USER (theo username, email, displayName)
// ════════════════════════════════════════════════════════════════
const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự' });
        }

        const keyword = q.trim();
        const regex = new RegExp(keyword, 'i');

        const users = await userModel.find({
            _id: { $ne: req.user._id }, // Không tìm bản thân
            $or: [
                { displayName: regex },
                { username: regex },
                { email: regex },
            ],
        })
        .select('_id displayName username email avatar usernameColor status statusText bio')
        .limit(20);

        return res.status(200).json({
            users: users.map(u => ({
                _id: u._id,
                displayName: u.displayName,
                username: u.username || null,
                email: u.email,
                avatar: u.avatar || null,
                usernameColor: u.usernameColor || '#5865f2',
                status: u.status === 'invisible' ? 'offline' : u.status,
                statusText: u.status === 'invisible' ? '' : (u.statusText || ''),
                bio: u.bio || '',
            })),
        });
    } catch (error) {
        console.error('searchUsers error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi tìm kiếm' });
    }
};

// ════════════════════════════════════════════════════════════════
//  PUBLIC PROFILE - Cho người dùng khác xem hồ sơ
// ════════════════════════════════════════════════════════════════
const getPublicProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || !userId.match(/^[a-f\d]{24}$/i)) {
            return res.status(400).json({ message: 'userId không hợp lệ' });
        }

        const user = await userModel.findById(userId).select(
            'displayName username email avatar banner bio status statusText usernameColor createdAt'
        );

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const visibleStatus = user.status === 'invisible' ? 'offline' : user.status;

        return res.status(200).json({
            user: {
                _id: user._id,
                displayName: user.displayName,
                username: user.username || null,
                email: user.email,
                avatar: user.avatar || null,
                banner: user.banner || null,
                bio: user.bio || '',
                status: visibleStatus,
                statusText: user.status === 'invisible' ? '' : (user.statusText || ''),
                usernameColor: user.usernameColor || '#5865f2',
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('getPublicProfile error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = {
    signup,
    signin,
    signout,
    getNewAccessToken,
    changePassword,
    forgotPassword,
    resetPassword,
    updateProfile,
    searchUsers,
    getPublicProfile
};
