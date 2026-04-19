const VoiceRoom            = require('../models/voiceRoomModel');
const ConversationMember   = require('../models/conversationMemberModel');
const User                 = require('../models/userModel');
const { createVoiceRoomToken } = require('../services/livekitService');
const { getIO }            = require('../socket/socketManager');

// Helper: find active room by topicId (preferred) or conversationId fallback
const findActiveRoom = (topicId, conversationId) =>
  topicId
    ? VoiceRoom.findOne({ topicId, status: 'active' })
    : VoiceRoom.findOne({ conversationId, topicId: null, status: 'active' });

// POST /api/voice-rooms/create
const createVoiceRoom = async (req, res) => {
  try {
    const { conversationId, topicId = null } = req.body;
    const userId = req.user._id;

    const member = await ConversationMember.findOne({ conversationId, userId }).lean();
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });

    const existing = await findActiveRoom(topicId, conversationId);
    if (existing) {
      const user  = await User.findById(userId).select('displayName avatar').lean();
      const token = await createVoiceRoomToken(existing.roomName, userId.toString(), user.displayName, user.avatar);
      const alreadyIn = existing.participants.find(p => p.userId.toString() === userId.toString());
      if (alreadyIn) { alreadyIn.isActive = true; alreadyIn.leftAt = null; }
      else existing.participants.push({ userId, joinedAt: new Date(), isActive: true });
      await existing.save();
      _emitJoined(getIO(), conversationId, topicId, userId, user);
      return res.json({ token, roomName: existing.roomName, roomId: existing._id.toString(), livekitUrl: process.env.LIVEKIT_URL });
    }

    const slug     = topicId || conversationId;
    const roomName = `voice-${slug}-${Date.now()}`;
    const room     = await VoiceRoom.create({ conversationId, topicId, roomName, createdBy: userId });

    const user  = await User.findById(userId).select('displayName avatar').lean();
    const token = await createVoiceRoomToken(roomName, userId.toString(), user.displayName, user.avatar);
    room.participants.push({ userId, joinedAt: new Date(), isActive: true });
    await room.save();

    const io = getIO();
    io.to(`conv:${conversationId}`).emit('voice-room:created', {
      conversationId: conversationId.toString(),
      topicId:        topicId?.toString() || null,
      roomName,
      roomId:    room._id.toString(),
      createdBy: { _id: userId.toString(), displayName: user.displayName, avatar: user.avatar },
    });
    _emitJoined(io, conversationId, topicId, userId, user);

    res.json({ token, roomName, roomId: room._id.toString(), livekitUrl: process.env.LIVEKIT_URL });
  } catch (err) {
    console.error('[VoiceRoom] createVoiceRoom error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/voice-rooms/join
const joinVoiceRoom = async (req, res) => {
  try {
    const { conversationId, topicId = null } = req.body;
    const userId = req.user._id;

    const member = await ConversationMember.findOne({ conversationId, userId }).lean();
    if (!member) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });

    const room = await findActiveRoom(topicId, conversationId);
    if (!room) return res.status(404).json({ message: 'Không có phòng thoại đang hoạt động' });

    const user  = await User.findById(userId).select('displayName avatar').lean();
    const token = await createVoiceRoomToken(room.roomName, userId.toString(), user.displayName, user.avatar);

    const existing = room.participants.find(p => p.userId.toString() === userId.toString());
    if (existing) { existing.isActive = true; existing.leftAt = null; }
    else room.participants.push({ userId, joinedAt: new Date(), isActive: true });
    await room.save();

    _emitJoined(getIO(), conversationId, topicId, userId, user);
    res.json({ token, roomName: room.roomName, roomId: room._id.toString(), livekitUrl: process.env.LIVEKIT_URL });
  } catch (err) {
    console.error('[VoiceRoom] joinVoiceRoom error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/voice-rooms/leave
const leaveVoiceRoom = async (req, res) => {
  try {
    const { conversationId, topicId = null } = req.body;
    const userId = req.user._id;

    const room = await findActiveRoom(topicId, conversationId);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng thoại' });

    const participant = room.participants.find(p => p.userId.toString() === userId.toString());
    if (participant) { participant.isActive = false; participant.leftAt = new Date(); }

    const activeCount = room.participants.filter(p => p.isActive).length;
    if (activeCount === 0) { room.status = 'ended'; room.endedAt = new Date(); }
    await room.save();

    const user = await User.findById(userId).select('displayName').lean();
    const io   = getIO();
    io.to(`conv:${conversationId}`).emit('voice-room:participant-left', {
      conversationId: conversationId.toString(),
      topicId:        (topicId || room.topicId)?.toString() || null,
      userId:         userId.toString(),
      displayName:    user?.displayName,
      roomEnded:      room.status === 'ended',
    });

    res.json({ success: true, roomEnded: room.status === 'ended' });
  } catch (err) {
    console.error('[VoiceRoom] leaveVoiceRoom error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/voice-rooms/status?conversationId=xxx[&topicId=yyy]
const getVoiceRoomStatus = async (req, res) => {
  try {
    const { conversationId, topicId = null } = req.query;
    if (!conversationId) return res.status(400).json({ message: 'Thiếu conversationId' });

    const room = await findActiveRoom(topicId, conversationId);
    const populated = room ? await VoiceRoom.findById(room._id).populate('participants.userId', 'displayName avatar').lean() : null;

    if (!populated) return res.json({ active: false });

    const activeParticipants = populated.participants
      .filter(p => p.isActive)
      .map(p => ({
        userId:      (p.userId._id || p.userId).toString(),
        displayName: p.userId.displayName,
        avatar:      p.userId.avatar,
        joinedAt:    p.joinedAt,
      }));

    res.json({
      active:       true,
      roomId:       populated._id.toString(),
      roomName:     populated.roomName,
      topicId:      populated.topicId?.toString() || null,
      createdBy:    populated.createdBy.toString(),
      participants: activeParticipants,
      startedAt:    populated.startedAt,
    });
  } catch (err) {
    console.error('[VoiceRoom] getVoiceRoomStatus error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/voice-rooms/status-batch?conversationId=xxx   (all voice channel rooms)
const getVoiceRoomStatusBatch = async (req, res) => {
  try {
    const { conversationId } = req.query;
    if (!conversationId) return res.status(400).json({ message: 'Thiếu conversationId' });

    const rooms = await VoiceRoom.find({ conversationId, status: 'active' })
      .populate('participants.userId', 'displayName avatar')
      .lean();

    const result = {};
    for (const room of rooms) {
      const key = room.topicId?.toString() || '__general__';
      result[key] = room.participants
        .filter(p => p.isActive)
        .map(p => ({
          userId:      (p.userId._id || p.userId).toString(),
          displayName: p.userId.displayName,
          avatar:      p.userId.avatar,
        }));
    }

    res.json({ rooms: result });
  } catch (err) {
    console.error('[VoiceRoom] getVoiceRoomStatusBatch error:', err);
    res.status(500).json({ message: err.message });
  }
};

function _emitJoined(io, conversationId, topicId, userId, user) {
  io.to(`conv:${conversationId}`).emit('voice-room:participant-joined', {
    conversationId: conversationId.toString(),
    topicId:        topicId?.toString() || null,
    userId:         userId.toString(),
    displayName:    user.displayName,
    avatar:         user.avatar,
  });
}

module.exports = { createVoiceRoom, joinVoiceRoom, leaveVoiceRoom, getVoiceRoomStatus, getVoiceRoomStatusBatch };
