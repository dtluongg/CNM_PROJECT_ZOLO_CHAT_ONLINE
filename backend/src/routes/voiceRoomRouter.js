const express    = require('express');
const router     = express.Router();
const verifyToken = require('../middlewares/verifytoken');
const {
  createVoiceRoom,
  joinVoiceRoom,
  leaveVoiceRoom,
  getVoiceRoomStatus,
  getVoiceRoomStatusBatch,
} = require('../controllers/voiceRoomController');

router.use(verifyToken);

router.post('/create',        createVoiceRoom);
router.post('/join',          joinVoiceRoom);
router.post('/leave',         leaveVoiceRoom);
router.get('/status',         getVoiceRoomStatus);
router.get('/status-batch',   getVoiceRoomStatusBatch);

module.exports = router;
