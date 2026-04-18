const mongoose = require('mongoose');
const ConversationTopic = require('../models/conversationTopicModel');
const ConversationMember = require('../models/conversationMemberModel');
const Conversation = require('../models/conversationModel');

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

const requireAdminOrOwner = async (conversationId, userId) => {
    const member = await ConversationMember.findOne({
        conversationId,
        userId,
        leftAt: null,
        isDeleted: { $ne: true },
    });
    if (!member) {
        const err = new Error('Bạn không thuộc nhóm này');
        err.statusCode = 403;
        throw err;
    }
    if (!(member.role === 'owner' || member.role === 'admin' || member.canManageMembers)) {
        const err = new Error('Chỉ Owner/Admin mới được quản lý kênh');
        err.statusCode = 403;
        throw err;
    }
    return member;
};

const requireMembership = async (conversationId, userId) => {
    const member = await ConversationMember.findOne({
        conversationId,
        userId,
        leftAt: null,
        isDeleted: { $ne: true },
    });
    if (!member) {
        const err = new Error('Bạn không thuộc nhóm này');
        err.statusCode = 403;
        throw err;
    }
    return member;
};

// GET /conversations/:id/topics
const listTopics = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId } = req.params;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        const conversation = await Conversation.findById(conversationId).select('type');
        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (conversation.type !== 'group') return res.status(400).json({ message: 'Chỉ nhóm mới có topics' });

        await requireMembership(conversationId, userId);

        const topics = await ConversationTopic.find({ conversationId })
            .sort({ categoryName: 1, position: 1 })
            .lean();

        return res.status(200).json({ data: topics });
    } catch (error) {
        next(error);
    }
};

// POST /conversations/:id/topics
const createTopic = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId } = req.params;
        const { name, emoji, categoryName, position, description, channelType } = req.body;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên kênh là bắt buộc' });
        }

        const conversation = await Conversation.findById(conversationId).select('type');
        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (conversation.type !== 'group') return res.status(400).json({ message: 'Chỉ nhóm mới có topics' });

        await requireAdminOrOwner(conversationId, userId);

        const maxPositionDoc = await ConversationTopic.findOne({ conversationId })
            .sort({ position: -1 })
            .select('position')
            .lean();
        const nextPosition = position !== undefined ? Number(position) : (maxPositionDoc?.position ?? -1) + 1;

        const VALID_CHANNEL_TYPES = ['text', 'voice', 'system'];
        const topic = await ConversationTopic.create({
            conversationId,
            name: name.trim().toLowerCase().replace(/\s+/g, '-'),
            emoji: emoji || '💬',
            categoryName: categoryName || '',
            channelType: VALID_CHANNEL_TYPES.includes(channelType) ? channelType : 'text',
            position: nextPosition,
            description: (description || '').toString().slice(0, 200),
            createdBy: userId,
        });

        return res.status(201).json({ message: 'Tạo kênh thành công', data: topic });
    } catch (error) {
        next(error);
    }
};

// PATCH /conversations/:id/topics/:topicId
const updateTopic = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId, topicId } = req.params;
        const { name, emoji, categoryName, position, isLocked, description, channelType } = req.body;

        if (!isValidId(conversationId) || !isValidId(topicId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        await requireAdminOrOwner(conversationId, userId);

        const topic = await ConversationTopic.findOne({ _id: topicId, conversationId });
        if (!topic) return res.status(404).json({ message: 'Không tìm thấy kênh' });

        const VALID_CHANNEL_TYPES = ['text', 'voice', 'system'];
        if (name !== undefined) topic.name = name.trim().toLowerCase().replace(/\s+/g, '-');
        if (emoji !== undefined) topic.emoji = emoji;
        if (categoryName !== undefined) topic.categoryName = categoryName;
        if (position !== undefined) topic.position = Number(position);
        if (typeof isLocked === 'boolean') topic.isLocked = isLocked;
        if (description !== undefined) topic.description = (description || '').toString().slice(0, 200);
        if (channelType !== undefined && VALID_CHANNEL_TYPES.includes(channelType)) topic.channelType = channelType;

        await topic.save();

        return res.status(200).json({ message: 'Cập nhật kênh thành công', data: topic });
    } catch (error) {
        next(error);
    }
};

// DELETE /conversations/:id/topics/:topicId
const deleteTopic = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId, topicId } = req.params;

        if (!isValidId(conversationId) || !isValidId(topicId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        await requireAdminOrOwner(conversationId, userId);

        const topic = await ConversationTopic.findOneAndDelete({ _id: topicId, conversationId });
        if (!topic) return res.status(404).json({ message: 'Không tìm thấy kênh' });

        return res.status(200).json({ message: 'Đã xóa kênh thành công' });
    } catch (error) {
        next(error);
    }
};

module.exports = { listTopics, createTopic, updateTopic, deleteTopic };
