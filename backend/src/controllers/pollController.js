const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const { getIO } = require('../socket/socketManager');
const { notifyNewMessage } = require('../services/notificationService');
const { getEffectiveTopicPermission } = require('../middlewares/checkTopicPermission');

const requireActiveMembership = async (conversationId, userId) => {
  const member = await ConversationMember.findOne({
    conversationId,
    userId,
    leftAt: null,
    isDeleted: { $ne: true },
  });

  if (!member) {
    const err = new Error('Bạn không thuộc cuộc trò chuyện này');
    err.statusCode = 403;
    throw err;
  }

  return member;
};

/**
 * Tạo bình chọn mới
 * body: { topic, options: [string] }
 */
exports.createPoll = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { topic, options, multipleChoice = false, topicId = null } = req.body;
    const senderId = req.user._id.toString();

    const member = await requireActiveMembership(conversationId, senderId);

    if (topicId) {
      const permission = await getEffectiveTopicPermission(member, topicId);
      if (!permission.canAccess) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập kênh này' });
      }
      if (!permission.canSend) {
        return res.status(403).json({ message: 'Bạn không có quyền gửi bình chọn trong kênh này' });
      }
    } else if (member.role === 'member' && member.canSendMessages === false) {
      return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn trong nhóm này' });
    }

    if (!topic || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Vui lòng nhập chủ đề và ít nhất 2 phương án.' });
    }

    const pollOptions = options.map((opt, index) => ({
      id: (index + 1).toString(),
      text: opt,
      voterIds: []
    }));

    const newMessage = await Message.create({
      conversationId,
      senderId,
      content: `[Bình chọn] ${topic}`,
      type: 'poll',
      payload: {
        topic,
        options: pollOptions,
        isClosed: false,
        multipleChoice
      },
      topicId: topicId || null,
    });

    const populatedMsg = await Message.findById(newMessage._id).populate('senderId', 'displayName avatar');

    const formattedMsg = {
      ...populatedMsg.toObject(),
      senderName: populatedMsg.senderId?.displayName || 'Người dùng Zolo',
      avatar: populatedMsg.senderId?.avatar || null,
      senderId: populatedMsg.senderId?._id || populatedMsg.senderId,
    };

    // ── Cập nhật Metadata Conversation ────────────────────────────
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageId: newMessage._id,
      lastMessagePreview: `[Bình chọn] ${topic}`,
      lastMessageTime: newMessage.createdAt,
    });

    // ── Tăng unreadCount cho các thành viên khác ─────────────────
    await ConversationMember.updateMany(
      { conversationId, userId: { $ne: senderId }, leftAt: null },
      { $inc: { unreadCount: 1 } }
    );

    // ── Lấy danh sách thành viên để gửi Socket & Notification ─────
    const allMembers = await ConversationMember.find({ conversationId, leftAt: null }, { userId: 1 });

    // ── Phát Socket Real-time ─────────────────────────────────────
    const io = getIO();
    if (io) {
      allMembers.forEach(({ userId: memberId }) => {
        io.to(`user:${memberId.toString()}`).emit('chat:new-message', {
          conversationId,
          message: formattedMsg,
        });
      });
    }

    // ── Gửi Thông báo đẩy (Push Notification) ──────────────────────
    try {
      await notifyNewMessage({
        conversationId,
        messageId: newMessage._id,
        senderId,
        senderName: req.user.displayName,
        messageType: 'poll',
        messageContent: `[Bình chọn] ${topic}`,
        recipientIds: allMembers.map((m) => m.userId),
      });
    } catch (err) {
      console.error('Notify poll error:', err.message);
    }

    res.status(201).json(formattedMsg);
  } catch (err) {
    console.error('createPoll error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo bình chọn.' });
  }
};

exports.votePoll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { optionId, optionIds } = req.body;
    const userId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message || message.type !== 'poll') {
      return res.status(404).json({ message: 'Không tìm thấy cuộc bình chọn.' });
    }

    const member = await requireActiveMembership(message.conversationId, userId);
    if (message.topicId) {
      const permission = await getEffectiveTopicPermission(member, message.topicId);
      if (!permission.canAccess) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập kênh chứa bình chọn này' });
      }
    }

    const payload = JSON.parse(JSON.stringify(message.payload));
    let { options, multipleChoice = false } = payload;
    let updated = false;

    // ── Chuẩn hóa dữ liệu đầu vào ─────────────────────────────────────
    const votedNewOptions = (req.body.votedNewOptions || []).map(t => t.trim());
    const newlyAddedTexts = (req.body.newOptions || []).map(t => t.trim());
    const targetIds = (optionIds && Array.isArray(optionIds)) 
      ? optionIds.map(id => id.toString()) 
      : (optionId ? [optionId.toString()] : []);

    // FIX: Nếu text trong `votedNewOptions` thực chất đã tồn tại trong `options`,
    // hãy chuyển nó thành một lượt bầu chọn ID tương ứng để tránh bị bỏ sót.
    votedNewOptions.forEach(text => {
      const match = options.find(o => o.text.toLowerCase() === text.toLowerCase());
      if (match && !targetIds.includes(match.id)) {
        targetIds.push(match.id);
      }
    });

    // ── 1. Thêm phương án mới thực sự ──────────────────────────────────
    if (req.body.newOptions && Array.isArray(req.body.newOptions)) {
      req.body.newOptions.forEach(optText => {
        const trimmed = optText.trim();
        // Chỉ thêm nếu text chưa tồn tại
        if (trimmed && !options.some(o => o.text.toLowerCase() === trimmed.toLowerCase())) {
          const newId = (options.length > 0 ? Math.max(...options.map(o => parseInt(o.id) || 0)) + 1 : 1).toString();
          const shouldVote = votedNewOptions.some(t => t.toLowerCase() === trimmed.toLowerCase());
          const newOption = {
            id: newId,
            text: trimmed,
            voterIds: shouldVote ? [userId] : []
          };
          options.push(newOption);
          updated = true;
        }
      });
    }

    const isClearRequest = targetIds.length === 0 && votedNewOptions.length === 0;

    // ── 2. Cập nhật lượt bầu chọn cho toàn bộ Options ──────────────────
    options.forEach(opt => {
      const alreadyVoted = (opt.voterIds || []).some(v => (v._id || v || '').toString() === userId);
      const isNewlyAdded = newlyAddedTexts.some(t => t.toLowerCase() === opt.text.toLowerCase());
      
      if (targetIds.includes(opt.id)) {
        if (!alreadyVoted) {
          opt.voterIds.push(userId);
          updated = true;
        }
      } else {
        // Nếu không nằm trong target hiện tại
        if (alreadyVoted && !isNewlyAdded) {
          // Clear nếu là chọn 1 hoặc client gửi danh sách ID cụ thể (kể cả mảng rỗng [])
          if (!multipleChoice || Array.isArray(optionIds)) {
            opt.voterIds = opt.voterIds.filter(v => (v._id || v || '').toString() !== userId);
            updated = true;
          }
        }
      }
    });

    if (!updated && !isClearRequest && targetIds.length > 0) {
      // Đánh dấu là có thay đổi nếu có thêm phương án mới kể cả khi không thay đổi vote cũ
      if (req.body.newOptions) updated = true;
    }

    message.payload = payload;
    message.markModified('payload');
    await message.save();

    // Re-population voters for real-time display
    const allVoterIds = [...new Set(options.flatMap(opt => (opt.voterIds || []).map(v => (v?._id || v || '').toString())))].filter(id => id);
    const voters = await User.find({ _id: { $in: allVoterIds } }).select('displayName avatar').lean();
    const voterMap = {};
    voters.forEach(v => voterMap[v._id.toString()] = v);

    options.forEach(opt => {
      opt.voterIds = (opt.voterIds || []).map(vid => voterMap[(vid?._id || vid || '').toString()] || vid);
    });

    const populatedMsg = await Message.findById(messageId).populate('senderId', 'displayName avatar').lean();
    if (populatedMsg) populatedMsg.payload = payload; 

    const finalFormattedMsg = {
      ...populatedMsg,
      senderName: populatedMsg.senderId?.displayName || 'Người dùng Zolo',
      avatar: populatedMsg.senderId?.avatar || null,
      senderId: populatedMsg.senderId?._id || populatedMsg.senderId
    };

    const allMembers = await ConversationMember.find({ conversationId: message.conversationId, leftAt: null }, { userId: 1 });
    const io = getIO();
    if (io) {
      allMembers.forEach(({ userId: memberId }) => {
        io.to(`user:${memberId.toString()}`).emit('chat:update-poll', finalFormattedMsg);
      });
    }

    res.json(finalFormattedMsg);
  } catch (err) {
    console.error('votePoll error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi bầu chọn.' });
  }
};
