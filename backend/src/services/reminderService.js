const cron = require('node-cron');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const { getIO } = require('../socket/socketManager');

/**
 * reminderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Background worker to check and trigger reminders.
 * Runs every 10 seconds.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const initReminderCron = () => {
  // Chạy mỗi 10 giây (00, 10, 20, 30, 40, 50) để đảm bảo độ chính xác cao nhất
  cron.schedule('*/10 * * * * *', async () => {
    try {
      const now = new Date();
      // Thêm buffer 1 giây để "đón đầu" những nhắc hẹn vừa tới hoặc lệch mili giây
      const lookAhead = new Date(now.getTime() + 1000);
 
      // Tìm các tin nhắn loại reminder chưa kích hoạt và đã đến giờ
      const dueReminders = await Message.find({
        type: 'reminder',
        'payload.isTriggered': { $ne: true },
        'payload.reminderTime': { $lte: lookAhead },
        revoked: false
      }).populate('senderId', 'displayName');
 
      if (dueReminders.length > 0) {
        console.log(`[ReminderService] Found ${dueReminders.length} due reminders at ${now.toISOString()}`);
        for (const reminder of dueReminders) {
          await triggerReminder(reminder);
        }
      }
    } catch (err) {
      console.error('[ReminderService] Cron error:', err);
    }
  });
 
  console.log('[ReminderService] Cron job initialized (every 10 seconds)');
};

const triggerReminder = async (reminder) => {
  try {
    const io = getIO();
    const conversationId = reminder.conversationId;
    const senderName = reminder.senderId?.displayName || 'Ai đó';
    const content = reminder.payload?.content || reminder.content || 'Nhắc hẹn đến giờ';

    // 1. Đánh dấu đã kích hoạt
    await Message.updateOne(
      { _id: reminder._id },
      { $set: { 'payload.isTriggered': true } }
    );

    // 2. Tạo tin nhắn hệ thống thông báo
    const systemContent = `Nhắc hẹn: ${content}`;
    const systemMsg = await Message.create({
      conversationId,
      type: 'system',
      content: systemContent,
      payload: {
        event: 'reminder_triggered',
        originalReminderId: reminder._id,
        reminderContent: content,
        triggeredAt: new Date()
      }
    });

    // 3. Cập nhật conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageId: systemMsg._id,
      lastMessagePreview: systemContent,
      lastMessageTime: systemMsg.createdAt,
    });

    // 4. Reset unreadCount cho tất cả member (để họ thấy tin nhắc nhở)
    await ConversationMember.updateMany(
      { conversationId, leftAt: null },
      { $inc: { unreadCount: 1 } }
    );

    // 5. Emit socket cho tất cả members
    const formatted = {
      _id: systemMsg._id,
      conversationId: conversationId.toString(),
      type: 'system',
      content: systemContent,
      payload: systemMsg.payload,
      createdAt: systemMsg.createdAt,
      time: new Date(systemMsg.createdAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };


    // Backup emit to generic user rooms if needed (optional since we'll use conversation room)
    // For Zolo, it seems they use user:{userId} pattern
    const allMembers = await ConversationMember.find({ conversationId, leftAt: null }, { userId: 1 });
    allMembers.forEach(({ userId }) => {
      const userIdStr = userId.toString();
      io.to(`user:${userIdStr}`).emit('chat:new-message', {
        conversationId: conversationId.toString(),
        message: formatted,
      });

      // Gửi tín hiệu chuông báo nhắc hẹn đặc biệt
      io.to(`user:${userIdStr}`).emit('chat:reminder-alert', {
        conversationId: conversationId.toString(),
        reminderId: reminder._id.toString(),
        content: content,
        senderName: senderName
      });
 
      // Gửi tín hiệu cập nhật tin nhắn gốc (CỰC KỲ QUAN TRỌNG để Mobile đổi màu thẻ ngay lập tức)
      io.to(`user:${userIdStr}`).emit('chat:message-edited', {
        conversationId: conversationId.toString(),
        message: {
          ...reminder.toObject(),
          payload: { ...reminder.payload, isTriggered: true }
        }
      });
    });

    console.log(`[ReminderService] Triggered reminder ${reminder._id} for conversation ${conversationId}`);
  } catch (err) {
    console.error(`[ReminderService] Error triggering reminder ${reminder._id}:`, err);
  }
};

module.exports = { initReminderCron };
