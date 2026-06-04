const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['dm', 'group'], required: true },
    name: { type: String, default: '' }, // Có thể để trống với DM
    avatar: { type: String, default: '' },
    groupType: {
      type: String,
      enum: ['study', 'gaming', 'general', 'project', 'other', 'sensitive'],
      default: 'general',
    },
    // inviteMode áp dụng cho group:
    // open_invite: người có quyền mời được thêm trực tiếp
    // approval_required: member gửi request, admin/owner duyệt
    // admin_only: chỉ admin/owner được thêm trực tiếp
    inviteMode: {
      type: String,
      enum: ['open_invite', 'approval_required', 'admin_only'],
      default: 'open_invite',
    },
    description: { type: String, default: '', maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessagePreview: { type: String, default: '' }, // Trích xuât text hiển thị nhanh
    lastMessageTime: { type: Date },
    isLocked: { type: Boolean, default: false }, // Đóng băng trò chuyện / Nhóm giải tán
    disbandedAt: { type: Date, default: null }, // Nhóm đã giải tán (giữ lại để đọc trong kho lưu trữ)
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