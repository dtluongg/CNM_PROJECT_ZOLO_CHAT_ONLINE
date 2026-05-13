const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        type: {
            type: String,
            enum: [
                'message',
                'mention',
                'reminder',
                'friend_request',
                'friend_accepted',
                'call_incoming',
                'call_rejected',
                'call_missed',
                'new_device_login',
            ],
            required: true,
        },
        title: { type: String, required: true, trim: true },
        body: { type: String, default: '', trim: true },
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            default: null,
        },
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null,
        },
        friendRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FriendRequest',
            default: null,
        },
        callId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Call',
            default: null,
        },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
        isRead: { type: Boolean, default: false, index: true },
        readAt: { type: Date, default: null },
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
