const storyModel = require('../models/storyModel');
const friendshipModel = require('../models/friendshipModel');
const userModel = require('../models/userModel');
const conversationModel = require('../models/conversationModel');
const messageModel = require('../models/messageModel');
const conversationMemberModel = require('../models/conversationMemberModel');
const { getIO } = require('../socket/socketManager');

// ════════════════════════════════════════════════════════════════
//  TẠO STORY MỚI
// ════════════════════════════════════════════════════════════════
const createStory = async (req, res) => {
    try {
        const { mediaUrl, mediaType } = req.body;
        const userId = req.user._id;

        if (!mediaUrl) {
            return res.status(400).json({ message: 'mediaUrl là bắt buộc' });
        }

        // Tự động hết hạn sau 24 giờ
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const newStory = await storyModel.create({
            user: userId,
            mediaUrl,
            mediaType: mediaType || 'image',
            expiresAt
        });

        const populatedStory = await newStory.populate('user', 'displayName avatar usernameColor');

        // Phát tín hiệu Real-time qua Socket.io
        const io = getIO();
        if (io) {
            io.emit('story:new', { 
                storyId: populatedStory._id, 
                userId: userId,
                displayName: req.user.displayName 
            });
        }

        return res.status(201).json({
            message: 'Đăng tin thành công',
            story: populatedStory
        });
    } catch (error) {
        console.error('createStory error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi đăng tin' });
    }
};

// ════════════════════════════════════════════════════════════════
//  LẤY BẢN TIN (Feed) - Của mình và bạn bè
// ════════════════════════════════════════════════════════════════
const getStoriesFeed = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Tìm IDs của bạn bè
        const friendships = await friendshipModel.find({
            $or: [
                { userId1: userId },
                { userId2: userId }
            ],
            isBlockedBy: null
        });

        const friendIds = friendships.map(f => 
            f.userId1.toString() === userId.toString() ? f.userId2 : f.userId1
        );

        // 2. Lấy danh sách IDs (bao gồm cả bản thân)
        const relevantUserIds = [...friendIds, userId];

        // 3. Truy vấn stories còn hạn
        const stories = await storyModel.find({
            user: { $in: relevantUserIds },
            expiresAt: { $gt: new Date() }
        })
        .populate('user', 'displayName avatar usernameColor')
        .sort({ createdAt: -1 });

        // 4. Nhóm stories theo user để dễ hiển thị
        const grouped = stories.reduce((acc, story) => {
            const uid = story.user._id.toString();
            if (!acc[uid]) {
                acc[uid] = {
                    user: story.user,
                    stories: []
                };
            }
            acc[uid].stories.push(story);
            return acc;
        }, {});

        return res.status(200).json({
            feed: Object.values(grouped)
        });
    } catch (error) {
        console.error('getStoriesFeed error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi lấy bản tin' });
    }
};

// ════════════════════════════════════════════════════════════════
//  PHẢN HỒI STORY (Gửi tin nhắn Inbox)
// ════════════════════════════════════════════════════════════════
const replyToStory = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { storyId, content, isHeart } = req.body;

        if (!storyId || !content) {
            return res.status(400).json({ message: 'Thiếu thông tin storyId hoặc nội dung phản hồi' });
        }

        const story = await storyModel.findById(storyId).populate('user');
        if (!story) {
            return res.status(404).json({ message: 'Không tìm thấy tin hoặc tin đã hết hạn' });
        }

        // 1. Nếu là Heart Reaction, chỉ cập nhật trạng thái đã thả tim và không gửi chat
        if (isHeart || content === '❤️') {
            await storyModel.updateOne(
                { _id: storyId, 'viewers.userId': senderId },
                { $set: { 'viewers.$.hasHeart': true } }
            );
            return res.status(200).json({ message: 'Đã thả tim story' });
        }

        const receiverId = story.user._id;
        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({ message: 'Bạn không thể phản hồi tin của chính mình' });
        }

        // 2. Tìm hoặc tạo cuộc hội thoại DM chuẩn (theo logic của conversationController)
        const myMemberships = await conversationMemberModel.find({ userId: senderId }).select('conversationId').lean();
        const myConvIds = myMemberships.map(m => m.conversationId);
        
        const sharedMember = await conversationMemberModel.findOne({
            conversationId: { $in: myConvIds },
            userId: receiverId,
            leftAt: null
        }).lean();

        let conversationId = null;
        if (sharedMember) {
            const existingDm = await conversationModel.findOne({
                _id: sharedMember.conversationId,
                type: 'dm'
            }).select('_id').lean();
            if (existingDm) conversationId = existingDm._id;
        }

        if (!conversationId) {
            const newConv = await conversationModel.create({
                type: 'dm',
                createdBy: senderId,
                lastMessagePreview: `[Phản hồi tin] ${content}`,
                lastMessageTime: new Date()
            });
            conversationId = newConv._id;

            await conversationMemberModel.create([
                { conversationId, userId: senderId, role: 'member' },
                { conversationId, userId: receiverId, role: 'member' }
            ]);
        }

        // 3. Tạo tin nhắn phản hồi
        const newMessage = await messageModel.create({
            conversationId,
            senderId,
            type: 'text',
            content: content,
            payload: {
                type: 'story_reply',
                storyId: story._id,
                mediaUrl: story.mediaUrl,
                mediaType: story.mediaType
            }
        });

        // 4. Cập nhật trạng thái cuộc hội thoại
        const previewText = `[Phản hồi tin] ${content}`;
        const shortPreview = previewText.length > 60 ? previewText.slice(0, 60) + '…' : previewText;
        
        await conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageId: newMessage._id,
            lastMessagePreview: shortPreview,
            lastMessageTime: newMessage.createdAt,
        });

        await conversationMemberModel.updateOne(
            { conversationId, userId: receiverId, leftAt: null },
            { $inc: { unreadCount: 1 }, $set: { isDeleted: false, deletedAt: null } }
        );

        // 5. Phát Socket
        try {
            const io = getIO();
            const sender = await userModel.findById(senderId).select('displayName avatar');
            
            const formattedMessage = {
                _id: newMessage._id,
                conversationId,
                senderId: senderId,
                senderName: sender.displayName,
                avatar: sender.avatar,
                type: newMessage.type,
                content: newMessage.content,
                payload: newMessage.payload || {},
                createdAt: newMessage.createdAt
            };
            [senderId, receiverId].forEach(pid => {
                io.to(`user:${pid.toString()}`).emit('chat:new-message', {
                    conversationId,
                    message: formattedMessage
                });
            });
        } catch (err) { 
            console.error('Socket broadcast error in replyToStory:', err.message);
        }

        return res.status(200).json({
            message: 'Đã gửi phản hồi',
            chatMessage: newMessage
        });
    } catch (error) {
        console.error('replyToStory error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi phản hồi tin' });
    }
};

// ════════════════════════════════════════════════════════════════
//  ĐÁNH DẤU ĐÃ XEM TIN
// ════════════════════════════════════════════════════════════════
const markStoryAsViewed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        // Cập nhật nguyên tử: Chỉ push người xem nếu userId chưa tồn tại trong mảng viewers
        const updatedStory = await storyModel.findOneAndUpdate(
            { 
                _id: id, 
                "viewers.userId": { $ne: userId } 
            },
            { 
                $push: { viewers: { userId, viewedAt: new Date() } } 
            },
            { new: true }
        );

        return res.status(200).json({ 
            message: updatedStory ? 'Đã ghi nhận lượt xem' : 'Đã xem trước đó' 
        });
    } catch (error) {
        console.error('markStoryAsViewed error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// ════════════════════════════════════════════════════════════════
//  LẤY DANH SÁCH NGƯỜI XEM (Chỉ chủ tin)
// ════════════════════════════════════════════════════════════════
const getStoryViewers = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const story = await storyModel.findById(id)
            .populate('viewers.userId', 'displayName avatar usernameColor');

        if (!story) {
            return res.status(404).json({ message: 'Không tìm thấy tin' });
        }

        if (story.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền xem danh sách người xem của tin này' });
        }

        // Lọc trùng (deduplicate) để đảm bảo an toàn nếu dữ liệu cũ đã bị lỗi
        const uniqueViewers = [];
        const seenUserIds = new Set();

        story.viewers.forEach(v => {
            if (v.userId && !seenUserIds.has(v.userId._id.toString())) {
                seenUserIds.add(v.userId._id.toString());
                uniqueViewers.push(v);
            }
        });

        return res.status(200).json({
            viewers: uniqueViewers,
            totalViews: uniqueViewers.length,
            totalHearts: uniqueViewers.filter(v => v.hasHeart).length
        });
    } catch (error) {
        console.error('getStoryViewers error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// ════════════════════════════════════════════════════════════════
//  XÓA STORY (Chỉ chủ tin)
// ════════════════════════════════════════════════════════════════
const deleteStory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const story = await storyModel.findById(id);

        if (!story) {
            return res.status(404).json({ message: 'Không tìm thấy tin' });
        }

        // Kiểm tra quyền sở hữu
        if (story.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền xóa tin này' });
        }

        await storyModel.findByIdAndDelete(id);

        // Phát tín hiệu Real-time qua Socket.io
        const io = getIO();
        if (io) {
            io.emit('story:deleted', { 
                storyId: id,
                authorId: userId 
            });
        }

        return res.status(200).json({ message: 'Đã xóa tin thành công' });
    } catch (error) {
        console.error('deleteStory error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi xóa tin' });
    }
};

module.exports = {
    createStory,
    getStoriesFeed,
    replyToStory,
    markStoryAsViewed,
    getStoryViewers,
    deleteStory
};
