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
            { returnDocument: 'after' }
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

        // 1. CHỈNH SỬA QUAN TRỌNG: Lấy đúng 'muteUntil' từ Frontend gửi lên, xóa bỏ 'minutes'
        const { isMuted, muteUntil, mentionConfig, pushEnabled } = req.body;
        const updates = {};

        if (!isValidObjectId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        // 2. Xử lý isMuted
        if (isMuted !== undefined) {
            if (typeof isMuted !== 'boolean') {
                return res.status(400).json({ message: 'isMuted phải là boolean' });
            }
            updates.isMuted = isMuted;

            // Nếu MỞ LẠI thông báo, tự động xóa mốc thời gian
            if (isMuted === false) {
                updates.muteUntil = null;
            }
        }

        // 3. Xử lý muteUntil (Chỉ cập nhật nếu isMuted là true)
        if (muteUntil !== undefined) {
            if (muteUntil === null || muteUntil === '') {
                updates.muteUntil = null;
            } else {
                const parsed = new Date(muteUntil);
                if (Number.isNaN(parsed.getTime())) {
                    return res.status(400).json({ message: 'muteUntil không hợp lệ' });
                }
                // Nếu user tắt thông báo, lưu mốc thời gian này vào
                if (updates.muteUntil !== null) {
                    updates.muteUntil = parsed;
                }
            }
        }

        // 4. Xử lý pushEnabled
        if (pushEnabled !== undefined) {
            updates.pushEnabled = pushEnabled === true;
        }

        if (mentionConfig !== undefined) {
            updates.mentionConfig = mentionConfig;
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
        }

        // 6. Lưu vào Database
        const setting = await NotificationSetting.findOneAndUpdate(
            { userId: req.user._id, conversationId },
            { $set: updates },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            message: 'Cập nhật cài đặt thông báo thành công',
            data: setting,
        });
    } catch (error) {
        console.error("Lỗi Controller upsertNotificationSetting:", error);
        next(error);
    }
};
/**
 * Xử lý tạo thông báo khi có người bị tag (Mention)
 * Chặn hoàn toàn nếu người nhận đang bật chế độ Mute
 */
const handleMentionsNotification = async ({ senderId, conversationId, messageId, mentions }) => {
    try {
        const now = new Date();

        for (const userId of mentions) {
            // 1. Bỏ qua nếu tự tag chính mình
            if (userId.toString() === senderId.toString()) continue;

            // 2. Kiểm tra cài đặt thông báo của user bị tag trong hội thoại này
            const setting = await NotificationSetting.findOne({ userId, conversationId }).lean();

            if (setting) {
                // Kiểm tra các trường hợp đang bị Mute
                const isMutedForever = setting.isMuted && setting.muteUntil === null;
                const isMutedTemporarily = setting.isMuted && setting.muteUntil && new Date(setting.muteUntil) > now;
                const isMentionDisabled = setting.mentionConfig === 'none';

                // Nếu rơi vào 1 trong 3 trường hợp trên -> Chặn hoàn toàn, không tạo thông báo
                if (isMutedForever || isMutedTemporarily || isMentionDisabled) {
                    console.log(`[Notification] Bỏ qua gửi thông báo tag cho user ${userId} do đang tắt thông báo.`);
                    continue;
                }
            }

            // 3. Đủ điều kiện nhận -> Lưu thông báo vào Database
            await Notification.create({
                userId: userId,
                actorId: senderId,
                type: 'mention',
                conversationId: conversationId,
                messageId: messageId,
                content: 'đã nhắc đến bạn trong một tin nhắn',
                isRead: false
            });

            // 4. Cập nhật số lượng Unread qua Socket (Gọi hàm bạn đã viết)
            if (typeof exports.emitUnreadCount === 'function') {
                await exports.emitUnreadCount(userId);
            }
        }
    } catch (error) {
        console.error('Lỗi khi xử lý handleMentionsNotification:', error);
    }
};
module.exports = {
    listMyNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationSetting,
    upsertNotificationSetting,
    handleMentionsNotification,
};