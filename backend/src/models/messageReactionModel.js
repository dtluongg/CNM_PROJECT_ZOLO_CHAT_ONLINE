const mongoose = require('mongoose');

const messageReactionSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true }, // Biểu tượng thả tim (👍, ❤️) hoặc string code định danh
  },
  { timestamps: true }
);

// Một user chỉ thả 1 reaction vào 1 tin nhắn
messageReactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageReaction', messageReactionSchema);
