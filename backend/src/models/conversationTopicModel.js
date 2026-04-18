const mongoose = require('mongoose');

const conversationTopicSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    name: { type: String, required: true, maxlength: 80 },
    emoji: { type: String, default: '💬' },
    categoryName: { type: String, default: '' },
    position: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    description: { type: String, default: '', maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

conversationTopicSchema.index({ conversationId: 1, position: 1 });

module.exports = mongoose.model('ConversationTopic', conversationTopicSchema);
