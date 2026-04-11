const mongoose = require('mongoose');

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null }, // Khi người dùng rời nhóm (soft delete)
    
    // Seen và Chưa đọc
    unreadCount: { type: Number, default: 0 },
    lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    
    // Quyền đặc biệt (Fine-grained Permissions)
    canSendMessages: { type: Boolean, default: true },
    canInviteMembers: { type: Boolean, default: true },
    canManageMembers: { type: Boolean, default: false },
    
    // Cài đặt cá nhân
    isArchived: { type: Boolean, default: false }, // Đã lưu trữ đối với cá nhân này
    isDeleted: { type: Boolean, default: false }, // Đã xóa hội thoại phía tôi
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Đảm bảo môi user chỉ có 1 record member trong 1 group
conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationMember', conversationMemberSchema);
