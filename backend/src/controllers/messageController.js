/**
 * messageController.js
 * ──────────────────────────────────────────────────────────────────────────
 * Xử lý gửi và lấy tin nhắn trong conversation.
 * Hỗ trợ: text, voice (thoại), image, file.
 * Sau khi lưu DB → emit socket event tới mọi thành viên.
 */

const mongoose               = require('mongoose');
const Message                = require('../models/messageModel');
const Attachment             = require('../models/attachmentModel');
const Conversation           = require('../models/conversationModel');
const ConversationMember     = require('../models/conversationMemberModel');
const { getIO }              = require('../socket/socketManager');

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
    _id:              msg._id,
    conversationId:   msg.conversationId,
    senderId:         sender?._id  || msg.senderId,
    senderName:       sender?.displayName || 'Unknown',
    avatar:           sender?.avatar || null,
    type:             msg.type,
    content:          msg.content,
    payload:          msg.payload || {},
    replyToMessageId: msg.replyToMessageId || null,
    edited:           msg.edited,
    deleted:          msg.deleted,
    revoked:          msg.revoked,
    createdAt:        msg.createdAt,
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
        const userId         = req.user._id.toString();
        const { conversationId } = req.params;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        await requireMembership(conversationId, userId);

        const { type = 'text', content = '', attachmentId, replyToMessageId } = req.body;

        const ALLOWED_TYPES = ['text', 'voice', 'image', 'file'];
        if (!ALLOWED_TYPES.includes(type)) {
            return res.status(400).json({ message: `type phải là: ${ALLOWED_TYPES.join(', ')}` });
        }

        // ── Validate nội dung ───────────────────────────────────────────
        if (type === 'text' && !content.trim()) {
            return res.status(400).json({ message: 'Nội dung tin nhắn không được trống' });
        }

        // ── Xử lý attachment cho voice / image / file ───────────────────
        let attachment = null;
        let payload    = {};

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

            payload = {
                url:      attachment.url,
                fileName: attachment.fileName || '',
                fileSize: attachment.fileSize || 0,
                mimeType: attachment.mimeType || '',
                duration: attachment.duration || null, // giây (voice)
            };
        }

        // ── Preview text hiển thị ở danh sách conversation ────────────
        const preview =
            type === 'text'  ? content.trim() :
            type === 'voice' ? '[Tin nhắn thoại]' :
            type === 'image' ? '[Hình ảnh]' :
            /* file */         (attachment?.fileName || '[File đính kèm]');

        // ── Tạo message ────────────────────────────────────────────────
        const message = await Message.create({
            conversationId,
            senderId:    userId,
            content:     type === 'text' ? content.trim() : preview,
            type,
            payload,
            replyToMessageId:
                isValidId(replyToMessageId) ? replyToMessageId : null,
        });

        // ── Gắn messageId vào attachment ───────────────────────────────
        if (attachment) {
            await Attachment.findByIdAndUpdate(attachmentId, { messageId: message._id });
        }

        // ── Cập nhật lastMessage của conversation ─────────────────────
        const shortPreview = preview.length > 60 ? preview.slice(0, 60) + '…' : preview;
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageId:      message._id,
            lastMessagePreview: shortPreview,
            lastMessageTime:    message.createdAt,
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

        const io         = getIO();
        const formatted  = formatMsg(message, req.user);

        allMembers.forEach(({ userId: memberId }) => {
            io.to(`user:${memberId.toString()}`).emit('chat:new-message', {
                conversationId,
                message: formatted,
            });
        });

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
        const userId         = req.user._id.toString();
        const { conversationId } = req.params;

        if (!isValidId(conversationId)) {
            return res.status(400).json({ message: 'conversationId không hợp lệ' });
        }

        await requireMembership(conversationId, userId);

        const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit)  || 30));
        const before = req.query.before;

        const filter = { conversationId, deleted: false, revoked: false };
        if (isValidId(before)) {
            filter._id = { $lt: new mongoose.Types.ObjectId(before) };
        }

        const raw = await Message.find(filter)
            .sort({ _id: -1 })   // newest first cho pagination
            .limit(limit)
            .populate('senderId', 'displayName avatar')
            .lean();

        // Đảo ngược để hiển thị theo chiều thời gian (cũ → mới)
        const messages = raw.reverse().map(msg => ({
            _id:              msg._id,
            conversationId:   msg.conversationId,
            senderId:         msg.senderId?._id    || msg.senderId,
            senderName:       msg.senderId?.displayName || 'Unknown',
            avatar:           msg.senderId?.avatar  || null,
            type:             msg.type,
            content:          msg.content,
            payload:          msg.payload || {},
            replyToMessageId: msg.replyToMessageId || null,
            edited:           msg.edited,
            createdAt:        msg.createdAt,
        }));

        return res.status(200).json({ messages, hasMore: raw.length === limit });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        console.error('getMessages error:', err);
        return res.status(500).json({ message: 'Lỗi server khi lấy tin nhắn' });
    }
};

module.exports = { sendMessage, getMessages };
