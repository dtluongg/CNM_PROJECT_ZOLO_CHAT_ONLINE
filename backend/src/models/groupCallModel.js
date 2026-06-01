const mongoose = require('mongoose');

// Vòng đời:
//   ringing  → ongoing   (ít nhất 1 người join)
//   ringing  → missed    (timeout 60s / initiator hủy)
//   ongoing  → ended     (tất cả rời phòng / initiator kết thúc)

const participantSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt:  { type: Date, default: null },
  leftAt:    { type: Date, default: null },
  isActive:  { type: Boolean, default: false },
  declined:  { type: Boolean, default: false },
}, { _id: false });

const groupCallSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  initiatorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:           { type: String, enum: ['audio', 'video'], required: true },
  status:         { type: String, enum: ['ringing', 'ongoing', 'ended', 'missed'], default: 'ringing' },
  roomName:       { type: String, required: true },
  participants:   [participantSchema],
  startedAt:      { type: Date, default: null },
  endedAt:        { type: Date, default: null },
  duration:       { type: Number, default: 0 },
}, { timestamps: true });

groupCallSchema.index({ conversationId: 1, status: 1 });
groupCallSchema.index({ initiatorId: 1, createdAt: -1 });

module.exports = mongoose.model('GroupCall', groupCallSchema);