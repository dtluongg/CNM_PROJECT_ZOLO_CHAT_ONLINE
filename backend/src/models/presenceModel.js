const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['online', 'offline', 'idle', 'dnd', 'invisible'], default: 'offline' },
    lastActiveAt: { type: Date, default: Date.now }, // Update mỗi vài giây khi user chọt vào app
    deviceStr: { type: String, enum: ['web', 'ios', 'android'], default: 'web' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Presence', presenceSchema);