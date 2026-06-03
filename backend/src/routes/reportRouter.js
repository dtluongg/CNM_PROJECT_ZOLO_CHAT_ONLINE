const express = require('express');
const router  = express.Router();
const authMiddleware  = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

// Any logged-in user can file a report
router.post('/', authMiddleware, adminController.createReport);

module.exports = router;