const Conversation = require("../models/conversationModel");
const ConversationMember = require("../models/conversationMemberModel.js");

const Message = require("../models/messageModel");
const MessageRead = require("../models/messageReadModel.js");
const MessageReaction = require("../models/messageReactionModel.js");

const {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} = require("../untils/messageHelper");

// ❌ XÓA dòng này
// const { io } = require("../socket/index");

// ✅ THAY bằng dòng này
const io = null;

const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
    const senderId = req.user._id;

    let conversation;

    if (!content) {
      return res.status(400).json({ message: "Thiếu nội dung" });
    }

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();

    // ✅ thêm check tránh lỗi
    if (io) {
      emitNewMessage(io, conversation, message);
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;

    if (!content) {
      return res.status(400).json("Thiếu nội dung");
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();

    // ✅ thêm check
    if (io) {
      emitNewMessage(io, conversation, message);
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

module.exports = {
  sendDirectMessage,
  sendGroupMessage,
};