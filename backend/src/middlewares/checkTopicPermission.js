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

      // Empty allowedTopicIds = wildcard (can access all)
      const canAccess = allowedIds.length === 0 || allowedIds.includes(tid);

      let canSend = false;
      if (canAccess) {
        if (sendableIds.length === 0) {
          // Empty sendableTopicIds = follow global canSendMessages flag (wildcard)
          canSend = role.permissions?.canSendMessages !== false;
        } else {
          // Explicit list: must be included AND have global send permission
          canSend = sendableIds.includes(tid) && role.permissions?.canSendMessages !== false;
        }
      }

      return { canAccess, canSend };
    }
  }

  // 3. Default member không có custom role
  let canAccess = true;
  let canSend = canSendGlobally;

  const override = (member.topicOverrides || []).find(o => o.topicId?.toString() === tid);
  if (override) {
    canAccess = !!override.canAccess;
    canSend = canAccess && !!override.canSend && canSendGlobally;
  }

  return {
    canAccess,
    canSend,
  };
};

// Middleware kiểm tra quyền gửi tin nhắn
const checkCanSendInTopic = async (req, res, next) => {
  try {
    const userId         = (req.user?._id || req.user?.id || '').toString();
    const conversationId = req.params.conversationId || req.params.id || req.body.conversationId;
    const topicId        = req.body.topicId || req.query.topicId || null;

    const conversation = await Conversation.findById(conversationId).select('type isLocked').lean();
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }

    const member = await ConversationMember.findOne({
      conversationId, userId, leftAt: null,
    });

    if (!member) return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });

    // Group bị khóa: chỉ owner/admin được gửi, member thường chỉ đọc.
    if (conversation.type === 'group' && conversation.isLocked && member.role === 'member') {
      return res.status(403).json({
        message: 'Nhóm đang khóa. Chỉ owner/admin mới được gửi tin nhắn',
      });
    }

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

    const conversation = await Conversation.findById(conversationId).select('type inviteMode').lean();
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }
    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ nhóm mới hỗ trợ mời thành viên' });
    }

    const member = await ConversationMember.findOne({
      conversationId, userId, leftAt: null,
    });

    if (!member) return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });

    // owner/admin luôn được mời
    if (member.role === 'owner' || member.role === 'admin') return next();

    if (conversation.inviteMode === 'admin_only') {
      return res.status(403).json({
        message: 'Nhóm đang ở chế độ Admin Only, chỉ owner/admin mới được mời trực tiếp'
      });
    }

    // Member thường được bật cờ canInviteMembers vẫn có quyền mời.
    if (member.canInviteMembers === true) return next();

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