const otpModel = require('../models/otpModel');

const MAX_ATTEMPTS = 5;           // Số lần thử sai tối đa
const OTP_EXPIRE_MINUTES = 5;     // OTP hết hạn sau 5 phút
const RESEND_COOLDOWN_SECONDS = 60; // Phải chờ 60s mới được gửi lại

// ── Tạo OTP ngẫu nhiên 6 số ──────────────────────────────────────
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ── Lưu OTP mới vào DB ───────────────────────────────────────────
const saveOtp = async (target, type) => {
    // Kiểm tra cooldown: nếu OTP cũ còn < 4 phút sống → chưa đủ 60s
    const existing = await otpModel.findOne({ target, type, verified: false });
    if (existing) {
        const secondsSinceCreated = (Date.now() - existing.createdAt.getTime()) / 1000;
        if (secondsSinceCreated < RESEND_COOLDOWN_SECONDS) {
            const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
            throw new Error(`Vui lòng chờ ${waitSeconds}s trước khi gửi lại OTP`);
        }
    }

    // Xóa OTP cũ của cùng target+type
    await otpModel.deleteMany({ target, type });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

    await otpModel.create({ target, type, otp, expiresAt });

    return otp;
};

// ── Xác minh OTP ─────────────────────────────────────────────────
const verifyOtp = async (target, type, inputOtp) => {
    const otpRecord = await otpModel.findOne({
        target,
        type,
        verified: false,
        expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
        return { success: false, message: 'OTP không tồn tại hoặc đã hết hạn' };
    }

    // Kiểm tra số lần thử
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
        await otpModel.deleteOne({ _id: otpRecord._id });
        return { success: false, message: 'Đã nhập sai quá nhiều lần, vui lòng yêu cầu OTP mới' };
    }

    if (otpRecord.otp !== inputOtp) {
        // Tăng số lần thử sai
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = MAX_ATTEMPTS - otpRecord.attempts;
        return { success: false, message: `OTP không đúng. Còn ${remaining} lần thử` };
    }

    // OTP đúng → đánh dấu đã dùng
    otpRecord.verified = true;
    await otpRecord.save();

    return { success: true, message: 'Xác thực thành công' };
};

module.exports = { saveOtp, verifyOtp };