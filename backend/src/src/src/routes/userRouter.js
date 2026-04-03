const express = require('express');
const router = express.Router();
const { signup, signin, signout, getNewAccessToken } = require('../controllers/userController');
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

module.exports = router;