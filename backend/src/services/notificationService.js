const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const NotificationSetting = require('../models/notificationSettingModel');
const User = require('../models/userModel');
const { getIO } = require('../socket/socketManager');

const toStr = (v) => (v === undefined || v === null ? '' : v.toString());

const normalizeBody = (text, max = 160) => {
    const value = toStr(text).trim();
    if (!value) return '';
    return value.length > max ? `${value.slice(0, max)}...` : value;
};

const isMentioned = (messageContent, recipientUser) => {
    const content = toStr(messageContent);
    if (!content) return false;

    const lowered = content.toLowerCase();
    if (lowered.includes('@all')) return true;

    const username = toStr(recipientUser?.username).trim();
    if (!username) return false;

    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionRegex = new RegExp(`(^|\\s)@${escaped}(\\b|\\s|$)`, 'i');
    return mentionRegex.test(content);
};

const canReceiveMessageNotification = ({ setting, messageContent, recipientUser }) => {
    if (!setting) return true;

    if (setting.pushEnabled === false) return false;

    const now = new Date();
    if (setting.isMuted) {
        if (!setting.muteUntil) return false;
        if (new Date(setting.muteUntil) > now) return false;
    }

    if (setting.mentionConfig === 'none') return false;
    if (setting.mentionConfig === 'mentions_only') {
        return isMentioned(messageContent, recipientUser);
    }

    return true;
};

const emitNotification = (notificationDoc) => {
    try {
        const io = getIO();
        io.to(`user:${notificationDoc.userId.toString()}`).emit('notifications:new', {
            notification: notificationDoc,
        });
    } catch (_) {
        // Socket có thể chưa khởi tạo trong môi trường test.
    }
};

const emitUnreadCount = async (userId) => {
    try {
        const io = getIO();
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });
        io.to(`user:${userId.toString()}`).emit('notifications:unread-count', { unreadCount });
    } catch (_) {
        // Ignore socket errors.
    }
};

const createAndEmitNotification = async ({
    userId,
    actorId = null,
    type,
    title,
    body = '',
    conversationId = null,
    messageId = null,
    friendRequestId = null,
    callId = null,
    data = {},
}) => {
    const notification = await Notification.create({
        userId,
        actorId,
        type,
        title,
        body,
        conversationId,
        messageId,
        friendRequestId,
        callId,
        data,
    });

    emitNotification(notification);
    await emitUnreadCount(userId);
    return notification;
};

const notifyNewMessage = async ({
    conversationId,
    messageId,
    senderId,
    senderName,
    messageType,
    messageContent,
    recipientIds,
}) => {
    const uniqueRecipientIds = [...new Set((recipientIds || []).map((id) => toStr(id)).filter(Boolean))]
        .filter((id) => id !== toStr(senderId));

    if (!uniqueRecipientIds.length) return [];

    const [settings, users] = await Promise.all([
        NotificationSetting.find({
            userId: { $in: uniqueRecipientIds },
            conversationId,
        }).lean(),
        User.find({ _id: { $in: uniqueRecipientIds } }).select('_id username').lean(),
    ]);

    const settingMap = new Map(settings.map((s) => [toStr(s.userId), s]));
    const userMap = new Map(users.map((u) => [toStr(u._id), u]));

    const title = `${senderName || 'Ai đó'} đã gửi một tin nhắn mới`;
    const body =
        messageType === 'text'
            ? normalizeBody(messageContent)
            : messageType === 'voice'
                ? '[Tin nhắn thoại]'
                : messageType === 'image'
                    ? '[Hình ảnh]'
                    : '[Tệp đính kèm]';

    const docs = [];
    for (const recipientId of uniqueRecipientIds) {
        const setting = settingMap.get(recipientId) || null;
        const recipientUser = userMap.get(recipientId) || null;

        const allowed = canReceiveMessageNotification({
            setting,
            messageContent,
            recipientUser,
        });

        if (!allowed) continue;

        docs.push({
            userId: new mongoose.Types.ObjectId(recipientId),
            actorId: senderId,
            type: 'message',
            title,
            body,
            conversationId,
            messageId,
            data: {
                messageType,
            },
        });
    }

    if (!docs.length) return [];

    const created = await Notification.insertMany(docs, { ordered: false });

    for (const item of created) {
        emitNotification(item);
        await emitUnreadCount(item.userId);
    }

    return created;
};
const handleMentionsNotification = async ({ senderId, conversationId, messageId, mentions }) => {
    try {
        const now = new Date();
        for (const userId of mentions) {
            if (userId.toString() === senderId.toString()) continue;

            const setting = await NotificationSetting.findOne({ userId, conversationId }).lean();

            // Áp dụng logic chặn: Nếu đang Mute thì "continue" (bỏ qua không tạo thông báo)
            if (setting && setting.isMuted) {
                if (!setting.muteUntil || new Date(setting.muteUntil) > now) {
                    continue;
                }
            }

            // Nếu thoát được "lưới lọc" ở trên thì mới tạo thông báo
            await Notification.create({
                userId, actorId: senderId, type: 'mention',
                conversationId, messageId, title: 'Bạn có lượt nhắc tên mới',
                body: 'Ai đó đã nhắc đến bạn', isRead: false
            });

            await emitUnreadCount(userId);
        }
    } catch (error) {
        console.error('Lỗi handleMentionsNotification:', error);
    }
};
module.exports = {
    createAndEmitNotification,
    notifyNewMessage,
    emitUnreadCount,
    canReceiveMessageNotification,
    handleMentionsNotification,
};
