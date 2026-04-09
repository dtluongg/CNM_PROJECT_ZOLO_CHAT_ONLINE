const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    isMuted: { type: Boolean, default: false },
    muteUntil: { type: Date, default: null }, // Có thể tắt trong 1 thời gian cụ thể
    mentionConfig: { type: String, enum: ['all', 'mentions_only', 'none'], default: 'all' },
    pushEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationSettingSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('NotificationSetting', notificationSettingSchema);
