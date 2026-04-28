/**
 * Chuyển đổi các nội dung tin nhắn hệ thống cứng từ database sang đa ngôn ngữ
 * @param {string} text - Nội dung tin nhắn gốc (thường là tiếng Việt)
 * @param {function} t - Hàm dịch thuật t() từ useLanguage()
 * @returns {string} - Nội dung đã được dịch hoặc nội dung gốc nếu không khớp
 */
export const translateLastMessage = (content, t) => {
  if (!content) return content;

  let mainText = content;
  
  // Safe translation helper
  const getT = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  // Localize common user prefixes
  mainText = mainText.replace(/^Bạn: /i, getT('chat.you_prefix', 'You: '));
  mainText = mainText.replace(/^Tin nhắn mới từ /i, getT('chat.new_msg_from', 'New message from '));

  const mapping = {
    'Cuộc gọi bị từ chối': getT('system.call_rejected', 'Call rejected'),
    'Cuộc gọi nhỡ': getT('system.call_missed', 'Missed call'),
    '[Tin nhắn đã được thu hồi]': getT('chat.message_revoked', 'Message revoked'),
    'Đã thu hồi tin nhắn': getT('chat.message_revoked', 'Message revoked'),
    'Tin nhắn đã được thu hồi': getT('chat.message_revoked', 'Message revoked'),
    '[Hình ảnh]': getT('system.image', '[Image]'),
    '[Tin nhắn thoại]': getT('system.voice_msg', '[Voice Message]'),
    '[Tệp đính kèm]': getT('system.attachment', '[Attachment]'),
    '[Nhắc hẹn]': getT('system.reminder', '[Reminder]'),
    '[Bình chọn]': getT('system.poll', '[Poll]'),
    'Nhắc hẹn:': getT('system.reminder_prefix', 'Reminder:'),
    'Bình chọn:': getT('system.poll_prefix', 'Poll:'),
    'Bạn có lời mời kết bạn mới': getT('notifications.friend_request_title', 'New friend request'),
    'Lời mời kết bạn đã được chấp nhận': getT('notifications.friend_accepted_title', 'Friend request accepted'),
  };

  // Check for mapped keys within the text
  for (const [key, value] of Object.entries(mapping)) {
    if (mainText.includes(key)) {
      mainText = mainText.replace(key, value);
    }
  }

  // Fallback for dynamic strings
  if (mainText.includes('đã gửi một tin nhắn mới')) {
    mainText = mainText.replace(/.* đã gửi một tin nhắn mới/, getT('notifications.new_message', 'sent a new message'));
  }

  return mainText;
};

/**
 * Chuyển đổi tên kênh (Topic) cứng từ database sang đa ngôn ngữ
 * @param {string} val - Tên kênh gốc
 * @param {function} t - Hàm dịch thuật t()
 * @returns {string} - Tên kênh đã dịch
 */
export const translateTopicName = (val, t) => {
  if (!val) return val;
  const text = val.trim();
  const mapping = {
    '📚 Học tập': t('chat.topics.study_cat'),
    '🔔 Hệ thống': t('chat.topics.system_cat'),
    'học-tập-chung': t('chat.topics.study_general'),
    'hỏi-bài': t('chat.topics.study_qa'),
    'chia-sẻ-tài-liệu': t('chat.topics.study_files'),
    'nhật-ký-nhóm': t('chat.topics.system_log'),
    'thảo-luận-chung': t('chat.topics.general_chat'),
    'general': t('chat.topics.general'),
  };
  return mapping[text] || val;
};
