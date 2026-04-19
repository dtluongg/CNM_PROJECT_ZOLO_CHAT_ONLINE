const ConversationMember = require('../models/conversationMemberModel');
const GroupRole = require('../models/groupRoleModel');

// Tính quyền thực tế theo thứ tự: personalOverride > customRole > systemRole
const getEffectiveTopicPermission = async (member, topicId) => {
  const tid = topicId?.toString();

  // 1. owner/admin luôn full quyền
  if (member.role === 'owner' || member.role === 'admin') {
    return { canAccess: true, canSend: true };
  }

  // 2. Custom role
  if (member.customRoleId) {
    const role = await GroupRole.findById(member.customRoleId).lean();
    if (role) {
      const allowedIds  = (role.allowedTopicIds  || []).map(id => id.toString());
      const sendableIds = (role.sendableTopicIds || []).map(id => id.toString());
      console.log('[role] name:', role.name);
      console.log('[role] allowedIds:', allowedIds);
      console.log('[role] sendableIds:', sendableIds); // 👈 xem cái này
      console.log('[role] checking tid:', tid);

      const canAccess = allowedIds.length === 0 || allowedIds.includes(tid);
      const canSend   = canAccess
        && sendableIds.length > 0
        && sendableIds.includes(tid)
        && role.permissions?.canSendMessages !== false;

      return { canAccess, canSend };
    }
  }

  // 3. Default member không có custom role — được xem và gửi tất cả
  return {
    canAccess: true,
    canSend: member.canSendMessages !== false,
  };
};

// Middleware kiểm tra quyền gửi tin nhắn
const checkCanSendInTopic = async (req, res, next) => {
  try {
    const userId         = (req.user?._id || req.user?.id || '').toString();
    const conversationId = req.params.conversationId || req.params.id || req.body.conversationId;
    const topicId        = req.body.topicId || req.query.topicId || null;

    const member = await ConversationMember.findOne({
      conversationId, userId, leftAt: null,
    });

    if (!member) return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });

    // Kênh chung (không có topicId) — chỉ check canSendMessages cá nhân
    if (!topicId) {
      if (member.role === 'member' && !member.canSendMessages) {
        return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn trong nhóm này' });
      }
      return next();
    }

    const { canAccess, canSend } = await getEffectiveTopicPermission(member, topicId);

    if (!canAccess) return res.status(403).json({ message: 'Bạn không có quyền truy cập kênh này' });
    if (!canSend)   return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn trong kênh này' });

    next();
  } catch (err) {
    next(err);
  }
};

// Middleware kiểm tra quyền mời thành viên
const checkCanInvite = async (req, res, next) => {
  try {
    const userId         = (req.user?._id || req.user?.id || '').toString();
    const conversationId = req.params.id;

    const member = await ConversationMember.findOne({
      conversationId, userId, leftAt: null,
    });

    if (!member) return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });

    // owner/admin luôn được mời
    if (member.role === 'owner' || member.role === 'admin') return next();

    // Kiểm tra custom role có quyền canInviteMembers không
    if (member.customRoleId) {
      const role = await GroupRole.findById(member.customRoleId).lean();
      if (role?.permissions?.canInviteMembers === true) return next();
    }

    // Tất cả trường hợp còn lại → chặn
    return res.status(403).json({
      message: 'Bạn không có quyền mời thành viên. Hãy nhờ admin hoặc người có quyền mời.'
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { checkCanSendInTopic, checkCanInvite, getEffectiveTopicPermission };