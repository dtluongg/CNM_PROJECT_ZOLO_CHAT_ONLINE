const userModel = require('../models/userModel');
const authModel = require('../models/authModel');
const sessionModel = require('../models/sessionModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { saveOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const { supabaseAdmin } = require('../config/supabase');
const { parseUserAgent, getLocationFromIP, extractClientIP, buildSessionMeta, generateDeviceFingerprint } = require('../untils/sessionHelper');
const { getIO } = require('../socket/socketManager');
const { createAndEmitNotification } = require('../services/notificationService');

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

// ── Helper: tạo cặp token local kèm Session ─────────────────────
const createLocalTokens = async (userId, res, req = null, loginMethod = 'password') => {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // 1. Tạo Access token (7 ngày) - Chứa sessionId
    const accessToken = jwt.sign(
        { user_id: userId, session_id: sessionId },
        process.env.acc_secret,
        { expiresIn: '7d' }
    );

    // 2. Tạo Refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 3. Thu thập metadata phiên (fail-safe: login KHÔNG BAO GIỜ crash vì metadata)
    const meta = await buildSessionMeta(req);

    // 4. Tạo fingerprint thiết bị để xác định thiết bị cũ/mới
    const deviceFingerprint = generateDeviceFingerprint(meta.platform, meta.ua);

    let sessionData = {
        userId,
        sessionId,
        refreshToken,
        expiresAt,
        loginMethod,
        deviceName: meta.deviceName,
        platform: meta.platform,
        ipAddress: meta.ip,
        location: meta.location,
        userAgent: meta.ua,
        deviceFingerprint,
    };

    if (req) {
        // ── CHÍNH SÁCH QUẢN LÝ PHIÊN: THÂN AI NẤY LO (STRICT ISOLATION) ──
        try {
            const isMobile = meta.clientType === 'Mobile-App';
            
            // Tìm các phiên cũ CÙNG NHÓM để dọn dẹp
            const oldSessionsInGroup = await sessionModel.find({
                userId,
                isActive: true,
                platform: isMobile ? { $in: ['Android', 'iOS'] } : { $nin: ['Android', 'iOS'] }
            });

            if (oldSessionsInGroup.length > 0) {
                const oldIds = oldSessionsInGroup.map(s => s.sessionId);
                await sessionModel.updateMany(
                    { sessionId: { $in: oldIds } },
                    { isActive: false }
                );

                // Thông báo Real-time
                try {
                    const io = getIO();
                    const groupName = isMobile ? 'điện thoại' : 'trình duyệt';
                    oldIds.forEach(sid => {
                        io.to(`user:${userId}`).emit('session:terminated', { 
                            sessionId: sid,
                            reason: `Tài khoản vừa được đăng nhập trên một ${groupName} khác.` 
                        });
                    });
                } catch (e) {}
            }
        } catch (cleanError) {
            console.error('[Session Cleanup] Error:', cleanError.message);
        }
    }

    // Lưu Session mới
    await sessionModel.create(sessionData);

    // ── Thông báo nếu là thiết bị mới (fail-safe, không block login) ──
    await notifyNewDeviceLogin(userId, sessionData);

    // Thông báo Real-time về việc cập nhật danh sách session (Trì hoãn 1.5s cho ổn định)
    const userIdStr = String(userId);
    const roomName = `user:${userIdStr}`;
    setTimeout(() => {
        try {
            const io = getIO();
            io.to(roomName).emit('session:update');
            // Phát thêm sự kiện định danh cá nhân
            io.emit(`session:update:${userIdStr}`);
        } catch (e) {
            console.error('[Session] Created emit error:', e.message);
        }
    }, 500);

    // Backwards compatibility: Lưu vào authModel cũ nếu cần (hoặc skip nếu đã dùng sessionModel)
    await authModel.create({
        userId,
        refreshToken,
        expiresAt,
    });

    // Gửi refresh token qua cookie httpOnly (TUYỆT ĐỐI KHÔNG GỬI CHO MOBILE APP)
    const isMobileApp = meta.clientType === 'Mobile-App';

    if (!isMobileApp && ['Windows', 'macOS', 'Linux', 'Web'].includes(meta.platform)) {
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    return { accessToken, refreshToken, sessionId };
};

// ── Helper: Tạo thông báo khi phát hiện đăng nhập trên thiết bị mới ─────
// So sánh deviceFingerprint với các session cũ. Nếu chưa từng thấy → tạo notification.
// Bọc try-catch riêng: TUYỆT ĐỐI không block login nếu notification lỗi.
const notifyNewDeviceLogin = async (userId, sessionData) => {
    try {
        if (!sessionData.deviceFingerprint) return;

        // Tìm session cũ cùng fingerprint (bất kỳ, active hoặc inactive)
        const existingSession = await sessionModel.findOne({
            userId,
            deviceFingerprint: sessionData.deviceFingerprint,
            sessionId: { $ne: sessionData.sessionId }, // Loại trừ session vừa tạo
        });

        if (existingSession) {
            // Thiết bị cũ → không thông báo
            return;
        }

        // Thiết bị MỚI → tạo notification
        const timeStr = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        await createAndEmitNotification({
            userId,
            type: 'new_device_login',
            title: `Đăng nhập mới trên ${sessionData.deviceName || 'thiết bị không xác định'}`,
            body: `${sessionData.platform || 'Unknown'} • ${sessionData.location || 'Không rõ vị trí'} • ${timeStr}`,
            data: {
                sessionId: sessionData.sessionId,
                deviceName: sessionData.deviceName,
                platform: sessionData.platform,
                location: sessionData.location,
                loginMethod: sessionData.loginMethod,
            },
        });

        console.log(`[NewDeviceNotification] Đã tạo thông báo thiết bị mới cho user ${userId}`);
    } catch (err) {
        // Fail-safe: log lỗi nhưng KHÔNG throw, login vẫn thành công
        console.error('[NewDeviceNotification] Error (non-blocking):', err.message);
    }
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

        // Tạo tokens kèm Session
        const { accessToken, refreshToken, sessionId } = await createLocalTokens(userFind._id, res, req, 'password');

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            accessToken,
            refreshToken,
            sessionId,
            user: {
                _id: userFind._id,
                username: userFind.username || null,
                email: userFind.email,
                displayName: userFind.displayName,
                phone: userFind.phone || null,
                avatar: userFind.avatar || null,
                banner: userFind.banner || null,
                bio: userFind.bio || '',
                status: userFind.status || 'online',
                statusText: userFind.statusText || '',
                usernameColor: userFind.usernameColor || '#5865f2',
                themeName: userFind.themeName || 'dark',
                themeColors: userFind.themeColors || null,
                authProvider: userFind.authProvider,
                isEmailVerified: userFind.isEmailVerified,
                isPhoneVerified: userFind.isPhoneVerified,
                language: userFind.language || 'vi',
                createdAt: userFind.createdAt,
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
        // Ưu tiên sessionId gửi từ body (cho mobile) hoặc từ middleware (cho web/local)
        const sessionId = req.body.sessionId || req.sessionId;
        const userId = req.user?._id;

        // Vô hiệu hóa session hiện tại
        if (sessionId) {
            // Nếu có userId (đã xác thực), lọc theo userId cho an toàn. 
            // Nếu không có (token hết hạn), chỉ dựa vào sessionId (vẫn an toàn vì sessionId khó đoán)
            const query = userId ? { sessionId, userId } : { sessionId };
            const session = await sessionModel.findOneAndUpdate(query, { isActive: false });
            
            // Thông báo Real-time cho các thiết bị khác cập nhật danh sách
            const targetUserId = userId || session?.userId;
            if (targetUserId) {
                try {
                    const userIdStr = String(targetUserId);
                    const io = getIO();
                    io.to(`user:${userIdStr}`).emit('session:update');
                    // Tín hiệu định danh cá nhân
                    io.emit(`session:update:${userIdStr}`);
                } catch (e) {}
            }
        }

        const refreshToken = req.cookies.refreshToken;
        const ua = req.headers['user-agent'] || '';
        const clientType = req.headers['x-zolo-client'];
        const isMobileApp = clientType === 'Mobile-App' || (/Android|iPhone|iPad|iPod/i.test(ua) && !/Safari|Chrome|Firefox|Edg/i.test(ua));

        // Chỉ xóa cookie nếu:
        // 1. Yêu cầu KHÔNG đến từ Mobile App
        // 2. VÀ (Đây là yêu cầu đăng xuất chuẩn HOẶC sessionId khớp với session hiện tại)
        const isExplicitOtherSession = req.body.sessionId && req.body.sessionId !== req.sessionId;
        
        if (refreshToken && !isMobileApp && !isExplicitOtherSession) {
            // Xóa cookie
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });

            // Xóa trong DB authModel (nếu dùng local login)
            await authModel.findOneAndDelete({ refreshToken });
        }

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

        // Tìm sessionId tương ứng trong sessionModel để duy trì phiên
        let session = await sessionModel.findOne({ refreshToken });
        // Nếu session bị kick → không hồi sinh, session_id sẽ là null trong token mới

        const sessionId = (session && session.isActive) ? session.sessionId : null;

        // Tạo access token mới (7 ngày)
        const newAccessToken = jwt.sign(
            { user_id: user._id, session_id: sessionId },
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

        // ── Tạo Session cho OAuth User (dùng shared helper cho consistency) ──
        const crypto = require('crypto');
        const oauthMeta = await buildSessionMeta(req);

        // ── Quản lý chính sách: SAME-GROUP CLEANUP (dùng X-Zolo-Client) ──
        try {
            const isMobile = oauthMeta.clientType === 'Mobile-App';
            await sessionModel.updateMany(
                { 
                    userId: dbUser._id, 
                    platform: isMobile ? { $in: ['Android', 'iOS'] } : { $nin: ['Android', 'iOS'] }, 
                    isActive: true 
                },
                { isActive: false }
            );
        } catch (e) {
            console.error('[OAuth Session Cleanup] Error:', e.message);
        }

        const sessionId = crypto.randomBytes(16).toString('hex');
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Tạo fingerprint cho OAuth session
        const oauthFingerprint = generateDeviceFingerprint(oauthMeta.platform, oauthMeta.ua);

        const oauthSessionData = {
            userId: dbUser._id,
            sessionId,
            refreshToken,
            deviceName: oauthMeta.deviceName,
            platform: oauthMeta.platform,
            ipAddress: oauthMeta.ip,
            userAgent: oauthMeta.ua,
            location: oauthMeta.location,
            isActive: true,
            loginMethod: provider,
            expiresAt,
            deviceFingerprint: oauthFingerprint,
        };
        await sessionModel.create(oauthSessionData);

        // Thông báo nếu là thiết bị mới (fail-safe)
        await notifyNewDeviceLogin(dbUser._id, oauthSessionData);

        // Tạo record trong authModel để /auth/refreshme hoạt động
        await authModel.create({
            userId: dbUser._id,
            refreshToken,
            expiresAt,
        });

        // Gửi refreshToken cookie cho Web (KHÔNG gửi cho Mobile App)
        const isMobileApp = oauthMeta.clientType === 'Mobile-App';
        if (!isMobileApp) {
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        }

        // Thông báo Real-time
        const userIdStr = String(dbUser._id);
        const roomName = `user:${userIdStr}`;
        setTimeout(() => {
            try {
                const io = getIO();
                io.to(roomName).emit('session:update');
                io.emit(`session:update:${userIdStr}`);
            } catch (e) {
                console.error('[syncOAuth] Socket emit error:', e.message);
            }
        }, 1500);

        return res.status(200).json({
            message: 'Đồng bộ tài khoản thành công',
            sessionId, // Trả về sessionId để client lưu trữ
            user: {
                _id: dbUser._id,
                username: dbUser.username || null,
                email: dbUser.email,
                displayName: dbUser.displayName,
                phone: dbUser.phone || null,
                avatar: dbUser.avatar || null,
                banner: dbUser.banner || null,
                bio: dbUser.bio || '',
                status: dbUser.status || 'online',
                statusText: dbUser.statusText || '',
                usernameColor: dbUser.usernameColor || '#5865f2',
                themeName: dbUser.themeName || 'dark',
                themeColors: dbUser.themeColors || null,
                authProvider: dbUser.authProvider,
                isEmailVerified: dbUser.isEmailVerified,
                isPhoneVerified: dbUser.isPhoneVerified,
                language: dbUser.language || 'vi',
                createdAt: dbUser.createdAt,
            },
        });

    } catch (error) {
        console.error('syncOAuthUser error:', error.message);
        console.error('syncOAuthUser stack:', error.stack);
        return res.status(500).json({
            message: 'Lỗi server khi đồng bộ tài khoản',
            detail: error.message
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
                username: dbUser.username || null,
                email: dbUser.email,
                displayName: dbUser.displayName,
                phone: dbUser.phone || null,
                avatar: dbUser.avatar || null,
                banner: dbUser.banner || null,
                bio: dbUser.bio || '',
                status: dbUser.status || 'online',
                statusText: dbUser.statusText || '',
                usernameColor: dbUser.usernameColor || '#5865f2',
                themeName: dbUser.themeName || 'dark',
                themeColors: dbUser.themeColors || null,
                authProvider: dbUser.authProvider,
                isEmailVerified: dbUser.isEmailVerified,
                isPhoneVerified: dbUser.isPhoneVerified,
                language: dbUser.language || 'vi',
                createdAt: dbUser.createdAt,
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
                username: user.username || null,
                email: user.email,
                displayName: user.displayName,
                phone: user.phone || null,
                avatar: user.avatar || null,
                banner: user.banner || null,
                bio: user.bio || '',
                status: user.status || 'online',
                statusText: user.statusText || '',
                usernameColor: user.usernameColor || '#5865f2',
                themeName: user.themeName || 'dark',
                themeColors: user.themeColors || null,
                authProvider: user.authProvider,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                language: user.language || 'vi',
                createdAt: user.createdAt,
            },
        });

    } catch (error) {
        console.error('authMe error:', error.message);
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
    syncOAuthUser,
    completeOAuthProfile,
    authMe,
};
