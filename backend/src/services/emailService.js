const nodemailer = require('nodemailer');

// ── Khởi tạo transporter Gmail ───────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// Kiểm tra kết nối khi khởi động
transporter.verify((error) => {
    if (error) {
        console.warn('⚠️  Gmail transporter lỗi:', error.message);
    } else {
        console.log('✅ Gmail transporter sẵn sàng');
    }
});

// ── Gửi OTP qua email ────────────────────────────────────────────
const sendOtpEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: `"ZoloChat" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `[ZoloChat] Mã xác thực OTP của bạn`,
        html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
                <tr>
                    <td align="center">
                        <table width="500" cellpadding="0" cellspacing="0"
                               style="background:#ffffff;border-radius:12px;overflow:hidden;
                                      box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background:linear-gradient(135deg,#0068FF,#0047CC);
                                           padding:32px;text-align:center;">
                                    <h1 style="margin:0;color:#ffffff;font-size:28px;
                                               letter-spacing:2px;">ZoloChat</h1>
                                </td>
                            </tr>
                            <!-- Body -->
                            <tr>
                                <td style="padding:40px 48px;">
                                    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">
                                        Xác thực tài khoản
                                    </h2>
                                    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                                        Chào bạn,<br>
                                        Đây là mã OTP để xác thực tài khoản ZoloChat của bạn:
                                    </p>
                                    <!-- OTP Box -->
                                    <div style="background:#f0f5ff;border:2px dashed #0068FF;
                                                border-radius:12px;padding:24px;text-align:center;
                                                margin:0 0 24px;">
                                        <div style="font-size:42px;font-weight:700;
                                                    letter-spacing:16px;color:#0068FF;
                                                    font-family:'Courier New',monospace;">
                                            ${otp}
                                        </div>
                                    </div>
                                    <p style="margin:0 0 8px;color:#555;font-size:14px;">
                                        ⏰ Mã có hiệu lực trong <strong>5 phút</strong>
                                    </p>
                                    <p style="margin:0 0 8px;color:#555;font-size:14px;">
                                        🔒 Không chia sẻ mã này với bất kỳ ai
                                    </p>
                                    <p style="margin:24px 0 0;color:#aaa;font-size:12px;
                                               border-top:1px solid #eee;padding-top:16px;">
                                        Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.
                                        Tài khoản của bạn vẫn an toàn.
                                    </p>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background:#f9f9f9;padding:20px;text-align:center;">
                                    <p style="margin:0;color:#aaa;font-size:12px;">
                                        © ${new Date().getFullYear()} ZoloChat. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 OTP email đã gửi tới ${toEmail} (ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error('Lỗi gửi email OTP:', error.message);
        throw new Error('Không thể gửi email OTP, vui lòng thử lại');
    }
};

// ── Gửi email thông báo khóa tài khoản ──────────────────────────
const sendBanEmail = async (toEmail, displayName, reason) => {
    const mailOptions = {
        from: `"ZoloChat" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `[ZoloChat] Tài khoản của bạn đã bị khóa`,
        html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
                <tr><td align="center">
                    <table width="500" cellpadding="0" cellspacing="0"
                           style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="background:linear-gradient(135deg,#ed4245,#c23236);padding:32px;text-align:center;">
                                <h1 style="margin:0;color:#fff;font-size:24px;">🔒 ZoloChat</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:40px 48px;">
                                <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;">Tài khoản bị khóa</h2>
                                <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
                                    Xin chào <strong>${displayName}</strong>,<br>
                                    Tài khoản ZoloChat của bạn đã bị <strong>khóa tạm thời</strong> bởi đội ngũ quản trị.
                                </p>
                                <div style="background:#fff5f5;border-left:4px solid #ed4245;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
                                    <div style="font-size:12px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Lý do</div>
                                    <div style="color:#1a1a1a;font-size:15px;font-weight:600;">${reason}</div>
                                </div>
                                <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.6;">
                                    Nếu bạn cho rằng đây là nhầm lẫn hoặc muốn khiếu nại, hãy liên hệ đội ngũ hỗ trợ:
                                </p>
                                <p style="margin:0 0 24px;">
                                    <a href="mailto:${process.env.GMAIL_USER}" style="color:#0068FF;font-size:14px;">${process.env.GMAIL_USER}</a>
                                </p>
                                <p style="margin:0;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
                                    Email này được gửi tự động. Vui lòng không trả lời trực tiếp email này.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background:#f9f9f9;padding:20px;text-align:center;">
                                <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} ZoloChat. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Ban email đã gửi tới ${toEmail}`);
        return true;
    } catch (error) {
        console.error('Lỗi gửi ban email:', error.message);
        return false;
    }
};

// ── Gửi email thông báo kết quả xử lý báo cáo ───────────────────
const sendReportResolvedEmail = async (toEmail, displayName, status, adminNote, targetSnapshot) => {
    const isResolved = status === 'resolved';
    const statusText = isResolved ? 'Đã xử lý vi phạm' : 'Đã xem xét báo cáo';
    const headerColor = isResolved ? '#3ba55c' : '#faa61a';
    const bodyText = isResolved
        ? 'Chúng tôi đã xem xét báo cáo của bạn và xác nhận có vi phạm. Hành động phù hợp đã được thực hiện.'
        : 'Chúng tôi đã xem xét báo cáo của bạn. Sau khi kiểm tra, chúng tôi không tìm thấy vi phạm rõ ràng trong nội dung này.';

    const mailOptions = {
        from: `"ZoloChat" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `[ZoloChat] Cập nhật báo cáo của bạn`,
        html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
                <tr><td align="center">
                    <table width="500" cellpadding="0" cellspacing="0"
                           style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="background:linear-gradient(135deg,${headerColor},${headerColor}cc);padding:32px;text-align:center;">
                                <h1 style="margin:0;color:#fff;font-size:24px;">✅ ZoloChat</h1>
                                <p style="margin:8px 0 0;color:#ffffffcc;font-size:14px;">${statusText}</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:40px 48px;">
                                <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
                                    Xin chào <strong>${displayName}</strong>,
                                </p>
                                <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">${bodyText}</p>
                                ${targetSnapshot ? `
                                <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
                                    <div style="font-size:11px;color:#999;margin-bottom:4px;">Nội dung bị báo cáo</div>
                                    <div style="color:#333;font-size:14px;">${targetSnapshot}</div>
                                </div>` : ''}
                                ${adminNote ? `
                                <div style="background:#f0f8ff;border-left:4px solid #0068FF;border-radius:4px;padding:12px 16px;margin:0 0 20px;">
                                    <div style="font-size:11px;color:#0068FF;margin-bottom:4px;font-weight:700;">GHI CHÚ TỪ QUẢN TRỊ VIÊN</div>
                                    <div style="color:#333;font-size:14px;">${adminNote}</div>
                                </div>` : ''}
                                <p style="margin:0;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
                                    Cảm ơn bạn đã giúp ZoloChat trở nên an toàn hơn.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background:#f9f9f9;padding:20px;text-align:center;">
                                <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} ZoloChat. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Lỗi gửi report-resolved email:', error.message);
        return false;
    }
};

module.exports = { sendOtpEmail, sendBanEmail, sendReportResolvedEmail };