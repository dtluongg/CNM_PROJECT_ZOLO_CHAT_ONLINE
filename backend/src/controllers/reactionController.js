const mongoose = require('mongoose');
const Message = require('../models/messageModel');
const MessageReaction = require('../models/messageReactionModel');
const ReactionType = require('../models/reactionTypeModel');
const ConversationMember = require('../models/conversationMemberModel');
const { getIO } = require('../socket/socketManager');

/** Kiểm tra user có quyền trong cuộc hội thoại không */
const checkMembership = async (conversationId, userId) => {
    const member = await ConversationMember.findOne({
        conversationId,
        userId,
        leftAt: null,
    });
    if (!member) {
        const err = new Error('Bạn không có quyền thực hiện hành động này');
        err.statusCode = 403;
        throw err;
    }
    return member;
};

/** Lấy tất cả loại reaction được phép */
const getAllReactionTypes = async (req, res) => {
    try {
        const types = await ReactionType.find().sort({ order: 1 });
        res.status(200).json({ data: types });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách biểu cảm' });
    }
};

/** Thả hoặc hủy reaction */
const toggleReaction = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({ message: 'Thiếu thông tin biểu cảm' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Tin nhắn không tồn tại' });
        }

        // Kiểm tra tin nhắn đã thu hồi chưa
        if (message.revoked) {
            return res.status(400).json({ message: 'Không thể thả biểu cảm vào tin nhắn đã thu hồi' });
        }

        // Kiểm tra quyền thành viên
        await checkMembership(message.conversationId, userId);

        // Tìm reaction cũ của user này trên tin nhắn này
        const existingReaction = await MessageReaction.findOne({ messageId, userId });

        let action = '';
        if (existingReaction) {
            if (existingReaction.emoji === emoji) {
                // Nếu cùng biểu tượng -> Xóa (Toggle off)
                await MessageReaction.findByIdAndDelete(existingReaction._id);
                action = 'removed';
            } else {
                // Nếu khác biểu tượng -> Cập nhật
                existingReaction.emoji = emoji;
                await existingReaction.save();
                action = 'updated';
            }
        } else {
            // Chưa có -> Tạo mới
            await MessageReaction.create({ messageId, userId, emoji });
            action = 'added';
        }

        // 1. Tính toán lại bảng thống kê Reaction mới nhất của tin nhắn này
        const allReactions = await MessageReaction.find({ messageId });
        const reactionsCount = {};
        allReactions.forEach(r => {
            reactionsCount[r.emoji] = (reactionsCount[r.emoji] || 0) + 1;
        });

        // 2. Phát Socket real-time tới room conversation kèm bảng thống kê mới nhất
        const io = getIO();
        io.to(`conv:${message.conversationId.toString()}`).emit('chat:message-reaction', {
            conversationId: message.conversationId.toString(),
            messageId: messageId.toString(),
            userId,
            emoji,
            action,
            reactions: reactionsCount // Gửi kèm bảng đếm mới nhất
        });


        res.status(200).json({ message: 'Thành công', action });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('toggleReaction error:', error);
        res.status(500).json({ message: 'Lỗi server khi thả biểu cảm' });
    }
};

/** Lấy danh sách người đã thả biểu cảm cho 1 tin nhắn */
const getMessageReactions = async (req, res) => {
    try {
        const { messageId } = req.params;
        const reactions = await MessageReaction.find({ messageId })
            .populate('userId', 'displayName avatar')
            .sort({ createdAt: -1 });

        res.status(200).json({ data: reactions });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách reaction' });
    }
};

module.exports = {
    getAllReactionTypes,
    toggleReaction,
    getMessageReactions
};
