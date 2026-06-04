const ConversationMember = require('../models/conversationMemberModel');
const Message            = require('../models/messageModel');
const { summarize, translate, analyzeConversation, getSmartReplies, composeSuggestions, semanticSearch } = require('../services/aiService');

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

// ─── Rate limit maps cho từng feature ────────────────────────────────────────
const analyzeRateMap   = new Map(); // key: userId:convId
const smartReplyRateMap = new Map();
const ANALYZE_RATE_MS   = 60 * 1000; // 60 giây
const SMART_REPLY_RATE_MS = 15 * 1000; // 15 giây

function checkRate(map, key, ms) {
  const last = map.get(key);
  if (last && Date.now() - last < ms) {
    return Math.ceil((ms - (Date.now() - last)) / 1000);
  }
  return 0;
}

/**
 * POST /api/messages/:conversationId/ai-analyze
 * Phân tích toàn diện: summary + tone + keyPoints + tasks + reminders (1 AI call).
 * Body: { conversationName, conversationType, messageCount (10-30) }
 */
exports.analyzeChat = async (req, res) => {
  try {
    const userId             = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { conversationName = '', conversationType = 'dm', messageCount = 20 } = req.body;

    // Clamp messageCount giữa 10-30 để kiểm soát token
    const limit = Math.min(30, Math.max(10, parseInt(messageCount) || 20));

    const membership = await ConversationMember.findOne({ conversationId, userId, leftAt: null });
    if (!membership) return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });

    const rateKey = `${userId}:${conversationId}:${limit}`;
    const wait = checkRate(analyzeRateMap, rateKey, ANALYZE_RATE_MS);
    if (wait > 0) return res.status(429).json({ message: `Vui lòng chờ ${wait} giây`, waitSeconds: wait });

    const rawMessages = await Message
      .find({ conversationId, deleted: { $ne: true }, revoked: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'displayName')
      .lean();

    if (rawMessages.length === 0) {
      return res.json({
        summary: 'Chưa có tin nhắn nào trong cuộc trò chuyện.',
        tone: 'normal', toneReason: '', keyPoints: [], tasks: [], reminders: [],
        messageCount: 0,
      });
    }

    const messages = rawMessages.reverse().map((m) => ({
      senderName: m.senderId?.displayName || 'Người dùng',
      type: m.type, content: m.content, isRevoked: m.revoked,
      fileName: m.payload?.fileName || '',
    }));

    analyzeRateMap.set(rateKey, Date.now());
    const result = await analyzeConversation(messages, conversationName, conversationType);

    return res.json({ ...result, messageCount: messages.length });
  } catch (err) {
    console.error('[aiController] analyzeChat error:', err.message);
    return res.status(500).json({ message: 'Không thể phân tích lúc này, vui lòng thử lại' });
  }
};

/**
 * POST /api/messages/:conversationId/smart-reply
 * Gợi ý 3 câu trả lời cá nhân hóa theo văn phong người dùng.
 * Body: { currentUserName, currentUserId }
 */
exports.smartReply = async (req, res) => {
  try {
    const userId             = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { currentUserName = '' } = req.body;

    const membership = await ConversationMember.findOne({ conversationId, userId, leftAt: null });
    if (!membership) return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });

    const rateKey = `${userId}:${conversationId}`;
    const wait = checkRate(smartReplyRateMap, rateKey, SMART_REPLY_RATE_MS);
    if (wait > 0) return res.status(429).json({ message: `Vui lòng chờ ${wait} giây`, waitSeconds: wait });

    // Lấy 15 tin nhắn cuối của cuộc trò chuyện (context)
    const [recentRaw, userOwnRaw] = await Promise.all([
      Message.find({ conversationId, deleted: { $ne: true }, revoked: false, type: { $in: ['text', 'emoji'] } })
        .sort({ createdAt: -1 }).limit(15).populate('senderId', 'displayName').lean(),
      // Lấy 20 tin nhắn gần nhất của chính user trong conversation này để phân tích văn phong
      Message.find({ conversationId, senderId: userId, deleted: { $ne: true }, revoked: false, type: { $in: ['text', 'emoji'] } })
        .sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    if (recentRaw.length === 0) return res.json({ styleProfile: {}, replies: [], lastFromMe: false });

    const myIdStr = userId.toString();
    const recentMsgs = recentRaw.reverse().map((m) => ({
      senderName: m.senderId?.displayName || 'Người dùng',
      content: m.content || '',
      type: m.type,
      // Đánh dấu tin nhắn của chính người dùng hiện tại để AI phân biệt đúng vai
      isMe: (m.senderId?._id || m.senderId)?.toString() === myIdStr,
    }));

    const userOwnMsgs = userOwnRaw.map((m) => ({ content: m.content || '' }));

    smartReplyRateMap.set(rateKey, Date.now());
    const result = await getSmartReplies(recentMsgs, userOwnMsgs, currentUserName);

    return res.json(result);
  } catch (err) {
    console.error('[aiController] smartReply error:', err.message);
    return res.status(500).json({ message: 'Không thể gợi ý lúc này, vui lòng thử lại' });
  }
};

// Rate limit riêng cho compose (gõ tới đâu gợi ý tới đó nên nới lỏng hơn)
const composeRateMap = new Map();
const COMPOSE_RATE_MS = 4 * 1000; // 4 giây

/**
 * POST /api/messages/:conversationId/compose-suggest
 * Gợi ý hoàn thiện tin nhắn dựa trên nội dung người dùng đang gõ.
 * Body: { draft, currentUserName }
 */
exports.composeSuggest = async (req, res) => {
  try {
    const userId             = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { draft = '', currentUserName = '' } = req.body;

    if (!draft || draft.trim().length < 2) {
      return res.status(400).json({ message: 'Cần nhập ít nhất 2 ký tự để gợi ý' });
    }

    const membership = await ConversationMember.findOne({ conversationId, userId, leftAt: null });
    if (!membership) return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });

    const rateKey = `${userId}:${conversationId}`;
    const wait = checkRate(composeRateMap, rateKey, COMPOSE_RATE_MS);
    if (wait > 0) return res.status(429).json({ message: `Vui lòng chờ ${wait} giây`, waitSeconds: wait });

    const myIdStr = userId.toString();
    const [recentRaw, userOwnRaw] = await Promise.all([
      Message.find({ conversationId, deleted: { $ne: true }, revoked: false, type: { $in: ['text', 'emoji'] } })
        .sort({ createdAt: -1 }).limit(6).populate('senderId', 'displayName').lean(),
      Message.find({ conversationId, senderId: userId, deleted: { $ne: true }, revoked: false, type: { $in: ['text', 'emoji'] } })
        .sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const recentMsgs = recentRaw.reverse().map((m) => ({
      senderName: m.senderId?.displayName || 'Người dùng',
      content: m.content || '',
      type: m.type,
      isMe: (m.senderId?._id || m.senderId)?.toString() === myIdStr,
    }));
    const userOwnMsgs = userOwnRaw.map((m) => ({ content: m.content || '' }));

    composeRateMap.set(rateKey, Date.now());
    const result = await composeSuggestions(draft.trim(), recentMsgs, userOwnMsgs, currentUserName);

    return res.json(result);
  } catch (err) {
    console.error('[aiController] composeSuggest error:', err.message);
    return res.status(500).json({ message: 'Không thể gợi ý lúc này, vui lòng thử lại' });
  }
};

/**
 * POST /api/messages/:conversationId/semantic-search
 * Tìm kiếm ngữ nghĩa trong 100 tin nhắn gần nhất.
 */
exports.semanticSearchMessages = async (req, res) => {
  try {
    const userId             = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Query tìm kiếm quá ngắn' });
    }

    const membership = await ConversationMember.findOne({ conversationId, userId, leftAt: null });
    if (!membership) return res.status(403).json({ message: 'Bạn không thuộc cuộc trò chuyện này' });

    const rawMessages = await Message
      .find({ conversationId, deleted: { $ne: true }, revoked: false, type: { $in: ['text', 'emoji'] } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('senderId', 'displayName')
      .lean();

    const messages = rawMessages.reverse().map((m) => ({
      _id: m._id.toString(),
      senderName: m.senderId?.displayName || 'Người dùng',
      content: m.content || '',
      createdAt: m.createdAt,
    }));

    const matchedIds = await semanticSearch(query, messages);

    const matched = messages
      .filter((m) => matchedIds.includes(m._id))
      .map((m) => ({ _id: m._id, senderName: m.senderName, content: m.content, createdAt: m.createdAt }));

    return res.json({ matched, query });
  } catch (err) {
    console.error('[aiController] semanticSearch error:', err.message);
    return res.status(500).json({ message: 'Không thể tìm kiếm lúc này, vui lòng thử lại' });
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