const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    content: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'file', 'video', 'voice', 'emoji', 'system', 'poll', 'reminder'], default: 'text' },
    
    replyToMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    forwardFromMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    
    // Trạng thái bị chỉnh sửa
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    
    // Xóa phía tôi (Xóa)
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Thu hồi 2 chiều (Revoke)
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    // Túi thần kỳ cho metadata
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true } // Tự động có createdAt dùng để xếp thời gian tin nhắn
);

module.exports = mongoose.model('Message', messageSchema);
