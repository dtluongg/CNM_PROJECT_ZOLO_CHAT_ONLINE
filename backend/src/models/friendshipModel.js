const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema(
  {
    // Luôn lưu ID có giá trị nhỏ hơn vào userId1 để tránh trùng lặp
    userId1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userId2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nickname1: { type: String, default: '' }, // Tên User 2 đặt cho User 1
    nickname2: { type: String, default: '' }, // Tên User 1 đặt cho User 2
    isBlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // ID của người đã chặn
  },
  { timestamps: true }
);

// Đảm bảo cặp (userId1, userId2) là duy nhất
friendshipSchema.index({ userId1: 1, userId2: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);
