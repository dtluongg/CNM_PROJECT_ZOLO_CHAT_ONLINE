const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifytoken');

const {
    listMyNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationSetting,
    upsertNotificationSetting,
} = require('../controllers/notificationController');

router.use(verifyToken);

router.get('/', listMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

router.get('/settings/:conversationId', getNotificationSetting);
router.patch('/settings/:conversationId', upsertNotificationSetting);

module.exports = router;
