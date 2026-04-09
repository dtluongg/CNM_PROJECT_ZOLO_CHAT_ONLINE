const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');

const {
    updateProfile,
    searchUsers,
    getPublicProfile,
} = require('../controllers/userController');

// ════════════════════════════════════════════════════════════════
//  UPDATE PROFILE (avatar, displayName, bio, banner, themes...)
// ════════════════════════════════════════════════════════════════
router.patch('/update-profile', verifyToken, updateProfile);

// ════════════════════════════════════════════════════════════════
//  TÌM KIẾM USER
// ════════════════════════════════════════════════════════════════
router.get('/search', verifyToken, searchUsers);

// ════════════════════════════════════════════════════════════════
//  PUBLIC PROFILE - Cho người dùng khác xem hồ sơ
// ════════════════════════════════════════════════════════════════
router.get('/:userId/profile', verifyToken, getPublicProfile);

module.exports = router;