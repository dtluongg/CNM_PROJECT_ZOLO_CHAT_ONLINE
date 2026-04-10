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

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
