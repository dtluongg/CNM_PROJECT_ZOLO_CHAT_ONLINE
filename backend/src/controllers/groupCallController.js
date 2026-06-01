const GroupCall          = require('../models/groupCallModel');
const ConversationMember = require('../models/conversationMemberModel');
const User               = require('../models/userModel');
const { createVoiceRoomToken } = require('../services/livekitService');

// GET /api/group-calls/active?conversationId=xxx
const getActiveGroupCall = async (req, res) => {
  try {
    const { conversationId } = req.query;
    if (!conversationId) return res.status(400).json({ message: 'Thiếu conversationId' });

    const gc = await GroupCall.findOne({
      conversationId,
      status: { $in: ['ringing', 'ongoing'] },
    }).populate('participants.userId', 'displayName avatar').lean();

    if (!gc) return res.json({ active: false });

    const activeParticipants = gc.participants
      .filter(p => p.isActive)
      .map(p => ({
        userId:      (p.userId._id || p.userId).toString(),
        displayName: p.userId.displayName,
        avatar:      p.userId.avatar,
        joinedAt:    p.joinedAt,
      }));

    res.json({
      active:       true,
      groupCallId:  gc._id.toString(),
      type:         gc.type,
      status:       gc.status,
      roomName:     gc.roomName,
      livekitUrl:   process.env.LIVEKIT_URL,
      initiatorId:  gc.initiatorId.toString(),
      participants: activeParticipants,
      startedAt:    gc.startedAt,
    });
  } catch (err) {
    console.error('[GroupCall] getActiveGroupCall error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/group-calls/token  — lấy LiveKit token cho cuộc gọi đang active
const getGroupCallToken = async (req, res) => {
  try {
    const { groupCallId } = req.body;
    const userId = req.user._id;

    const gc = await GroupCall.findById(groupCallId);
    if (!gc) return res.status(404).json({ message: 'Cuộc gọi không tồn tại' });
    if (!['ringing', 'ongoing'].includes(gc.status))
      return res.status(400).json({ message: 'Cuộc gọi đã kết thúc' });

    const member = await ConversationMember.findOne({
      conversationId: gc.conversationId, userId,
    }).lean();
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });

    const user  = await User.findById(userId).select('displayName avatar').lean();
    const token = await createVoiceRoomToken(
      gc.roomName, userId.toString(), user.displayName, user.avatar
    );

    res.json({ token, roomName: gc.roomName, livekitUrl: process.env.LIVEKIT_URL });
  } catch (err) {
    console.error('[GroupCall] getGroupCallToken error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/group-calls/history?conversationId=xxx&page=1&limit=20
const getGroupCallHistory = async (req, res) => {
  try {
    const { conversationId, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    // Xác nhận user là thành viên
    const member = await ConversationMember.findOne({ conversationId, userId }).lean();
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const calls = await GroupCall.find({ conversationId, status: { $in: ['ended', 'missed'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('initiatorId', 'displayName avatar')
      .populate('participants.userId', 'displayName avatar')
      .lean();

    res.json({ calls });
  } catch (err) {
    console.error('[GroupCall] getGroupCallHistory error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getActiveGroupCall, getGroupCallToken, getGroupCallHistory };