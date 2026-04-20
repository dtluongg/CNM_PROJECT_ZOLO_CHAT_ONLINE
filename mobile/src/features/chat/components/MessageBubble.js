import React from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Avatar from './Avatar';
import VoicePlayer from './VoicePlayer';
import VideoPlayer from './VideoPlayer';
import PollMessage from './PollMessage';

// Màu tên người gửi trong nhóm chat, luân phiên theo tên
const SENDER_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#faa61a', '#ed4245'];
const getSenderColor = (name, THEME) =>
  name ? SENDER_COLORS[name.charCodeAt(0) % SENDER_COLORS.length] : THEME.accent;

// Parse payload an toàn: xử lý cả trường hợp là string JSON (Android) lẫn object (Web)
const parsePayload = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch { return {}; }
  }
  return payload;
};

/**
 * Bong bóng tin nhắn hỗ trợ các loại nội dung:
 * text, image, voice, video, file và tin nhắn đã thu hồi.
 *
 * @param {object}   msg             - Dữ liệu tin nhắn
 * @param {boolean}  isMine          - Tin nhắn của tôi hay người khác
 * @param {boolean}  showHeader      - Có hiện tên + thời gian không (false khi cùng nhóm)
 * @param {function} onLongPress     - Callback khi giữ tin nhắn (mở action sheet)
 * @param {function} onShowReadBy    - Callback xem danh sách người đã đọc
 * @param {function} onAvatarPress   - Callback khi nhấn avatar (xem profile)
 * @param {string}   currentUserId   - ID người dùng hiện tại
 * @param {object}   conversation    - Thông tin cuộc trò chuyện
 * @param {function} onImagePress    - Callback khi nhấn ảnh (xem toàn màn hình)
 * @param {function} onFilePress     - Callback khi nhấn file (tải xuống)
 */
const MessageBubble = ({
  msg,
  isMine,
  showHeader,
  onLongPress,
  onShowReadBy,
  currentUserId,
  conversation,
  onAvatarPress,
  THEME,
  styles,
  onImagePress,
  onFilePress,
  onJumpToMessage,
  isPinned,
  onVote,
}) => {
  const senderColor = isMine ? THEME.accent : getSenderColor(msg.senderName, THEME);
  const bubbleBg = isMine ? THEME.bubbleSelf : THEME.bubbleOther;
  const bubbleText = isMine ? '#ffffff' : THEME.textPrimary;

  // Bo góc bong bóng: góc trên cùng của chuỗi tin nhắn gần header hơn
  const borderRadius = { borderRadius: 18 };
  if (isMine) {
    borderRadius.borderTopRightRadius = showHeader ? 4 : 18;
    borderRadius.borderBottomRightRadius = 4;
  } else {
    borderRadius.borderTopLeftRadius = showHeader ? 4 : 18;
    borderRadius.borderBottomLeftRadius = 4;
  }

  // Render context tin nhắn đang trả lời
  const renderRepliedContext = () => {
    if (!msg.replyToMessageId || msg.revoked || msg.recalled) return null;
    const repliedBy = msg.replyToMessageId.senderId?.displayName || 'Người dùng Zolo';
    let repliedContent = '';
    if (msg.replyToMessageId.revoked) {
      repliedContent = 'Tin nhắn đã được thu hồi';
    } else if (msg.replyToMessageId.type === 'text') {
      repliedContent = msg.replyToMessageId.content;
    } else if (msg.replyToMessageId.type === 'poll') {
      const payload = parsePayload(msg.replyToMessageId.payload);
      const pollTopic = payload.topic || msg.replyToMessageId.content || 'Bình chọn';
      repliedContent = `Bình chọn: ${pollTopic}`;
    } else {
      repliedContent = `[${msg.replyToMessageId.type}]`;
    }

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => onJumpToMessage && onJumpToMessage(msg.replyToMessageId._id || msg.replyToMessageId.id)}
        style={[styles.repliedContainer, { borderLeftColor: isMine ? '#fff' : THEME.accent }]}
      >
        <Text style={[styles.repliedSender, { color: isMine ? '#fff' : THEME.accent }]} numberOfLines={1}>
          {repliedBy}
        </Text>
        <Text style={[styles.repliedText, { color: isMine ? 'rgba(255,255,255,0.85)' : THEME.textPrimary }]} numberOfLines={2}>
          {repliedContent}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStoryReply = (payload) => {
    if (!payload || payload.type !== 'story_reply') return null;

    return (
      <View style={styles.storyReplyContainer}>
        <View style={styles.storyReplyHeader}>
          <Feather name="corner-up-right" size={14} color={THEME.textMuted} />
          <Text style={[styles.storyReplyTitle, { color: THEME.textMuted }]}>
            Bạn đã trả lời tin
          </Text>
        </View>
        <Image 
          source={{ uri: payload.mediaUrl }} 
          style={styles.storyReplyMedia}
          resizeMode="cover"
        />
      </View>
    );
  };

  // Render nội dung bên trong bong bóng tuỳ theo type
  const renderContent = () => {
    // Tin nhắn đã bị thu hồi
    if (msg.revoked || msg.recalled) {
      return (
        <Text style={[styles.bubbleText, { color: bubbleText, fontStyle: 'italic', opacity: 0.7 }]}>
          Tin nhắn đã được thu hồi
        </Text>
      );
    }

    // Ảnh
    if (msg.type === 'image') {
      const payload = parsePayload(msg.payload);
      const imgUrl = payload.url || msg.content;
      return (
        <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress && onImagePress(imgUrl)}>
          <Image source={{ uri: imgUrl }} style={styles.imgAttachment} resizeMode="cover" />
          {/* Icon zoom nhỏ góc phải dưới */}
          <View
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              backgroundColor: 'rgba(0,0,0,0.45)',
              borderRadius: 10,
              padding: 3,
            }}
          >
            <Text style={{ fontSize: 11, color: '#fff' }}>🔍</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Âm thanh
    if (msg.type === 'voice') {
      const payload = parsePayload(msg.payload);
      return (
        <VoicePlayer
          url={payload.url}
          duration={payload.duration}
          isMine={isMine}
          THEME={THEME}
        />
      );
    }

    // Video (type === 'video')
    if (msg.type === 'video') {
      const payload = parsePayload(msg.payload);
      return (
        <VideoPlayer url={payload.url || msg.content} isMine={isMine} THEME={THEME} />
      );
    }

    // File (có thể chứa video theo đuôi file)
    if (msg.type === 'file') {
      const payload = parsePayload(msg.payload);

      const fileUrl = payload.url;
      const fileName = payload.fileName || msg.content || '';
      const isVideo = /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(fileName);

      // Video trên web dùng thẻ <video> native
      if (isVideo && Platform.OS === 'web') {
        return (
          <View style={{ borderRadius: 12, overflow: 'hidden', width: 240 }}>
            <video
              src={fileUrl}
              controls
              style={{ width: 240, height: 160, objectFit: 'cover', display: 'block' }}
            />
          </View>
        );
      }

      // Video trên native dùng VideoPlayer
      if (isVideo) {
        return <VideoPlayer url={fileUrl} isMine={isMine} THEME={THEME} />;
      }

      // File thông thường
      return (
        <TouchableOpacity
            onPress={() => onFilePress && onFilePress(fileUrl, fileName)}
            style={[
              styles.fileRow,
              {
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 200,
                maxWidth: 260,
                gap: 8,
              },
            ]}
            activeOpacity={0.75}
          >
            <Feather name="file-text" size={22} color={isMine ? 'rgba(255,255,255,0.85)' : THEME.textMuted} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.bubbleText, { color: bubbleText, fontWeight: '600' }]}
                numberOfLines={2}
              >
                {fileName}
              </Text>
              <Text style={{ fontSize: 11, color: isMine ? 'rgba(255,255,255,0.65)' : THEME.textMuted, marginTop: 2 }}>
                Nhấn để mở
              </Text>
            </View>
            <Feather name="download" size={18} color={isMine ? 'rgba(255,255,255,0.7)' : THEME.accent} />
          </TouchableOpacity>
      );
    }

    // Tin nhắn văn bản (mặc định)
    if (msg.type === 'poll') {
      return (
        <PollMessage 
          message={msg} 
          currentUserId={currentUserId} 
          onVote={onVote} 
          THEME={THEME} 
          isPinned={isPinned}
        />
      );
    }

    const payload = parsePayload(msg.payload);

    return (
      <View>
        {payload.type === 'story_reply' && (
          <View>
            {renderStoryReply(payload)}
            <View style={[
              styles.storyReplyBubble, 
              { backgroundColor: isMine ? THEME.accent : THEME.bubbleOther },
              { alignSelf: isMine ? 'flex-end' : 'flex-start' },
              !isMine && { marginLeft: 12 },
              isMine && { marginRight: 12 }
            ]}>
              <Text style={[styles.bubbleText, { color: isMine ? '#fff' : THEME.textPrimary }]}>
                {msg.content}
              </Text>
            </View>
          </View>
        )}
        {payload.type !== 'story_reply' && (
          <Text style={[styles.bubbleText, { color: bubbleText }]}>
            {msg.content}
            {msg.edited && (
              <Text style={{ fontSize: 11, fontStyle: 'italic', opacity: 0.6 }}> (đã chỉnh sửa)</Text>
            )}
          </Text>
        )}
      </View>
    );
  };

  // Render trạng thái đã xem / đã gửi bên dưới bong bóng (chỉ tin của mình)
  const renderSeenStatus = () => {
    if (!isMine || msg.revoked) return null;

    // Tin nhắn bị chặn
    if (msg.blocked) {
      return (
        <Text style={[styles.seenText, { color: '#ef4444' }]}>Bị chặn bởi người dùng này</Text>
      );
    }

    const readBy = msg.readBy || [];

    if (conversation.type !== 'group') {
      // Chat đơn: chỉ hiện "Đã xem" hoặc "Đã gửi"
      return (
        <Text style={styles.seenText}>{readBy.length > 0 ? 'Đã xem' : 'Đã gửi'}</Text>
      );
    }

    // Chat nhóm: hiện avatar những người đã đọc
    if (readBy.length === 0) return null;
    return (
      <TouchableOpacity style={styles.seenAvatars} onPress={() => onShowReadBy(readBy)}>
        {readBy.slice(0, 3).map((r, i) => (
          <View
            key={r.userId}
            style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }]}
          >
            {r.avatar ? (
              <Image source={{ uri: r.avatar }} style={styles.miniAvatarImg} />
            ) : (
              <View
                style={[
                  styles.miniAvatarImg,
                  { backgroundColor: THEME.accent, justifyContent: 'center', alignItems: 'center' },
                ]}
              >
                <Text style={{ fontSize: 6, color: '#fff' }}>{r.displayName?.charAt(0)}</Text>
              </View>
            )}
          </View>
        ))}
        {readBy.length > 3 && (
          <Text style={styles.seenCount}>+{readBy.length - 3}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.msgRow, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
      {/* Avatar người gửi (chỉ hiện cho người khác, ở đầu chuỗi tin) */}
      <View style={{ width: 38, alignItems: 'center', marginTop: showHeader ? 2 : 0 }}>
        {showHeader && !isMine && (
          <TouchableOpacity
            onPress={() => onAvatarPress && onAvatarPress(msg.senderId)}
            activeOpacity={onAvatarPress ? 0.7 : 1}
          >
            <Avatar name={msg.senderName} avatar={msg.avatar} size={36} THEME={THEME} styles={styles} />
          </TouchableOpacity>
        )}
      </View>

      {/* Nội dung tin nhắn */}
      <View style={[
        styles.msgContent, 
        { alignItems: isMine ? 'flex-end' : 'flex-start' },
        msg.type === 'poll' && { maxWidth: '100%', width: '100%' }
      ]}>
        {/* Header: tên + thời gian (chỉ hiện ở tin đầu tiên của chuỗi) */}
        {showHeader && (
          <View style={[styles.msgHeader, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
            {!isMine && (
              <Text style={[styles.senderName, { color: senderColor }]}>{msg.senderName}</Text>
            )}
            <Text style={styles.msgTime}>{msg.time}</Text>
          </View>
        )}

        {/* Bong bóng nội dung — giữ lâu để mở action sheet */}
        <Pressable onLongPress={() => onLongPress && onLongPress(msg)} delayLongPress={400}>
          <View
            style={[
              styles.bubble,
              { backgroundColor: bubbleBg },
              borderRadius,
              msg.type === 'poll' && { alignSelf: 'center', marginTop: 10 },
              msg.type === 'reminder' && { alignSelf: 'center' },
              // Bỏ padding + nền khi là media (ảnh/video), bình chọn, nhắc hẹn hoặc phản hồi story
              (msg.type === 'video' ||
                msg.type === 'image' ||
                msg.type === 'poll' ||
                msg.type === 'reminder' ||
                parsePayload(msg.payload).type === 'story_reply' ||
                /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(parsePayload(msg.payload).fileName || '')) && {
                padding: 0,
                overflow: 'hidden',
                backgroundColor: 'transparent',
                borderWidth: 0,
                shadowOpacity: 0,
                elevation: 0,
              },
            ]}
          >
            {isPinned && msg.type !== 'poll' && (
              <View style={{ 
                flexDirection: 'row', alignItems: 'center', 
                marginBottom: 4, paddingBottom: 4, 
                borderBottomWidth: 1, 
                borderBottomColor: (msg.type === 'poll' || !isMine) ? THEME.border : 'rgba(255,255,255,0.2)',
                opacity: 0.9
              }}>
                <Text style={{ fontSize: 10, marginRight: 4 }}>📌</Text>
                <Text style={{ 
                  fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
                  color: (msg.type === 'poll' || msg.type === 'image' || msg.type === 'video' || !isMine) ? THEME.accent : '#fff'
                }}>Ghim tin nhắn</Text>
              </View>
            )}
            {renderRepliedContext()}
            {renderContent()}
          </View>
        </Pressable>

        {/* Tổng hợp reaction hiển thị dưới bong bóng */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && msg.type !== 'poll' && (
          <View style={[styles.reactionSummary, isMine ? { right: 12 } : { left: 12 }]}>
            {Object.entries(msg.reactions).map(([emoji, count], idx) => (
              <View key={idx} style={styles.reactionItem}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Trạng thái đã xem / đã gửi */}
        {renderSeenStatus()}
      </View>
    </View>
  );
};

export default MessageBubble;
