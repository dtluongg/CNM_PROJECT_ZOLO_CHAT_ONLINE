const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
  leftAt:   { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const voiceRoomSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  // topicId links this room to a specific voice channel (topic)
  topicId:        { type: mongoose.Schema.Types.ObjectId, ref: 'ConversationTopic', default: null },
  roomName:       { type: String, unique: true, required: true },
  status:         { type: String, enum: ['active', 'ended'], default: 'active' },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants:   [participantSchema],
  startedAt:      { type: Date, default: Date.now },
  endedAt:        { type: Date, default: null },
}, { timestamps: true });

voiceRoomSchema.index({ conversationId: 1, status: 1 });
voiceRoomSchema.index({ topicId: 1, status: 1 });

module.exports = mongoose.model('VoiceRoom', voiceRoomSchema);
