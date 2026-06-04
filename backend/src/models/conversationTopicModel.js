const mongoose = require('mongoose');

const conversationTopicSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    name: { type: String, required: true, maxlength: 80 },
    emoji: { type: String, default: '💬' },
    categoryName: { type: String, default: '' },
    position: { type: Number, default: 0 },
    channelType: { type: String, enum: ['text', 'voice', 'system'], default: 'text' },
    isLocked: { type: Boolean, default: false },
    description: { type: String, default: '', maxlength: 200 },
    // Kênh riêng tư: chỉ owner/admin và các role được chỉ định mới truy cập.
    isPrivate: { type: Boolean, default: false },
    allowedRoleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GroupRole' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

conversationTopicSchema.index({ conversationId: 1, position: 1 });

module.exports = mongoose.model('ConversationTopic', conversationTopicSchema);