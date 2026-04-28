const ConversationMember = require('../models/conversationMemberModel');
const Message            = require('../models/messageModel');
const { summarize, translate }      = require('../services/aiService');

// ── Rate limit ───────────────────────────────────────────────────────────────
// key: `${userId}:${conversationId}` → lastCalledAt (timestamp)
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 30 * 1000; // 30 giây

/**
 * POST /api/messages/:conversationId/aiSummary
 * Tóm tắt các tin nhắn chưa đọc bằng AI Gemini 2.0 Flash.
 * Kết quả được lưu vào ConversationMember.aiSummary (persist qua reload).
 */
exports.summarizeUnread = async (req, res) => {
  try {
    const userId             = req.user?.id || req.user?._id;
    const { conversationId } = req.params;

    // ── 1. Lấy membership ───────────────────────────────────────────────────
    const membership = await ConversationMember.findOne({
      conversationId,
      userId,
      leftAt: null,
      isDeleted: false,
    });

    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });
    }

    // ── 2. Nếu đã có summary trong DB còn hiệu lực (unreadCount chưa đổi) ──
    const savedSummary = membership.aiSummary;
    if (
      savedSummary?.summary &&
      savedSummary.unreadCount === membership.unreadCount &&
      membership.unreadCount > 0
    ) {
      return res.json({
        summary:         savedSummary.summary,
        reason:          'cached_db',
        unreadCount:     membership.unreadCount,
        summarizedAt:    savedSummary.summarizedAt,
      });
    }

    // ── 3. Không có tin chưa đọc ─────────────────────────────────────────
    if (!membership.lastReadMessageId && membership.unreadCount === 0) {
      return res.json({
        summary: null,
        reason: 'no_unread',
        unreadCount: 0,
      });
    }

    // ── 4. Rate limit ────────────────────────────────────────────────────────
    const rateKey    = `${userId}:${conversationId}`;
    const lastCalled = rateLimitMap.get(rateKey);
    if (lastCalled && Date.now() - lastCalled < RATE_LIMIT_MS) {
      const wait = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastCalled)) / 1000);
      return res.status(429).json({
        message: `Vui lòng chờ ${wait} giây trước khi tóm tắt lại`,
      });
    }

    // ── 5. Query tin nhắn chưa đọc ──────────────────────────────────────────
    // Ưu tiên dùng fromMessageId từ frontend (snapshot trước markAsRead)
    // Fallback về lastReadMessageId hiện tại của DB nếu không có
    const queryFromId = req.body?.fromMessageId || membership.lastReadMessageId || null;

    let query = { conversationId, deleted: { $ne: true } };
    if (queryFromId) {
      query._id = { $gt: queryFromId };
    }

    const unreadMessages = await Message
      .find(query)
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('senderId', 'displayName')
      .lean();

    if (unreadMessages.length === 0) {
      return res.json({ summary: null, reason: 'no_unread', unreadCount: 0 });
    }

    // ── 6. Chuẩn bị dữ liệu cho AI ──────────────────────────────────────────
    const messagesForAI = unreadMessages.map((m) => ({
      senderName: m.senderId?.displayName || 'Người dùng',
      type:       m.type,
      content:    m.content,
      isRevoked:  m.revoked,
      fileName:   m.payload?.fileName || '',
    }));

    // ── 7. Gọi Gemini ────────────────────────────────────────────────────────
    rateLimitMap.set(rateKey, Date.now());
    const summary = await summarize(messagesForAI, '');

    // ── 8. Lưu vào DB (ConversationMember.aiSummary) ─────────────────────────
    await ConversationMember.findOneAndUpdate(
      { conversationId, userId },
      {
        aiSummary: {
          summary,
          summarizedAt:  new Date(),
          unreadCount:   membership.unreadCount,
          fromMessageId: membership.lastReadMessageId,
        },
      }
    );

    return res.json({
      summary,
      reason:          'ok',
      unreadCount:     membership.unreadCount,
      totalSummarized: unreadMessages.length,
    });

  } catch (err) {
    console.error('[aiController] summarizeUnread error:', err.message);
    return res.status(500).json({ message: 'Không thể tóm tắt lúc này, vui lòng thử lại sau' });
  }
};

/**
 * POST /api/messages/ai/translate
 * Dịch một đoạn văn bản.
 */
exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Thiếu nội dung cần dịch' });
    }

    const translatedText = await translate(text, targetLanguage || 'Auto');

    return res.json({
      translatedText,
      targetLanguage: targetLanguage || 'Auto',
    });
  } catch (err) {
    console.error('[aiController] translateText error:', err.message);
    return res.status(500).json({ message: 'Không thể dịch lúc này, vui lòng thử lại sau' });
  }
};
