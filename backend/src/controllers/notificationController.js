const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const NotificationSetting = require('../models/notificationSettingModel');
const { emitUnreadCount } = require('../services/notificationService');

const isValidObjectId = (id) => id && mongoose.Types.ObjectId.isValid(id);

const listMyNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const cursor = req.query.cursor;
        const unreadOnly = (req.query.unreadOnly || 'false').toString().toLowerCase() === 'true';
        const type = req.query.type ? req.query.type.toString() : null;

        const filter = { userId };
        if (unreadOnly) filter.isRead = false;
        if (type) filter.type = type;
        if (cursor && isValidObjectId(cursor)) {
            filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
        }

        const notifications = await Notification.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate('actorId', 'displayName avatar username')
            .lean();

        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        return res.status(200).json({
            data: notifications,
            meta: {
                hasMore: notifications.length === limit,
                nextCursor: notifications.length ? notifications[notifications.length - 1]._id : null,
                unreadCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            isRead: false,
        });
        return res.status(200).json({ unreadCount });
    } catch (error) {
        next(error);
    }
};

const markNotificationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'notificationId không hợp lệ' });
        }

        const doc = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }

        await emitUnreadCount(req.user._id);

        return res.status(200).json({
            message: 'Đã đánh dấu đã đọc',
            data: doc,
        });
    } catch (error) {
        next(error);
    }
};

const markAllNotificationsAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        await emitUnreadCount(req.user._id);

        return res.status(200).json({ message: 'Đã đánh dấu tất cả là đã đọc' });
    } catch (error) {
        next(error);
    }
};

const getNotificationSetting = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        if (!isValidObjectId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        let setting = await NotificationSetting.findOne({
            userId: req.user._id,
            conversationId,
        }).lean();

        if (!setting) {
            setting = {
                userId: req.user._id,
                conversationId,
                isMuted: false,
                muteUntil: null,
                mentionConfig: 'all',
                pushEnabled: true,
            };
        }

        return res.status(200).json({ data: setting });
    } catch (error) {
        next(error);
    }
};

const upsertNotificationSetting = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        if (!isValidObjectId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        const { isMuted, muteUntil, mentionConfig, pushEnabled } = req.body;
        const updates = {};

        if (isMuted !== undefined) {
            if (typeof isMuted !== 'boolean') {
                return res.status(400).json({ message: 'isMuted phải là boolean' });
            }
            updates.isMuted = isMuted;
        }

        if (pushEnabled !== undefined) {
            if (typeof pushEnabled !== 'boolean') {
                return res.status(400).json({ message: 'pushEnabled phải là boolean' });
            }
            updates.pushEnabled = pushEnabled;
        }

        if (mentionConfig !== undefined) {
            if (!['all', 'mentions_only', 'none'].includes(mentionConfig)) {
                return res.status(400).json({ message: 'mentionConfig không hợp lệ' });
            }
            updates.mentionConfig = mentionConfig;
        }

        if (muteUntil !== undefined) {
            if (muteUntil === null || muteUntil === '') {
                updates.muteUntil = null;
            } else {
                const parsed = new Date(muteUntil);
                if (Number.isNaN(parsed.getTime())) {
                    return res.status(400).json({ message: 'muteUntil không hợp lệ' });
                }
                updates.muteUntil = parsed;
            }
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
        }

        const setting = await NotificationSetting.findOneAndUpdate(
            { userId: req.user._id, conversationId },
            { $set: updates },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            message: 'Cập nhật cài đặt thông báo thành công',
            data: setting,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listMyNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationSetting,
    upsertNotificationSetting,
};
