const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifytoken');
const sessionController = require('../controllers/sessionController');

// Tất cả các route này yêu cầu đăng nhập
router.use(verifyToken);

router.get('/list', sessionController.listSessions);
router.post('/logout-session', sessionController.logoutSession);
router.post('/logout-others', sessionController.logoutAllOthers);

module.exports = router;
