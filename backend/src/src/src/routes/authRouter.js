const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');

const {
    syncOAuthUser,
    completeOAuthProfile,
    authMe,
    updateProfile,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    getSmsBalance,
} = require('../controllers/authController');

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
//  UPDATE PROFILE (avatar, displayName)
// ════════════════════════════════════════════════════════════════
router.patch('/update-profile', verifyToken, updateProfile);

// ════════════════════════════════════════════════════════════════
//  EMAIL OTP
// ════════════════════════════════════════════════════════════════
router.post('/send-email-otp', sendEmailOtp);
router.post('/verify-email-otp', verifyEmailOtp);

// ════════════════════════════════════════════════════════════════
//  PHONE OTP
// ════════════════════════════════════════════════════════════════
router.post('/send-phone-otp', sendPhoneOtp);
router.post('/verify-phone-otp', verifyToken, verifyPhoneOtp); // ✅ Thêm verifyToken

// ════════════════════════════════════════════════════════════════
//  TIỆN ÍCH
// ════════════════════════════════════════════════════════════════
router.get('/sms-balance', verifyToken, getSmsBalance);

module.exports = router;