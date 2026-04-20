const JoinRequest        = require('../models/joinRequestModel');
const ConversationMember = require('../models/conversationMemberModel');
const Conversation       = require('../models/conversationModel');
const User               = require('../models/userModel');
const { getIO }          = require('../socket/socketManager');

const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

// POST /conversations/:id/join-requests — member gửi yêu cầu tham gia
const createJoinRequest = async (req, res, next) => {
  try {
    const requesterId    = getCurrentUserId(req); // người gửi yêu cầu (member trong nhóm)
    const conversationId = req.params.id;
    const { message = '', targetUserId } = req.body;
    // targetUserId: người muốn được mời vào nhóm (optional)
    // Nếu không có targetUserId → chính người gửi muốn tham gia

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Không tìm thấy nhóm' });

    // Case 1: Member trong nhóm gửi yêu cầu giới thiệu người khác
    const requesterMember = await ConversationMember.findOne({
      conversationId, userId: requesterId, leftAt: null,
    });

    if (requesterMember) {
      if (conversation.inviteMode === 'admin_only' && !['owner', 'admin'].includes(requesterMember.role)) {
        return res.status(403).json({ message: 'Nhóm đang ở chế độ Admin Only, chỉ owner/admin mới được đề xuất thêm người' });
      }

      // Đã là member → chỉ được gửi request giới thiệu người khác
      if (!targetUserId) {
        return res.status(400).json({ message: 'Bạn đã là thành viên. Hãy chỉ định người muốn giới thiệu (targetUserId).' });
      }

      // Kiểm tra target chưa là member
      const targetMember = await ConversationMember.findOne({
        conversationId, userId: targetUserId, leftAt: null,
      });
      if (targetMember) return res.status(400).json({ message: 'Người này đã là thành viên của nhóm' });

      // Kiểm tra đã có request pending chưa
      const pending = await JoinRequest.findOne({
        conversationId, userId: targetUserId, status: 'pending',
      });
      if (pending) return res.status(400).json({ message: 'Đã có yêu cầu đang chờ duyệt cho người này' });

      const request = await JoinRequest.create({
        conversationId,
        userId:      targetUserId,   // người được giới thiệu
        requestedBy: requesterId,    // người giới thiệu
        message,
      });

      // Notify admins
      await _notifyAdmins(conversationId, requesterId, targetUserId, request, message);

      return res.status(201).json({ message: 'Đã gửi yêu cầu giới thiệu thành viên', data: request });
    }

    // Case 2: Người ngoài nhóm tự xin vào
    const pending = await JoinRequest.findOne({
      conversationId, userId: requesterId, status: 'pending',
    });
    if (pending) return res.status(400).json({ message: 'Bạn đã gửi yêu cầu rồi, hãy đợi admin duyệt' });

    const request = await JoinRequest.create({
      conversationId,
      userId:      requesterId,
      requestedBy: requesterId,
      message,
    });

    await _notifyAdmins(conversationId, requesterId, null, request, message);

    return res.status(201).json({ message: 'Đã gửi yêu cầu tham gia', data: request });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Yêu cầu này đã tồn tại' });
    next(err);
  }
};

// Helper notify admins
async function _notifyAdmins(conversationId, requesterId, targetUserId, request, message) {
  try {
    const admins = await ConversationMember.find({
      conversationId, leftAt: null,
      $or: [{ role: 'owner' }, { role: 'admin' }],
    }).select('userId').lean();

    const requester = await User.findById(requesterId).select('displayName avatar').lean();
    const target    = targetUserId
      ? await User.findById(targetUserId).select('displayName avatar').lean()
      : null;

    const io = getIO();
    admins.forEach(({ userId: adminId }) => {
      io.to(`user:${adminId.toString()}`).emit('join-request:new', {
        conversationId: conversationId.toString(),
        request: {
          _id:           request._id,
          userId:        targetUserId || requesterId,
          requestedBy:   requesterId,
          requesterName: requester?.displayName,
          targetName:    target?.displayName,
          message,
          createdAt:     request.createdAt,
        },
      });
    });
  } catch (err) {
    console.error('_notifyAdmins error:', err);
  }
}

// GET /conversations/:id/join-requests — admin/owner xem danh sách
const listJoinRequests = async (req, res, next) => {
  try {
    const userId         = getCurrentUserId(req);
    const conversationId = req.params.id;

    const myMember = await ConversationMember.findOne({ conversationId, userId, leftAt: null });
    if (!myMember) return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });

    const requests = await JoinRequest.find({ conversationId, status: 'pending' })
      .populate('userId', 'displayName avatar email username')
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ data: requests });
  } catch (err) {
    next(err);
  }
};

// PATCH /conversations/:id/join-requests/:requestId — duyệt hoặc từ chối
const reviewJoinRequest = async (req, res, next) => {
  try {
    const reviewerId     = getCurrentUserId(req);
    const conversationId = req.params.id;
    const { requestId }  = req.params;
    const { action }     = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action phải là approve hoặc reject' });
    }

    const myMember = await ConversationMember.findOne({ conversationId, userId: reviewerId, leftAt: null });
    if (!myMember) return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });
    if (!['owner', 'admin'].includes(myMember.role)) {
      return res.status(403).json({ message: 'Chỉ admin/owner mới duyệt được yêu cầu' });
    }

    const request = await JoinRequest.findOne({ _id: requestId, conversationId, status: 'pending' });
    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });

    request.status     = action === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    await request.save();

    if (action === 'approve') {
      // Thêm vào nhóm
      const existing = await ConversationMember.findOne({ conversationId, userId: request.userId });
      if (existing) {
        existing.leftAt = null;
        existing.role   = 'member';
        existing.canSendMessages = true;
        existing.canInviteMembers = true;
        existing.canManageMembers = false;
        await existing.save();
      } else {
        await ConversationMember.create({
          conversationId,
          userId:          request.userId,
          role:            'member',
          canSendMessages: true,
          canInviteMembers: true,
          canManageMembers: false,
        });
      }
    }

    // Notify người gửi yêu cầu
    const io = getIO();
    io.to(`user:${request.userId.toString()}`).emit('join-request:reviewed', {
      conversationId,
      requestId,
      action,
    });

    return res.status(200).json({
      message: action === 'approve' ? 'Đã duyệt yêu cầu tham gia' : 'Đã từ chối yêu cầu',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createJoinRequest, listJoinRequests, reviewJoinRequest };