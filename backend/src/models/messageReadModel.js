const mongoose = require('mongoose');

const messageReadSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  },
  { timestamps: true } // Thời gian createdAt sẽ chính là lúc người ta thả "Seen"
);

messageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageRead', messageReadSchema);
