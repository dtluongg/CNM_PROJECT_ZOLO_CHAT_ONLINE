/**
 * groupCallSocket.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Signaling cho group call audio/video qua LiveKit.
 *
 * FIX: emit group-call:incoming → user:{userId} (thay vì conv:{id})
 *      vì GroupCallContext tạo socket riêng chưa join conv: rooms.
 *      user:{userId} được join tự động cho mọi socket khi connect.
 *
 * Socket rooms dùng:
 *   user:{userId}            – auto-joined, dùng để ring mọi device của user
 *   group-call:{groupCallId} – phòng cuộc gọi, join sau khi accept
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GroupCall          = require('../models/groupCallModel');
const ConversationMember = require('../models/conversationMemberModel');
const Conversation       = require('../models/conversationModel');
const User               = require('../models/userModel');
const Message            = require('../models/messageModel');
const { createVoiceRoomToken } = require('../services/livekitService');

const RING_TIMEOUT_MS = 60_000;
const callTimers      = new Map(); // groupCallId → Timeout

module.exports = function groupCallSocket(io, socket, onlineUsers) {
  const userId = socket.user._id.toString();

  // ── group-call:initiate ─────────────────────────────────────────────────
  socket.on('group-call:initiate', async ({ conversationId, type }, ack) => {
    try {
      const member = await ConversationMember.findOne({ conversationId, userId }).lean();
      if (!member) return ack?.({ error: 'Bạn không phải thành viên nhóm' });

      const existing = await GroupCall.findOne({ conversationId, status: { $in: ['ringing', 'ongoing'] } });
      if (existing) return ack?.({ error: 'Nhóm đang có cuộc gọi khác đang diễn ra' });

      const roomName     = `group-call-${conversationId}-${Date.now()}`;
      const [user, conv] = await Promise.all([
        User.findById(userId).select('displayName avatar').lean(),
        Conversation.findById(conversationId).select('name avatar').lean(),
      ]);
      const token = await createVoiceRoomToken(roomName, userId, user.displayName, user.avatar);

      const groupCall = await GroupCall.create({
        conversationId,
        initiatorId: userId,
        type,
        roomName,
        participants: [{ userId, joinedAt: new Date(), isActive: true }],
        status: 'ringing',
        startedAt: new Date(),
      });

      const callId  = groupCall._id.toString();
      const payload = {
        groupCallId:    callId,
        conversationId: conversationId.toString(),
        initiator:      { _id: userId, displayName: user.displayName, avatar: user.avatar },
        group:          { name: conv?.name || 'Nhóm', avatar: conv?.avatar || null },
        type,
        roomName,
        livekitUrl: process.env.LIVEKIT_URL,
      };

      // Initiator join room ngay
      socket.join(`group-call:${callId}`);

      // Lấy tất cả thành viên và gửi đến user:{id} của từng người (trừ initiator)
      // user:{id} được join tự động cho MỌI socket → đảm bảo GroupCallContext nhận được
      const allMembers = await ConversationMember.find({ conversationId }).select('userId').lean();
      for (const m of allMembers) {
        const mid = m.userId.toString();
        if (mid !== userId) {
          io.to(`user:${mid}`).emit('group-call:incoming', payload);
        }
      }

      // Timeout → missed
      const timer = setTimeout(async () => {
        const gc = await GroupCall.findById(callId);
        if (!gc || gc.status !== 'ringing') return;
        const activeOthers = gc.participants.filter(p => p.isActive && p.userId.toString() !== userId);
        if (activeOthers.length === 0) {
          gc.status  = 'missed';
          gc.endedAt = new Date();
          await gc.save();
          await _notifyAllMembers(io, callId, conversationId, { groupCallId: callId, reason: 'missed' }, 'group-call:ended');
        }
        callTimers.delete(callId);
      }, RING_TIMEOUT_MS);
      callTimers.set(callId, timer);

      ack?.({ groupCallId: callId, token, roomName, livekitUrl: process.env.LIVEKIT_URL });
    } catch (err) {
      console.error('[GroupCall] initiate error:', err);
      ack?.({ error: 'Không thể tạo cuộc gọi nhóm' });
    }
  });

  // ── group-call:accept ───────────────────────────────────────────────────
  socket.on('group-call:accept', async ({ groupCallId }, ack) => {
    try {
      const groupCall = await GroupCall.findById(groupCallId);
      if (!groupCall) return ack?.({ error: 'Cuộc gọi không tồn tại' });
      if (!['ringing', 'ongoing'].includes(groupCall.status))
        return ack?.({ error: 'Cuộc gọi đã kết thúc' });

      const user  = await User.findById(userId).select('displayName avatar').lean();
      const token = await createVoiceRoomToken(groupCall.roomName, userId, user.displayName, user.avatar);

      const existing = groupCall.participants.find(p => p.userId.toString() === userId);
      if (existing) {
        existing.isActive = true; existing.leftAt = null;
        existing.declined = false; existing.joinedAt = new Date();
      } else {
        groupCall.participants.push({ userId, joinedAt: new Date(), isActive: true });
      }

      const activeCount = groupCall.participants.filter(p => p.isActive).length;
      if (groupCall.status === 'ringing' && activeCount >= 2) {
        groupCall.status = 'ongoing';
        clearTimeout(callTimers.get(groupCallId));
        callTimers.delete(groupCallId);
      }
      await groupCall.save();

      socket.join(`group-call:${groupCallId}`);

      io.to(`group-call:${groupCallId}`).emit('group-call:member-joined', {
        groupCallId,
        user: { _id: userId, displayName: user.displayName, avatar: user.avatar },
      });

      ack?.({ token, roomName: groupCall.roomName, livekitUrl: process.env.LIVEKIT_URL, groupCallId });
    } catch (err) {
      console.error('[GroupCall] accept error:', err);
      ack?.({ error: 'Không thể tham gia cuộc gọi' });
    }
  });

  // ── group-call:decline ──────────────────────────────────────────────────
  socket.on('group-call:decline', async ({ groupCallId }) => {
    try {
      const groupCall = await GroupCall.findById(groupCallId);
      if (!groupCall) return;
      const part = groupCall.participants.find(p => p.userId.toString() === userId);
      if (part) { part.declined = true; }
      else { groupCall.participants.push({ userId, declined: true, isActive: false }); }
      await groupCall.save();

      const user = await User.findById(userId).select('displayName').lean();
      io.to(`group-call:${groupCallId}`).emit('group-call:member-declined', {
        groupCallId, userId, displayName: user?.displayName,
      });
    } catch (err) {
      console.error('[GroupCall] decline error:', err);
    }
  });

  // ── group-call:leave ────────────────────────────────────────────────────
  socket.on('group-call:leave', async ({ groupCallId }) => {
    try { await _handleLeave(io, socket, groupCallId, userId); }
    catch (err) { console.error('[GroupCall] leave error:', err); }
  });

  // ── group-call:end (initiator) ─────────────────────────────────────────
  socket.on('group-call:end', async ({ groupCallId }) => {
    try {
      const groupCall = await GroupCall.findById(groupCallId);
      if (!groupCall) return;
      if (groupCall.initiatorId.toString() !== userId) return;
      await _endCall(io, groupCall, 'ended');
    } catch (err) {
      console.error('[GroupCall] end error:', err);
    }
  });

  // ── Cleanup on disconnect ──────────────────────────────────────────────
  socket.on('disconnect', async () => {
    try {
      const activeCalls = await GroupCall.find({
        status: { $in: ['ringing', 'ongoing'] },
        participants: { $elemMatch: { userId, isActive: true } },
      });
      for (const gc of activeCalls) {
        await _handleLeave(io, socket, gc._id.toString(), userId);
      }
    } catch (err) {
      console.error('[GroupCall] disconnect cleanup error:', err);
    }
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _handleLeave(io, socket, groupCallId, userId) {
  const groupCall = await GroupCall.findById(groupCallId);
  if (!groupCall) return;

  const part = groupCall.participants.find(p => p.userId.toString() === userId);
  if (part) { part.isActive = false; part.leftAt = new Date(); }

  const activeCount = groupCall.participants.filter(p => p.isActive).length;
  if (activeCount === 0) {
    const duration = groupCall.startedAt
      ? Math.floor((Date.now() - groupCall.startedAt.getTime()) / 1000) : 0;
    await _endCall(io, groupCall, 'ended', duration);
  } else {
    await groupCall.save();
    socket.leave(`group-call:${groupCallId}`);
    const user = await User.findById(userId).select('displayName').lean();
    io.to(`group-call:${groupCallId}`).emit('group-call:member-left', {
      groupCallId, userId, displayName: user?.displayName,
    });
  }
}

async function _endCall(io, groupCall, reason, duration = null) {
  const callId  = groupCall._id.toString();
  const convId  = groupCall.conversationId.toString();

  clearTimeout(callTimers.get(callId));
  callTimers.delete(callId);

  const dur = duration ?? (
    groupCall.startedAt ? Math.floor((Date.now() - groupCall.startedAt.getTime()) / 1000) : 0
  );
  groupCall.status   = reason === 'missed' ? 'missed' : 'ended';
  groupCall.endedAt  = new Date();
  groupCall.duration = dur;
  await groupCall.save();

  const payload = { groupCallId: callId, reason, duration: dur };
  io.to(`group-call:${callId}`).emit('group-call:ended', payload);
  await _notifyAllMembers(io, callId, convId, payload, 'group-call:ended');

  // Tạo system message lịch sử cuộc gọi trong chat
  try {
    const participantIds = groupCall.participants
      .filter(p => p.joinedAt && !p.declined)
      .map(p => p.userId);

    const participants = await User.find({ _id: { $in: participantIds } })
      .select('displayName avatar').lean();

    const systemMsg = await Message.create({
      conversationId: groupCall.conversationId,
      type: 'system',
      content: reason === 'missed' ? 'Cuộc gọi nhóm nhỡ' : 'Cuộc gọi nhóm đã kết thúc',
      payload: {
        event: 'group_call_ended',
        callType: groupCall.type,
        status: reason === 'missed' ? 'missed' : 'ended',
        duration: dur,
        participants: participants.map(u => ({
          _id: u._id.toString(),
          displayName: u.displayName,
          avatar: u.avatar || null,
        })),
      },
    });

    // Broadcast tin nhắn hệ thống đến tất cả thành viên nhóm
    const members = await ConversationMember.find({ conversationId: convId }).select('userId').lean();
    const msgToSend = {
      ...systemMsg.toObject(),
      _id: systemMsg._id.toString(),
      time: new Date(systemMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    for (const m of members) {
      io.to(`user:${m.userId.toString()}`).emit('chat:new-message', {
        conversationId: convId,
        message: msgToSend,
      });
    }
  } catch (err) {
    console.error('[GroupCall] create system message error:', err);
  }
}

async function _notifyAllMembers(io, _callId, conversationId, payload, event) {
  try {
    const members = await ConversationMember.find({ conversationId }).select('userId').lean();
    for (const m of members) {
      io.to(`user:${m.userId.toString()}`).emit(event, payload);
    }
  } catch (err) {
    console.error('[GroupCall] _notifyAllMembers error:', err);
  }
}