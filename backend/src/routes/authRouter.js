const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const verifyLocalToken = require('../middlewares/verifyLocalToken');

const {
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
} = require('../controllers/authController');

const {
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    getSmsBalance,
} = require('../controllers/otpController');

// ── Đăng ký tài khoản local ──────────────────────────────────────
router.post('/signup', signup);

// ── Đăng nhập local ──────────────────────────────────────────────
router.post('/signin', signin);

// ── Đăng xuất ────────────────────────────────────────────────────
router.post('/signout', signout);

// ── Lấy access token mới bằng refresh token ──────────────────────
router.post('/refreshme', getNewAccessToken);

// ── Đổi mật khẩu (yêu cầu đang đăng nhập local) ──────────────────
router.post('/change-password', verifyLocalToken, changePassword);

// ── Quên mật khẩu ────────────────────────────────────────────────
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ════════════════════════════════════════════════════════════════
//  SUPABASE OAUTH
// ════════════════════════════════════════════════════════════════
router.post('/sync-oauth', syncOAuthUser);
router.post('/complete-oauth-profile', completeOAuthProfile);

// ════════════════════════════════════════════════════════════════
//  AUTH ME
// ════════════════════════════════════════════════════════════════
router.get('/authme', verifyToken, authMe);

// ════════════════════════════════════════════════════════════════
//  OTP
// ════════════════════════════════════════════════════════════════
router.post('/send-email-otp', sendEmailOtp);
router.post('/verify-email-otp', verifyEmailOtp);

router.post('/send-phone-otp', sendPhoneOtp);
router.post('/verify-phone-otp', verifyToken, verifyPhoneOtp);

// ════════════════════════════════════════════════════════════════
//  TIỆN ÍCH
// ════════════════════════════════════════════════════════════════
router.get('/sms-balance', verifyToken, getSmsBalance);

module.exports = router;