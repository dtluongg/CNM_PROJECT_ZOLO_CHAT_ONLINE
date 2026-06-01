const express      = require('express');
const router       = express.Router();
const verifyToken  = require('../middlewares/verifytoken');
const {
  getActiveGroupCall,
  getGroupCallToken,
  getGroupCallHistory,
} = require('../controllers/groupCallController');

router.use(verifyToken);

router.get('/active',   getActiveGroupCall);
router.post('/token',   getGroupCallToken);
router.get('/history',  getGroupCallHistory);

module.exports = router;