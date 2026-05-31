const mongoose = require('mongoose');

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    leftAt:   { type: Date, default: null },

    // ── Custom role (ref tới GroupRole) ──────────────────────────────────────
    // Chỉ áp dụng cho role = 'member'. owner/admin dùng role hệ thống.
    customRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupRole',
      default: null,
    },

    // ── Override quyền kênh riêng cho cá nhân này ────────────────────────────
    // Ghi đè lên quyền của customRole (nếu có).
    // allow: true = cho phép dù role không có; false = chặn dù role có.
    topicOverrides: [
      {
        topicId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ConversationTopic' },
        canAccess: { type: Boolean, default: true },  // vào xem kênh
        canSend:   { type: Boolean, default: true },  // gửi tin trong kênh
      },
    ],

    // Seen và Chưa đọc
    unreadCount:       { type: Number, default: 0 },
    lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

    // Quyền đặc biệt cá nhân (override cứng, không qua role)
    canSendMessages:  { type: Boolean, default: true },
    canInviteMembers: { type: Boolean, default: false },
    canManageMembers: { type: Boolean, default: false },

    // Cài đặt cá nhân
    isArchived: { type: Boolean, default: false },
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date,    default: null },
  },
  { timestamps: true }
);

conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationMember', conversationMemberSchema);