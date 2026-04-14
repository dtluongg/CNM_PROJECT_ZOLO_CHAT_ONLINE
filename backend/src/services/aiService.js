const axios = require('axios');

// NVIDIA NIM API — OpenAI-compatible endpoint
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL    = 'google/gemma-4-31b-it';

/**
 * Chuyển mảng messages thành dạng transcript text cho AI đọc
 */
function buildTranscript(messages) {
  return messages
    .map((msg) => {
      const sender = msg.senderName || 'Người dùng';
      let content  = '';

      if (msg.isRevoked)       content = '[Đã thu hồi]';
      else if (msg.type === 'image') content = '[Đã gửi hình ảnh]';
      else if (msg.type === 'voice') content = '[Đã gửi tin nhắn thoại]';
      else if (msg.type === 'file')  content = `[Đã gửi file: ${msg.fileName || ''}]`;
      else if (msg.type === 'system') content = `[Hệ thống: ${msg.content}]`;
      else content = msg.content || '';

      return `${sender}: ${content}`;
    })
    .join('\n');
}

/**
 * Gọi NVIDIA Gemma 4 31B để tóm tắt transcript
 * @param {Array} messages - Mảng tin nhắn chưa đọc
 * @param {string} conversationName - Tên cuộc trò chuyện
 * @returns {Promise<string>} - Chuỗi tóm tắt
 */
async function summarize(messages, conversationName = '') {
  try {
    const transcript = buildTranscript(messages);
    const apiKey     = process.env.NVIDIA_API_KEY;

    if (!apiKey) throw new Error('NVIDIA_API_KEY chưa được cấu hình trong .env');

    const prompt = `Bạn là trợ lý tóm tắt tin nhắn chat cho ứng dụng Zolo.

Dưới đây là các tin nhắn trong cuộc trò chuyện mà người dùng chưa đọc:

${transcript}

Hãy tóm tắt ngắn gọn nội dung chính bằng tiếng Việt (tối đa 2-3 câu). Chỉ nêu những gì đã được đề cập, không suy diễn. Nếu chỉ có hình ảnh/file mà không có text, hãy mô tả đơn giản.`;

    const response = await axios.post(
      `${NVIDIA_BASE_URL}/chat/completions`,
      {
        model:       NVIDIA_MODEL,
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  256,
        temperature: 0.3,
        stream:      false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('[aiService] NVIDIA API error:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { summarize };
