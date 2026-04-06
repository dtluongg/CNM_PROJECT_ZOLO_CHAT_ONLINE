const express = require('express');
const router = express.Router();
const {
	signup,
	signin,
	signout,
	getNewAccessToken,
	changePassword,
	forgotPassword,
	resetPassword,
} = require('../controllers/userController');
const verifyLocalToken = require('../middlewares/verifyLocalToken');

// ── Đăng ký tài khoản local ──────────────────────────────────────
// Body: { username, password, email, firstName, lastName, phone?, emailOtp, phoneOtp? }
router.post('/signup', signup);

// ── Đăng nhập local ──────────────────────────────────────────────
// Body: { username, password }  (username có thể là email)
router.post('/signin', signin);

// ── Đăng xuất ────────────────────────────────────────────────────
// Cookie: refreshToken
router.post('/signout', signout);

// ── Lấy access token mới bằng refresh token ──────────────────────
// Cookie: refreshToken
router.post('/refreshme', getNewAccessToken);

// ── Đổi mật khẩu (yêu cầu đang đăng nhập local) ──────────────────
// Header: Authorization: Bearer <accessToken>
// Body: { oldPassword, newPassword }
router.post('/change-password', verifyLocalToken, changePassword);

// ── Quên mật khẩu: gửi OTP về email ─────────────────────────────
// Body: { username }  (username hoặc email)
router.post('/forgot-password', forgotPassword);

// ── Quên mật khẩu: đặt lại mật khẩu bằng OTP ────────────────────
// Body: { username, otp, newPassword }
router.post('/reset-password', resetPassword);

module.exports = router;