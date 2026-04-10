const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════════
//  CALL MODEL  –  Lưu lịch sử mọi cuộc gọi audio / video
//
//  Vòng đời status:
//    calling  →  ongoing   (callee nhấc máy)
//    calling  →  missed    (timeout 30s / caller cúp / callee offline)
//    calling  →  rejected  (callee từ chối)
//    calling  →  busy      (callee đang bận)
//    ongoing  →  ended     (một trong hai bên cúp máy)
// ════════════════════════════════════════════════════════════════
const callSchema = new mongoose.Schema(
    {
        callerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:  'User',
            required: true,
        },
        calleeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:  'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['audio', 'video'],
            required: true,
        },
        status: {
            type: String,
            enum: ['calling', 'ongoing', 'ended', 'missed', 'rejected', 'busy'],
            default: 'calling',
        },

        // Thời điểm callee nhấc máy (null nếu chưa/không được nhấc)
        startedAt: { type: Date, default: null },

        // Thời điểm kết thúc cuộc gọi
        endedAt:   { type: Date, default: null },

        // Thời lượng cuộc gọi tính bằng giây (0 nếu không được kết nối)
        duration:  { type: Number, default: 0 },

        // Người chủ động kết thúc cuộc gọi
        endedBy:   {
            type: mongoose.Schema.Types.ObjectId,
            ref:  'User',
            default: null,
        },
    },
    { timestamps: true }
);

// Index để query lịch sử nhanh theo từng user
callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ calleeId: 1, createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);
