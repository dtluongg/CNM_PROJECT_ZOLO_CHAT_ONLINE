const express = require('express');
const router  = express.Router();
const authMiddleware            = require('../middlewares/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middlewares/requireAdmin');
const adminController           = require('../controllers/adminController');

// Tất cả route đều cần đăng nhập + ít nhất moderator
router.use(authMiddleware, requireAdmin);

// Stats & system
router.get('/stats', adminController.getStats);

// User management
router.get('/users',              adminController.listUsers);
router.get('/users/:id',          adminController.getUser);
router.patch('/users/:id/ban',    adminController.banUser);
router.patch('/users/:id/unban',  adminController.unbanUser);
router.patch('/users/:id/role',   requireSuperAdmin, adminController.changeRole);
router.delete('/users/:id',       requireSuperAdmin, adminController.deleteUser);

// Reports
router.get('/reports',                              adminController.listReports);
router.patch('/reports/:id',                        adminController.updateReport);
router.get('/reports/target/:targetType/:targetId', adminController.getReportTarget);
router.patch('/reports/ban-user/:userId',           adminController.banFromReport);

module.exports = router;