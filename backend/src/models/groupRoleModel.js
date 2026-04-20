const mongoose = require('mongoose');

// GroupRole: Custom role do owner/admin tạo trong 1 nhóm cụ thể.
// Mỗi role định nghĩa quyền hạn chung + danh sách kênh được phép.
const groupRoleSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    name: { type: String, required: true, maxlength: 50, trim: true },
    color: { type: String, default: '#5865f2' }, // Hex color
    position: { type: Number, default: 0 },      // Thứ tự ưu tiên (cao hơn = mạnh hơn)

    // Quyền nhóm chung
    permissions: {
      canSendMessages:  { type: Boolean, default: true },
      canInviteMembers: { type: Boolean, default: false },
      canManageMembers: { type: Boolean, default: false },
    },

    // Danh sách kênh được phép truy cập (đọc + vào kênh)
    // Nếu rỗng = được vào tất cả kênh (theo role hệ thống)
    allowedTopicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConversationTopic' }],

    // Danh sách kênh được phép gửi tin nhắn
    // Nếu rỗng = được gửi ở tất cả kênh được truy cập
    sendableTopicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConversationTopic' }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

groupRoleSchema.index({ conversationId: 1, position: -1 });
// Tên role phải unique trong cùng 1 nhóm
groupRoleSchema.index({ conversationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('GroupRole', groupRoleSchema);