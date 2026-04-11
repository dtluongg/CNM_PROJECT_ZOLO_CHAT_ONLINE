const Call = require('../models/callModel');

// ════════════════════════════════════════════════════════════════
//  GET /backend/api/calls/history
//  Lấy lịch sử cuộc gọi của user đang đăng nhập
//
//  Query params:
//    page  (default 1)
//    limit (default 20, max 50)
//    type  'audio' | 'video'  (optional, không truyền = lấy tất cả)
//
//  Response 200:
//    { calls: [...], pagination: { total, page, limit, totalPages } }
// ════════════════════════════════════════════════════════════════
const getCallHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip   = (page - 1) * limit;
        const { type } = req.query;

        const filter = {
            $or: [{ callerId: userId }, { calleeId: userId }],
        };
        if (type && ['audio', 'video'].includes(type)) {
            filter.type = type;
        }

        const [calls, total] = await Promise.all([
            Call.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('callerId', 'displayName avatar')
                .populate('calleeId', 'displayName avatar')
                .lean(),
            Call.countDocuments(filter),
        ]);

        return res.status(200).json({
            calls: calls.map((c) => ({
                _id:       c._id,
                type:      c.type,
                status:    c.status,
                duration:  c.duration,
                startedAt: c.startedAt,
                endedAt:   c.endedAt,
                createdAt: c.createdAt,
                caller: {
                    _id:         c.callerId._id,
                    displayName: c.callerId.displayName,
                    avatar:      c.callerId.avatar || null,
                },
                callee: {
                    _id:         c.calleeId._id,
                    displayName: c.calleeId.displayName,
                    avatar:      c.calleeId.avatar || null,
                },
                // true nếu user hiện tại là người gọi
                isOutgoing: c.callerId._id.toString() === userId.toString(),
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('getCallHistory error:', err);
        return res.status(500).json({ message: 'Lỗi server khi lấy lịch sử cuộc gọi' });
    }
};

// ════════════════════════════════════════════════════════════════
//  GET /backend/api/calls/:callId
//  Lấy chi tiết một cuộc gọi (chỉ caller / callee mới xem được)
//
//  Response 200:
//    { call: { _id, type, status, duration, startedAt, endedAt,
//              createdAt, caller, callee, isOutgoing } }
// ════════════════════════════════════════════════════════════════
const getCallDetail = async (req, res) => {
    try {
        const { callId } = req.params;
        const userId     = req.user._id.toString();

        if (!callId.match(/^[a-f\d]{24}$/i)) {
            return res.status(400).json({ message: 'callId không hợp lệ' });
        }

        const call = await Call.findById(callId)
            .populate('callerId', 'displayName avatar')
            .populate('calleeId', 'displayName avatar')
            .lean();

        if (!call) return res.status(404).json({ message: 'Cuộc gọi không tồn tại' });

        const isParticipant =
            call.callerId._id.toString() === userId ||
            call.calleeId._id.toString() === userId;

        if (!isParticipant) {
            return res.status(403).json({ message: 'Không có quyền xem cuộc gọi này' });
        }

        return res.status(200).json({
            call: {
                _id:       call._id,
                type:      call.type,
                status:    call.status,
                duration:  call.duration,
                startedAt: call.startedAt,
                endedAt:   call.endedAt,
                createdAt: call.createdAt,
                caller: {
                    _id:         call.callerId._id,
                    displayName: call.callerId.displayName,
                    avatar:      call.callerId.avatar || null,
                },
                callee: {
                    _id:         call.calleeId._id,
                    displayName: call.calleeId.displayName,
                    avatar:      call.calleeId.avatar || null,
                },
                isOutgoing: call.callerId._id.toString() === userId,
            },
        });
    } catch (err) {
        console.error('getCallDetail error:', err);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getCallHistory, getCallDetail };
