const Message = require('../models/messageModel');
const User = require('../models/userModel');
const { getIO } = require('../socket/socketManager');

/**
 * Tạo bình chọn mới
 * body: { topic, options: [string] }
 */
exports.createPoll = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { topic, options, multipleChoice = false } = req.body;
    const senderId = req.user._id;

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
      }
    });

    const populatedMsg = await Message.findById(newMessage._id).populate('senderId', 'displayName avatar');

    const formattedMsg = {
      ...populatedMsg.toObject(),
      senderName: populatedMsg.senderId?.displayName || 'Người dùng Zolo',
      avatar: populatedMsg.senderId?.avatar || null,
      senderId: populatedMsg.senderId?._id || populatedMsg.senderId,
    };

    const io = getIO();
    if (io) io.to(conversationId).emit('chat:message', formattedMsg);

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

    const payload = JSON.parse(JSON.stringify(message.payload));
    let { options, multipleChoice = false } = payload;
    let updated = false;

    // 1. Thêm phương án mới nếu có
    const votedNewOptions = req.body.votedNewOptions || [];
    if (req.body.newOptions && Array.isArray(req.body.newOptions)) {
      req.body.newOptions.forEach(optText => {
        const trimmed = optText.trim();
        if (trimmed && !options.some(o => o.text === trimmed)) {
          const newId = (options.length + 1).toString();
          const shouldVote = votedNewOptions.includes(trimmed);
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

    const isClearRequest = !optionId && (!optionIds || optionIds.length === 0);
    const targetIds = (optionIds && Array.isArray(optionIds)) 
      ? optionIds 
      : (optionId ? [optionId] : []);

    // Map to track which options were JUST created in this request
    const newlyAddedTexts = (req.body.newOptions || []).map(t => t.trim());

    options.forEach(opt => {
      const alreadyVoted = opt.voterIds.some(v => (v._id || v || '').toString() === userId);
      const isNewlyAdded = newlyAddedTexts.includes(opt.text);
      
      if (isClearRequest) {
        if (alreadyVoted) {
          opt.voterIds = opt.voterIds.filter(v => (v._id || v || '').toString() !== userId);
          updated = true;
        }
      } else if (targetIds.includes(opt.id)) {
        if (!alreadyVoted) {
          opt.voterIds.push(userId);
          updated = true;
        }
      } else {
        // Only clear votes for existing options that were NOT in the target list
        // AND skip clearing if it's a newly added option that we just voted for
        if (alreadyVoted && !isNewlyAdded) {
          if (optionIds || !multipleChoice) {
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

    const io = getIO();
    if (io) {
      io.to(message.conversationId.toString()).emit('chat:update-poll', finalFormattedMsg);
      io.to(message.conversationId.toString()).emit('chat:message-updated', finalFormattedMsg);
    }

    res.json(finalFormattedMsg);
  } catch (err) {
    console.error('votePoll error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi bầu chọn.' });
  }
};
