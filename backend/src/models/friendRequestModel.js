const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'canceled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Tối ưu list incoming/outgoing theo trạng thái.
friendRequestSchema.index({ toUserId: 1, status: 1, createdAt: -1 });
friendRequestSchema.index({ fromUserId: 1, status: 1, createdAt: -1 });

// Chặn trùng lời mời đang chờ theo cùng một chiều gửi.
friendRequestSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
