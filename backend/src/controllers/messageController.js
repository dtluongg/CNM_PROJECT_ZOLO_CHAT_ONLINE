/**
 * messageController.js
 * ──────────────────────────────────────────────────────────────────────────
 * Xử lý gửi và lấy tin nhắn trong conversation.
 * Hỗ trợ: text, voice (thoại), image, file.
 * Sau khi lưu DB → emit socket event tới mọi thành viên.
 */

const mongoose = require('mongoose');
const Message = require('../models/messageModel');
const Attachment = require('../models/attachmentModel');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const MessageReaction = require('../models/messageReactionModel');
const MessageRead = require('../models/messageReadModel');
const { getIO } = require('../socket/socketManager');
const { notifyNewMessage } = require('../services/notificationService');


// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

/** Kiểm tra user là thành viên active của conversation. */
const requireMembership = async (conversationId, userId) => {
    const member = await ConversationMember.findOne({
        conversationId,
        userId,
        leftAt: null,
    });
    if (!member) {
        const err = new Error('Bạn không thuộc cuộc trò chuyện này');
        err.statusCode = 403;
        throw err;
    }
    return member;
};

/** Chuẩn hóa message document thành object trả về client. */
const formatMsg = (msg, sender) => ({
    _id: msg._id,
    conversationId: msg.conversationId,
    senderId: sender?._id || msg.senderId?._id || msg.senderId,
    senderName: sender?.displayName || msg.senderId?.displayName || 'Unknown',
    avatar: sender?.avatar || msg.senderId?.avatar || null,
    type: msg.type,
    content: msg.content,
    payload: msg.payload || {},
    replyToMessageId: msg.replyToMessageId || null,
    forwardFromMessageId: msg.forwardFromMessageId || null,
    edited: msg.edited,
    deleted: msg.deleted,
    revoked: msg.revoked,
    createdAt: msg.createdAt,
});

// ═════════════════════════════════════════════════════════════════════════
//  POST /backend/api/messages/:conversationId
//  Gửi tin nhắn mới vào conversation.
//
//  Body (JSON):
//    type          'text' | 'voice' | 'image' | 'file'   (default: 'text')
//    content       chuỗi văn bản (bắt buộc khi type='text')
//    attachmentId  Attachment._id (bắt buộc khi type != 'text')
//    replyToMessageId  (optional)
//
//  Response 201:
//    { message, data: <formattedMessage> }
// ═════════════════════════════════════════════════════════════════════════
const sendMessage = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { conversationId } = req.params;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        await requireMembership(conversationId, userId);

        const { type = 'text', content = '', attachmentId, replyToMessageId, forwardFromMessageId } = req.body;

        const ALLOWED_TYPES = ['text', 'voice', 'image', 'file'];
        if (!ALLOWED_TYPES.includes(type)) {
            return res.status(400).json({ message: `type phải là: ${ALLOWED_TYPES.join(', ')}` });
        }

        // ── Xử lý Forward (nếu có) ──────────────────────────────────────
        let finalType = type;
        let finalContent = content;
        let finalPayload = {};
        let attachment = null;

        if (isValidId(forwardFromMessageId)) {
            const originalMsg = await Message.findById(forwardFromMessageId);
            if (!originalMsg) {
                return res.status(404).json({ message: 'Tin nhắn gốc không tồn tại' });
            }
            finalType = originalMsg.type;
            finalContent = originalMsg.content;
            finalPayload = originalMsg.payload || {};
            // Đối với forward, ta không bắt buộc check attachment ownership lại
            // vì ta copy payload trực tiếp từ tin nhắn đã tồn tại hợp lệ.
        } else {
            // ── Validate nội dung thông thường ─────────────────────────────
            if (type === 'text' && !content.trim()) {
                return res.status(400).json({ message: 'Nội dung tin nhắn không được trống' });
            }

            // ── Xử lý attachment cho voice / image / file ───────────────────
            if (type !== 'text') {
                if (!isValidId(attachmentId)) {
                    return res.status(400).json({ message: 'attachmentId không hợp lệ' });
                }
                attachment = await Attachment.findById(attachmentId);
                if (!attachment) {
                    return res.status(404).json({ message: 'Attachment không tồn tại' });
                }
                if (attachment.uploadedBy.toString() !== userId) {
                    return res.status(403).json({ message: 'Không có quyền dùng attachment này' });
                }

                finalPayload = {
                    url: attachment.url,
                    fileName: attachment.fileName || '',
                    fileSize: attachment.fileSize || 0,
                    mimeType: attachment.mimeType || '',
                    duration: attachment.duration || null,
                };
            }
        }

        // ── Preview text hiển thị ở danh sách conversation ────────────
        const preview =
            finalType === 'text' ? finalContent.trim() :
                finalType === 'voice' ? '[Tin nhắn thoại]' :
                    finalType === 'image' ? '[Hình ảnh]' :
            /* file */         (finalPayload?.fileName || '[File đính kèm]');

        // ── Tạo message ────────────────────────────────────────────────
        const message = await Message.create({
            conversationId,
            senderId: userId,
            content: finalType === 'text' ? finalContent.trim() : preview,
            type: finalType,
            payload: finalPayload,
            replyToMessageId:
                isValidId(replyToMessageId) ? replyToMessageId : null,
            forwardFromMessageId:
                isValidId(forwardFromMessageId) ? forwardFromMessageId : null,
        });

        // Populate replyToMessageId if exists
        if (message.replyToMessageId) {
            await message.populate({
                path: 'replyToMessageId',
                populate: { path: 'senderId', select: 'displayName' }
            });
        }

        // ── Gắn messageId vào attachment (nếu gửi mới, không phải forward) ──
        if (attachment) {
            await Attachment.findByIdAndUpdate(attachment._id, { messageId: message._id });
        }

        // ── Cập nhật lastMessage của conversation ─────────────────────
        const shortPreview = preview.length > 60 ? preview.slice(0, 60) + '…' : preview;
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageId: message._id,
            lastMessagePreview: shortPreview,
            lastMessageTime: message.createdAt,
        });

        // ── Tăng unreadCount cho tất cả thành viên khác ───────────────
        await ConversationMember.updateMany(
            { conversationId, userId: { $ne: userId }, leftAt: null },
            { $inc: { unreadCount: 1 } }
        );

        // ── Phát real-time tới tất cả thành viên ─────────────────────
        const allMembers = await ConversationMember.find(
            { conversationId, leftAt: null },
            { userId: 1 }
        );

        const io = getIO();
        const formatted = formatMsg(message, req.user);

        allMembers.forEach(({ userId: memberId }) => {
            io.to(`user:${memberId.toString()}`).emit('chat:new-message', {
                conversationId,
                message: formatted,
            });
        });

        // ── Tạo thông báo cho các thành viên khác theo notification settings ──
        try {
            await notifyNewMessage({
                conversationId,
                messageId: message._id,
                senderId: req.user._id,
                senderName: req.user.displayName,
                messageType: finalType,
                messageContent: finalType === 'text' ? finalContent : preview,
                recipientIds: allMembers.map((m) => m.userId),
            });
        } catch (notifyErr) {
            console.error('notifyNewMessage error:', notifyErr.message);
        }

        return res.status(201).json({ message: 'Gửi tin nhắn thành công', data: formatted });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        console.error('sendMessage error:', err);
        return res.status(500).json({ message: 'Lỗi server khi gửi tin nhắn' });
    }
};

// ═════════════════════════════════════════════════════════════════════════
//  GET /backend/api/messages/:conversationId
//  Lấy tin nhắn (cursor-based pagination, mới nhất trước).
//
//  Query:
//    before  messageId – lấy tin nhắn cũ hơn mốc này (optional)
//    limit   số lượng (default 30, max 50)
//
//  Response 200:
//    { messages: [...], hasMore: boolean }
// ═════════════════════════════════════════════════════════════════════════
const getMessages = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { conversationId } = req.params;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        await requireMembership(conversationId, userId);

        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
        const before = req.query.before;

        const filter = {
            conversationId,
            deleted: false,
            deletedBy: { $ne: new mongoose.Types.ObjectId(userId) }
        };
        if (isValidId(before)) {
            filter._id = { $lt: new mongoose.Types.ObjectId(before) };
        }

        const raw = await Message.find(filter)
            .sort({ _id: -1 })   // newest first cho pagination
            .limit(limit)
            .populate('senderId', 'displayName avatar')
            .populate({
                path: 'replyToMessageId',
                populate: { path: 'senderId', select: 'displayName' }
            })
            .lean();

        const msgIds = raw.map(m => m._id);
        const [allReactions, allReads] = await Promise.all([
            MessageReaction.find({ messageId: { $in: msgIds } }).lean(),
            MessageRead.find({ messageId: { $in: msgIds } })
                .populate('userId', 'displayName avatar')
                .lean()
        ]);

        // Đảo ngược để hiển thị theo chiều thời gian (cũ → mới)
        const messages = raw.reverse().map(msg => {
            // Lọc reaction của tin nhắn này
            const reactions = allReactions.filter(r => r.messageId.toString() === msg._id.toString());

            // Gom nhóm reaction: { "❤️": 2, "👍": 5 }
            const reactionCounts = reactions.reduce((acc, curr) => {
                acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                return acc;
            }, {});

            // Reaction của chính user đang gọi API
            const myReaction = reactions.find(r => r.userId.toString() === userId)?.emoji || null;

            // Lọc và chuẩn hóa dữ liệu người đã đọc (ReadBy)
            const reads = allReads.filter(r => r.messageId.toString() === msg._id.toString());
            const readBy = reads.map(r => ({
                userId: r.userId?._id,
                displayName: r.userId?.displayName || 'Unknown',
                avatar: r.userId?.avatar || null,
                readAt: r.createdAt
            }));

            // Trả về object tin nhắn đã được chuẩn hóa
            return {
                _id: msg._id,
                conversationId: msg.conversationId,
                senderId: msg.senderId?._id || msg.senderId,
                senderName: msg.senderId?.displayName || 'Unknown',
                avatar: msg.senderId?.avatar || null,
                type: msg.type,
                content: msg.content,
                payload: msg.payload || {},
                replyToMessageId: msg.replyToMessageId || null,
                edited: msg.edited,
                revoked: msg.revoked, // Thêm revoked vào để FE xử lý UI
                createdAt: msg.createdAt,
                reactions: reactionCounts,
                myReaction: myReaction,
                readBy: readBy
            };
        });


        return res.status(200).json({ messages, hasMore: raw.length === limit });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        console.error('getMessages error:', err);
        return res.status(500).json({ message: 'Lỗi server khi lấy tin nhắn' });
    }
};

// ═════════════════════════════════════════════════════════════════════════
//  GET /backend/api/messages/:conversationId/attachments
//  Lấy danh sách ảnh và file đã gửi trong conversation.
//
//  Response 200:
//    { images: [...], files: [...] }
// ═════════════════════════════════════════════════════════════════════════
const getAttachments = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { conversationId } = req.params;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        await requireMembership(conversationId, userId);

        const msgs = await Message.find({
            conversationId,
            type: { $in: ['image', 'file'] },
            deleted: false,
            revoked: false,
        })
            .sort({ _id: -1 })
            .limit(60)
            .lean();

        const images = [];
        const files = [];

        for (const msg of msgs) {
            const item = {
                _id: msg._id,
                type: msg.type,
                url: msg.payload?.url || '',
                fileName: msg.payload?.fileName || msg.content || '',
                fileSize: msg.payload?.fileSize || 0,
                mimeType: msg.payload?.mimeType || '',
                createdAt: msg.createdAt,
            };
            if (msg.type === 'image') images.push(item);
            else files.push(item);
        }

        return res.status(200).json({ images, files });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        console.error('getAttachments error:', err);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// ═════════════════════════════════════════════════════════════════════════
//  PATCH /backend/api/messages/:messageId/revoke
//  Thu hồi tin nhắn của chính mình.
// ═════════════════════════════════════════════════════════════════════════
const revokeMessage = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { messageId } = req.params;

        if (!isValidId(messageId)) {
            return res.status(400).json({ message: 'messageId không hợp lệ' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Tin nhắn không tồn tại' });
        }

        // Chỉ chủ nhân tin nhắn mới được thu hồi
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền thu hồi tin nhắn này' });
        }

        if (message.revoked) {
            return res.status(400).json({ message: 'Tin nhắn đã được thu hồi trước đó' });
        }

        // Cập nhật trạng thái thu hồi
        message.revoked = true;
        message.revokedAt = new Date();
        message.revokedBy = userId;
        await message.save();

        // ── Cập nhật lastMessage của conversation nếu cần ─────────────
        const conversationId = message.conversationId;
        const conversation = await Conversation.findById(conversationId);
        let pinnedChanged = false;

        if (conversation) {
            if (conversation.lastMessageId?.toString() === messageId) {
                conversation.lastMessagePreview = '[Tin nhắn đã được thu hồi]';
            }

            // Tự động bỏ ghim nếu tin nhắn bị thu hồi
            const initialPinnedLength = conversation.pinnedMessages.length;
            conversation.pinnedMessages = conversation.pinnedMessages.filter(p => p.messageId.toString() !== messageId);
            if (conversation.pinnedMessages.length !== initialPinnedLength) {
                pinnedChanged = true;
            }

            await conversation.save();
        }

        // ── Phát real-time tới tất cả thành viên ─────────────────────
        const allMembers = await ConversationMember.find(
            { conversationId: message.conversationId, leftAt: null },
            { userId: 1 }
        );

        const io = getIO();
        allMembers.forEach(({ userId: memberId }) => {
            const memberSocketId = `user:${memberId.toString()}`;
            io.to(memberSocketId).emit('chat:message-revoked', {
                conversationId: message.conversationId,
                messageId: message._id,
            });

            if (pinnedChanged) {
                io.to(memberSocketId).emit('chat:unpin-message', {
                    conversationId: message.conversationId,
                    pinnedMessages: conversation.pinnedMessages
                });
            }
        });

        return res.status(200).json({ message: 'Thu hồi tin nhắn thành công', data: { _id: message._id, revoked: true } });
    } catch (err) {
        console.error('revokeMessage error:', err);
        return res.status(500).json({ message: 'Lỗi server khi thu hồi tin nhắn' });
    }
};

// ═════════════════════════════════════════════════════════════════════════
//  PATCH /backend/api/messages/:messageId
//  Chỉnh sửa nội dung tin nhắn văn bản.
// ═════════════════════════════════════════════════════════════════════════
const editMessage = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { messageId } = req.params;
        const { content } = req.body;

        if (!isValidId(messageId)) {
            return res.status(400).json({ message: 'messageId không hợp lệ' });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Tin nhắn không tồn tại' });
        }

        // Chỉ chủ nhân tin nhắn mới được sửa
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa tin nhắn này' });
        }

        if (message.revoked || message.deleted) {
            return res.status(400).json({ message: 'Không thể chỉnh sửa tin nhắn đã bị thu hồi hoặc xóa' });
        }

        if (message.type !== 'text') {
            return res.status(400).json({ message: 'Chỉ hỗ trợ chỉnh sửa tin nhắn văn bản' });
        }

        // Cập nhật
        message.content = content.trim();
        message.edited = true;
        message.editedAt = new Date();
        await message.save();

        // ── Cập nhật lastMessage của conversation nếu cần ─────────────
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation && conversation.lastMessageId?.toString() === messageId) {
            const shortPreview = message.content.length > 60 ? message.content.slice(0, 60) + '…' : message.content;
            await Conversation.findByIdAndUpdate(message.conversationId, {
                lastMessagePreview: shortPreview
            });
        }

        // ── Phát real-time tới tất cả thành viên ─────────────────────
        const allMembers = await ConversationMember.find(
            { conversationId: message.conversationId, leftAt: null },
            { userId: 1 }
        );

        const io = getIO();
        const formatted = formatMsg(message, req.user);

        allMembers.forEach(({ userId: memberId }) => {
            io.to(`user:${memberId.toString()}`).emit('chat:message-edited', {
                conversationId: message.conversationId,
                message: formatted,
            });
        });

        return res.status(200).json({ message: 'Chỉnh sửa tin nhắn thành công', data: formatted });
    } catch (err) {
        console.error('editMessage error:', err);
        return res.status(500).json({ message: 'Lỗi server khi chỉnh sửa tin nhắn' });
    }
};

// ═════════════════════════════════════════════════════════════════════════
//  POST /backend/api/messages/:conversationId/read/:messageId
//  Đánh dấu tin nhắn là đã đọc.
// ═════════════════════════════════════════════════════════════════════════
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { conversationId, messageId } = req.params;

        if (!isValidId(conversationId) || !isValidId(messageId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        await requireMembership(conversationId, userId);

        // 1. Lưu trạng thái đã đọc (upsert để tránh duplicate)
        await MessageRead.findOneAndUpdate(
            { messageId, userId },
            { conversationId, messageId, userId },
            { upsert: true, new: true }
        );

        // 2. Kiểm tra nếu tin nhắn này là cuối cùng thì reset unreadCount + xóa aiSummary
        const conv = await Conversation.findById(conversationId);
        if (conv && conv.lastMessageId?.toString() === messageId) {
            await ConversationMember.findOneAndUpdate(
                { conversationId, userId },
                {
                  unreadCount: 0,
                  lastReadMessageId: messageId,
                  'aiSummary.summary': null,       // Xóa summary vì đã đọc hết
                  'aiSummary.summarizedAt': null,
                  'aiSummary.unreadCount': 0,
                  'aiSummary.fromMessageId': null,
                }
            );
        }

        // 3. Phát socket thông báo cho mọi người trong conversation room
        const io = getIO();
        io.to(`user:${userId}`).emit('chat:unread-reset', { conversationId }); // Riêng cho mình để update unread ở sidebar

        // Broadcast tới những người khác
        const allMembers = await ConversationMember.find({ conversationId, leftAt: null }, { userId: 1 });
        allMembers.forEach(({ userId: memberId }) => {
            io.to(`user:${memberId.toString()}`).emit('chat:message-read', {
                conversationId,
                messageId,
                userId,
                displayName: req.user.displayName,
                avatar: req.user.avatar,
                readAt: new Date()
            });
        });

        return res.status(200).json({ message: 'Đã đánh dấu đã đọc' });
    } catch (err) {
        console.error('markAsRead error:', err);
        return res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc' });
    }
};

// ═════════════════════════════════════════════════════════════════════════
//  PATCH /backend/api/messages/:messageId/delete-for-me
//  Xóa tin nhắn ở phía người dùng hiện tại (ẩn đi).
// ═════════════════════════════════════════════════════════════════════════
const deleteMessageForMe = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { messageId } = req.params;

        if (!isValidId(messageId)) {
            return res.status(400).json({ message: 'messageId không hợp lệ' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Tin nhắn không tồn tại' });
        }

        // Kiểm tra membership của người xóa
        await requireMembership(message.conversationId, userId);

        // Đảm bảo deletedBy là một mảng (đối với tin nhắn cũ)
        if (!message.deletedBy) {
            message.deletedBy = [];
        }

        // Kiểm tra xem userId đã có trong danh sách xóa chưa
        const isAlreadyDeleted = message.deletedBy.some(id => id.toString() === userId);

        if (!isAlreadyDeleted) {
            message.deletedBy.push(userId);
            await message.save();

            // ── Phát Socket đồng bộ tới tất cả các kết nối của chính người dùng này ──
            const io = getIO();
            io.to(`user:${userId}`).emit('chat:message-deleted-for-me', {
                conversationId: message.conversationId,
                messageId: message._id.toString()
            });
        }

        return res.status(200).json({ message: 'Đã xóa tin nhắn cho bạn' });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        console.error('deleteMessageForMe error:', err);
        return res.status(500).json({ message: 'Lỗi server khi xóa tin nhắn' });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    getAttachments,
    revokeMessage,
    editMessage,
    markAsRead,
    deleteMessageForMe
};
