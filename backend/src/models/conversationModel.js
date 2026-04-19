const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['dm', 'group'], required: true },
    type: { type: String, enum: ['dm', 'group'], required: true },
    name: { type: String, default: '' }, // Có thể để trống với DM
    avatar: { type: String, default: '' },
    groupType: {
      type: String,
      enum: ['study', 'gaming', 'general', 'project', 'other'],
      default: 'general',
    },
    description: { type: String, default: '', maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessagePreview: { type: String, default: '' }, // Trích xuât text hiển thị nhanh
    lastMessageTime: { type: Date },
    isLocked: { type: Boolean, default: false }, // Đóng băng trò chuyện / Nhóm giải tán
    pinnedMessages: [
      {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        pinnedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
