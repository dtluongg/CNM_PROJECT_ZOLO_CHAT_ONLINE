const axios = require("axios");

// NVIDIA NIM API — OpenAI-compatible endpoint
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "google/gemma-3n-e4b-it";

/**
 * Chuyển mảng messages thành dạng transcript text cho AI đọc
 */
function buildTranscript(messages) {
    return messages
        .map((msg) => {
            const sender = msg.senderName || "Người dùng";
            let content = "";

            if (msg.isRevoked) content = "[Đã thu hồi]";
            else if (msg.type === "image") content = "[Đã gửi hình ảnh]";
            else if (msg.type === "voice") content = "[Đã gửi tin nhắn thoại]";
            else if (msg.type === "file")
                content = `[Đã gửi file: ${msg.fileName || ""}]`;
            else if (msg.type === "system")
                content = `[Hệ thống: ${msg.content}]`;
            else content = msg.content || "";

            return `${sender}: ${content}`;
        })
        .join("\n");
}

/**
 * Gọi NVIDIA Gemma 4 31B để tóm tắt transcript
 * @param {Array} messages - Mảng tin nhắn chưa đọc
 * @param {string} conversationName - Tên cuộc trò chuyện
 * @returns {Promise<string>} - Chuỗi tóm tắt
 */
async function summarize(messages, conversationName = "") {
    try {
        const transcript = buildTranscript(messages);
        const apiKey = process.env.NVIDIA_API_KEY;

        if (!apiKey)
            throw new Error("NVIDIA_API_KEY chưa được cấu hình trong .env");

        const prompt = `Bạn là trợ lý tóm tắt tin nhắn chat cho ứng dụng Zolo.

Dưới đây là các tin nhắn trong cuộc trò chuyện mà người dùng chưa đọc:

${transcript}

Hãy tóm tắt ngắn gọn nội dung chính bằng tiếng Việt (tối đa 2-3 câu). Chỉ nêu những gì đã được đề cập, không suy diễn. Nếu chỉ có hình ảnh/file mà không có text, hãy mô tả đơn giản.`;

        const response = await axios.post(
            `${NVIDIA_BASE_URL}/chat/completions`,
            {
                model: NVIDIA_MODEL,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 256,
                temperature: 0.3,
                stream: false,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            },
        );

        return response.data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
        console.error(
            "[aiService] NVIDIA API error:",
            err.response?.data || err.message,
        );
        throw err;
    }
}

/**
 * Gọi NVIDIA Gemma để dịch văn bản
 * @param {string} text - Văn bản cần dịch
 * @param {string} targetLanguage - Ngôn ngữ đích (mặc định là English hoặc Vietnamese tùy ngữ cảnh)
 * @returns {Promise<string>} - Văn bản đã dịch
 */
async function translate(text, targetLanguage = "Auto") {
    try {
        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey)
            throw new Error("NVIDIA_API_KEY chưa được cấu hình trong .env");

        // Gemma trên NVIDIA NIM không hỗ trợ role "system" → gộp hết vào 1 message user.
        const prompt = `You are a professional, accurate translation system.
RULES:
1. Preserve all emojis and formatting.
2. DO NOT add any greetings, explanations, or extra words (e.g., no "Xin chào" or "Here is the translation"). Only return the translated text.
3. Target Language Logic:
   - If target is "Auto": Detect source language. If source is NOT Vietnamese, translate to Vietnamese. If source IS Vietnamese, translate to English.
   - If target is a specific language (e.g. "Japanese", "Korean", "French"): Translate the text to that specific language regardless of its original language.

Text: "${text}"
Target: "${targetLanguage}"

Translated text (only the translation, nothing else):`;

        const response = await axios.post(
            `${NVIDIA_BASE_URL}/chat/completions`,
            {
                model: NVIDIA_MODEL,
                messages: [
                    { role: "user", content: prompt }
                ],
                max_tokens: 1024,
                temperature: 0.1, // Set to 0.1 for maximum accuracy and consistency
                stream: false,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            },
        );

        return response.data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
        console.error(
            "[aiService] Translate error:",
            err.response?.data || err.message,
        );
        throw err;
    }
}

// ─── Shared helper: parse JSON safely from AI response ───────────────────────
function parseJsonResponse(raw) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI không trả về JSON hợp lệ");
    return JSON.parse(match[0]);
}

// ─── Shared helper: call NVIDIA NIM ──────────────────────────────────────────
async function callNvidia({ messages, maxTokens = 512, temperature = 0.3 }) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_API_KEY chưa được cấu hình trong .env");

    const response = await axios.post(
        `${NVIDIA_BASE_URL}/chat/completions`,
        { model: NVIDIA_MODEL, messages, max_tokens: maxTokens, temperature, stream: false },
        {
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            timeout: 45000,
        }
    );
    return response.data.choices?.[0]?.message?.content?.trim() || "";
}

/**
 * Phân tích toàn diện hội thoại: summary + tone + tasks + reminders (1 AI call).
 * @param {Array} messages     — mảng tin nhắn đã chuẩn bị (đã giới hạn số lượng ngoài)
 * @param {string} conversationName
 * @param {string} conversationType  — 'dm' | 'group'
 * @returns {Promise<{summary, tone, toneReason, keyPoints, tasks, reminders}>}
 */
async function analyzeConversation(messages, conversationName = "", conversationType = "dm") {
    const transcript = buildTranscript(messages);
    const now = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

    const prompt = `Bạn là trợ lý AI phân tích cuộc trò chuyện chat.
Cuộc trò chuyện "${conversationName || "Chat"}" (${conversationType === "group" ? "nhóm" : "riêng tư"}) — Hôm nay: ${now}
${messages.length} tin nhắn:

${transcript}

Phân tích kỹ và trả về JSON thuần (không markdown, không giải thích):
{
  "summary": "Tóm tắt súc tích 2-3 câu nêu nội dung chính, ai nói gì, kết quả/quyết định nếu có",
  "tone": "normal|urgent|conflict|important|casual",
  "toneReason": "1 câu giải thích ngắn gọn",
  "keyPoints": ["điểm chính 1", "điểm chính 2"],
  "tasks": [
    { "content": "Việc cần làm cụ thể (động từ + mục tiêu)", "assignee": "tên người hoặc null", "deadline": "thời hạn nếu đề cập hoặc null" }
  ],
  "reminders": [
    { "title": "Tiêu đề nhắc hẹn rõ ràng", "datetimeHint": "ngày/giờ được đề cập", "description": "Mô tả thêm nếu có" }
  ]
}
Quy tắc nghiêm ngặt:
- keyPoints: 2-4 điểm, mỗi điểm 1 câu ngắn
- tasks: tối đa 5, CHỈ khi được đề cập rõ ràng là việc cần làm
- reminders: tối đa 3, CHỈ khi có ngày/giờ/mốc thời gian cụ thể
- Nếu không có tasks/reminders thì trả mảng rỗng []
- tone "casual" khi hội thoại vui vẻ/thân mật, "important" khi có quyết định/thỏa thuận, "urgent" khi có deadline gấp/khẩn, "conflict" khi bất đồng/căng thẳng`;

    try {
        const raw = await callNvidia({ messages: [{ role: "user", content: prompt }], maxTokens: 800, temperature: 0.15 });
        return parseJsonResponse(raw);
    } catch (err) {
        console.error("[aiService] analyzeConversation error:", err.message);
        throw err;
    }
}

/**
 * Phân tích văn phong từ tin nhắn của chính người dùng.
 * @param {Array} userOwnMsgs — tin nhắn user đã gửi
 * @returns {{ avgLen, hasEmoji, isShortMsg, samples }}
 */
function analyzeUserStyle(userOwnMsgs = []) {
    const samples = userOwnMsgs
        .map((m) => m.content || "")
        .filter(Boolean)
        .slice(-20)
        .join(" | ");

    const avgLen = userOwnMsgs.length
        ? Math.round(userOwnMsgs.reduce((s, m) => s + (m.content || "").length, 0) / userOwnMsgs.length)
        : 30;
    const emojiCount = (samples.match(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]/gu) || []).length;

    return {
        avgLen,
        hasEmoji: emojiCount > 0,
        isShortMsg: avgLen < 40,
        samples: samples.slice(0, 300),
    };
}

/**
 * Tạo transcript có ĐÁNH DẤU RÕ ai là người dùng hiện tại ("BẠN") và ai là đối phương.
 * @param {Array} messages — mỗi phần tử có { senderName, content, isMe, type, ... }
 */
function buildLabeledTranscript(messages) {
    return messages
        .map((msg) => {
            let content = "";
            if (msg.isRevoked) content = "[Đã thu hồi]";
            else if (msg.type === "image") content = "[Hình ảnh]";
            else if (msg.type === "voice") content = "[Tin nhắn thoại]";
            else if (msg.type === "file") content = `[File: ${msg.fileName || ""}]`;
            else content = msg.content || "";

            const label = msg.isMe ? "BẠN" : (msg.senderName || "Người khác");
            return `${label}: ${content}`;
        })
        .join("\n");
}

/**
 * Phân tích văn phong người dùng + gợi ý 3 câu trả lời phù hợp cá tính.
 *
 * QUAN TRỌNG: chỉ gợi ý câu trả lời cho NHỮNG TIN NHẮN CỦA ĐỐI PHƯƠNG (không phải "BẠN").
 * Nếu tin nhắn cuối là của chính BẠN → trả về lastFromMe=true (chưa có gì để trả lời).
 *
 * @param {Array} recentMsgs   — tin nhắn cuối, mỗi phần tử có cờ isMe
 * @param {Array} userOwnMsgs  — tin nhắn của chính user (học văn phong)
 * @param {string} userName
 * @returns {Promise<{styleProfile, replies, lastFromMe}>}
 */
async function getSmartReplies(recentMsgs, userOwnMsgs, userName = "") {
    // Xác định tin nhắn cuối cùng có phải của BẠN không
    const lastMsg = recentMsgs[recentMsgs.length - 1];
    const lastFromMe = !!lastMsg?.isMe;

    // Tin nhắn của đối phương gần nhất — chính là tin cần trả lời
    const lastPartnerMsg = [...recentMsgs].reverse().find((m) => !m.isMe);

    // Nếu không có tin nào của đối phương → không có gì để trả lời
    if (!lastPartnerMsg) {
        return { styleProfile: {}, replies: [], lastFromMe };
    }

    const transcript = buildLabeledTranscript(recentMsgs);
    const style = analyzeUserStyle(userOwnMsgs);

    const styleHint = `Văn phong của BẠN (${userName}): tin nhắn trung bình ${style.avgLen} ký tự, ${style.hasEmoji ? "hay dùng emoji" : "ít dùng emoji"}, ${style.isShortMsg ? "ngắn gọn súc tích" : "diễn đạt đầy đủ"}.
Mẫu tin nhắn của BẠN: "${style.samples}"`;

    const prompt = `Bạn là trợ lý gợi ý câu trả lời chat cá nhân hóa.

${styleHint}

Đoạn hội thoại (dòng "BẠN:" là tin của ${userName} — người cần được gợi ý; các dòng khác là của ĐỐI PHƯƠNG):
${transcript}

NHIỆM VỤ: Gợi ý 3 câu để BẠN (${userName}) TRẢ LỜI cho tin nhắn GẦN NHẤT của ĐỐI PHƯƠNG: "${lastPartnerMsg.senderName}: ${lastPartnerMsg.content}".
- Câu trả lời phải đúng vai BẠN đáp lại ĐỐI PHƯƠNG, KHÔNG được lặp lại hay trả lời cho chính tin nhắn của BẠN.
- Bám đúng văn phong, độ dài, thói quen dùng emoji của BẠN.
- Mỗi câu có "type": "direct" (đáp thẳng), "question" (hỏi lại), "soft" (lịch sự/mềm mỏng).

Trả về JSON thuần:
{
  "styleProfile": { "tone": "casual|formal|friendly", "avgLength": "short|medium|long", "usesEmoji": true/false },
  "replies": [
    { "text": "Câu trả lời", "type": "direct" },
    { "text": "Câu trả lời", "type": "question" },
    { "text": "Câu trả lời", "type": "soft" }
  ]
}`;

    try {
        const raw = await callNvidia({ messages: [{ role: "user", content: prompt }], maxTokens: 300, temperature: 0.8 });
        const parsed = parseJsonResponse(raw);
        return {
            styleProfile: parsed.styleProfile || {},
            replies: Array.isArray(parsed.replies) ? parsed.replies.slice(0, 3) : [],
            lastFromMe,
        };
    } catch (err) {
        console.error("[aiService] getSmartReplies error:", err.message);
        throw err;
    }
}

/**
 * Gợi ý nhanh dựa trên NỘI DUNG ĐANG GÕ của người dùng.
 * Hoàn thiện/biến tấu bản nháp thành 3 phiên bản theo văn phong của user.
 *
 * @param {string} draft       — văn bản người dùng đang gõ
 * @param {Array} recentMsgs   — vài tin nhắn cuối (ngữ cảnh, có cờ isMe)
 * @param {Array} userOwnMsgs  — tin nhắn của chính user (học văn phong)
 * @param {string} userName
 * @returns {Promise<{suggestions: string[]}>}
 */
async function composeSuggestions(draft, recentMsgs = [], userOwnMsgs = [], userName = "") {
    const style = analyzeUserStyle(userOwnMsgs);
    const transcript = recentMsgs.length ? buildLabeledTranscript(recentMsgs.slice(-6)) : "(không có)";

    const prompt = `Bạn là trợ lý hoàn thiện tin nhắn chat. Người dùng (${userName}) đang gõ dở một tin nhắn và muốn 3 gợi ý hoàn chỉnh hơn.

Văn phong của người dùng: trung bình ${style.avgLen} ký tự, ${style.hasEmoji ? "hay dùng emoji" : "ít dùng emoji"}, ${style.isShortMsg ? "ngắn gọn" : "đầy đủ"}.

Ngữ cảnh hội thoại gần nhất:
${transcript}

Bản nháp đang gõ: "${draft}"

NHIỆM VỤ: Đưa ra 3 phiên bản hoàn chỉnh của bản nháp này — giữ NGUYÊN Ý ĐỊNH của người dùng, chỉ làm rõ ràng/tự nhiên/lịch sự hơn theo đúng văn phong của họ.
- Phiên bản 1: gọn gàng, sát bản nháp nhất.
- Phiên bản 2: đầy đủ, rõ ý hơn.
- Phiên bản 3: thân thiện/lịch sự hơn.
KHÔNG đổi ý nghĩa, KHÔNG thêm thông tin bịa đặt.

Trả về JSON thuần:
{ "suggestions": ["Phiên bản 1", "Phiên bản 2", "Phiên bản 3"] }`;

    try {
        const raw = await callNvidia({ messages: [{ role: "user", content: prompt }], maxTokens: 300, temperature: 0.7 });
        const parsed = parseJsonResponse(raw);
        return {
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
        };
    } catch (err) {
        console.error("[aiService] composeSuggestions error:", err.message);
        throw err;
    }
}

/**
 * Tìm kiếm ngữ nghĩa: AI trả về index của các tin nhắn liên quan đến query.
 * Chỉ gửi tối đa 100 tin nhắn, định dạng compact để tiết kiệm token.
 * @param {string} query
 * @param {Array} messages - { _id, senderName, content }
 * @returns {Promise<string[]>} - mảng message._id khớp
 */
async function semanticSearch(query, messages) {
    const limited = messages.slice(-100);
    const msgList = limited.map((m, i) => `[${i}]${m.senderName || "User"}: ${(m.content || "").slice(0, 120)}`).join("\n");

    const prompt = `Tìm tin nhắn liên quan đến: "${query}"

${msgList}

Trả về JSON (không markdown):
{ "matchedIndices": [0, 3, 7] }
Chỉ index liên quan nhất, tối đa 5. Nếu không có thì mảng rỗng.`;

    try {
        const raw = await callNvidia({ messages: [{ role: "user", content: prompt }], maxTokens: 100, temperature: 0.1 });
        const parsed = parseJsonResponse(raw);
        const indices = Array.isArray(parsed.matchedIndices) ? parsed.matchedIndices : [];
        return indices.map((i) => limited[i]?._id).filter(Boolean);
    } catch (err) {
        console.error("[aiService] semanticSearch error:", err.message);
        throw err;
    }
}

module.exports = { summarize, translate, analyzeConversation, getSmartReplies, composeSuggestions, semanticSearch };