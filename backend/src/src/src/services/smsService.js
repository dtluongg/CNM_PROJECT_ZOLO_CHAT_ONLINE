const twilio = require('twilio');

// ── Kiểm tra cấu hình khi khởi động ──────────────────────────────
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[Twilio] ⚠️  Thiếu TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER trong .env');
}

const getClient = () => twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ── Chuẩn hóa số điện thoại VN sang E.164 (+84...) ───────────────
const normalizePhone = (phone) => {
    // Xóa mọi ký tự không phải số và dấu +
    const cleaned = phone.replace(/[^\d+]/g, '');
    const digits = cleaned.replace(/\D/g, ''); // chỉ lấy số

    // Đã có +84 hoặc 84 ở đầu
    if (digits.startsWith('84') && digits.length === 11) return '+' + digits;
    // Số VN dạng 0xxxxxxxxx (10 chữ số)
    if (digits.startsWith('0') && digits.length === 10) return '+84' + digits.slice(1);
    // Trường hợp nhập 9 chữ số không có đầu số quốc gia
    if (digits.length === 9) return '+84' + digits;

    throw new Error(`Số điện thoại không đúng định dạng VN: "${phone}" (cần 10 chữ số, VD: 0912345678)`);
};

// ── Gửi OTP qua Twilio SMS ────────────────────────────────────────
const sendOtpSms = async (phone, otp) => {
    const to = normalizePhone(phone);
    console.log(`[Twilio] Gửi OTP tới: ${to} (input gốc: "${phone}")`);

    const content = `[ZoloChat] Ma OTP cua ban la: ${otp}. Hieu luc 5 phut. Khong chia se ma nay cho bat ky ai.`;

    try {
        const message = await getClient().messages.create({
            body: content,
            from: process.env.TWILIO_PHONE_NUMBER,
            to,
        });
        console.log(`📱 OTP SMS gửi tới ${to} — SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (err) {
        console.error(`[Twilio] Lỗi gửi tới ${to}:`, err.message);
        if (err.code === 21608) throw new Error(`Số ${to} chưa được verify trong Twilio trial. Thêm tại: twilio.com/console/phone-numbers/verified`);
        if (err.code === 21211) throw new Error(`Số điện thoại ${to} không hợp lệ với Twilio`);
        throw new Error(err.message);
    }
};

// ── Kiểm tra số dư tài khoản Twilio ──────────────────────────────
const checkBalance = async () => {
    const balance = await getClient().balance.fetch();
    return { balance: balance.balance, currency: balance.currency };
};

module.exports = { sendOtpSms, checkBalance, normalizePhone };
