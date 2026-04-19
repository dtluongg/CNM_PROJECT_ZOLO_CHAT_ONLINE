const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  message:        { type: String, default: '' },
  reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:     { type: Date, default: null },
  requestedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Chỉ chặn duplicate khi còn pending — cho phép request lại sau khi rejected/approved
joinRequestSchema.index({ conversationId: 1, userId: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);