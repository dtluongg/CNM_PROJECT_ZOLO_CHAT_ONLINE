const userModel = require('../models/userModel');
const { saveOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const { sendOtpSms, checkBalance } = require('../services/smsService');

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

        // Gửi SMS qua SpeedSMS/Twilio
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
//  TIỆN ÍCH SMS
// ════════════════════════════════════════════════════════════════

// Kiểm tra số dư (chỉ dùng nội bộ/admin)
const getSmsBalance = async (req, res) => {
    try {
        const balance = await checkBalance();
        return res.status(200).json(balance);
    } catch (error) {
        return res.status(500).json({ message: 'Không thể kiểm tra số dư Twilio/SMS' });
    }
};

module.exports = {
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    getSmsBalance,
};
