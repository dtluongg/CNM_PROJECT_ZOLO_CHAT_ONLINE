import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, TextInput, Platform, Keyboard,
  Modal, StatusBar, Pressable, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { usePresence, formatLastSeen } from '../../../context/PresenceContext';
import messageApi from '../api/messageApi';
import conversationApi from '../api/conversationApi';
import friendApi from '../../friends/api/friendApi';
import { getAvatarColor, getInitials } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.88.135:2026/backend/api')
    .replace('/backend/api', '');

const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};
const normalizeMsg = (msg) => ({ ...msg, time: fmtTime(msg.createdAt) });

const fmtDur = (secs) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────
const Avatar = ({ name, avatar, size = 36, online = null, THEME, styles }) => {
  const bg = getAvatarColor(name);
  return (
    <View style={{ width: size, height: size }}>
      {avatar
        ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        : <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
          <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
        </View>
      }
      {online !== null && (
        <View style={[styles.onlineDot, {
          width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
          backgroundColor: online ? THEME.statusOnline : THEME.statusOffline,
        }]} />
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// Date divider
// ─────────────────────────────────────────────
const DateDivider = ({ label, styles }) => (
  <View style={styles.dateDivider}>
    <View style={styles.dateLine} />
    <Text style={styles.dateLabel}>{label}</Text>
    <View style={styles.dateLine} />
  </View>
);

// ─────────────────────────────────────────────
// Voice player
// ─────────────────────────────────────────────
const VoicePlayer = ({ url, duration, isMine, THEME }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await soundRef.current?.pauseAsync();
        setIsPlaying(false);
      } else {
        if (!soundRef.current) {
          // setAudioModeAsync is iOS/Android only; skip on web
          if (Platform.OS !== 'web') {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
          }
          const { sound } = await Audio.Sound.createAsync({ uri: url });
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
              soundRef.current?.unloadAsync();
              soundRef.current = null;
            }
          });
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('VoicePlayer error:', err);
    }
  };

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  return (
    <TouchableOpacity onPress={togglePlay} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <Text style={{ fontSize: 20 }}>{isPlaying ? '⏸' : '▶️'}</Text>
      <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: isMine ? 'rgba(255,255,255,0.4)' : THEME.border }} />
      <Text style={{ fontSize: 12, color: isMine ? 'rgba(255,255,255,0.8)' : THEME.textMuted }}>
        {fmtDur(duration)}
      </Text>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────
const SENDER_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#faa61a', '#ed4245'];
const getSenderColor = (name, THEME) =>
  name ? SENDER_COLORS[name.charCodeAt(0) % SENDER_COLORS.length] : THEME.accent;

const MessageBubble = ({ msg, isMine, showHeader, onLongPress, onShowReadBy, currentUserId, conversation, onAvatarPress, THEME, styles }) => {
  const senderColor = isMine ? THEME.accent : getSenderColor(msg.senderName, THEME);
  const bubbleBg = isMine ? THEME.bubbleSelf : THEME.bubbleOther;
  const bubbleText = isMine ? '#ffffff' : THEME.textPrimary;

  const borderRadius = { borderRadius: 18 };
  if (isMine) {
    borderRadius.borderTopRightRadius = showHeader ? 4 : 18;
    borderRadius.borderBottomRightRadius = 4;
  } else {
    borderRadius.borderTopLeftRadius = showHeader ? 4 : 18;
    borderRadius.borderBottomLeftRadius = 4;
  }

  const renderContent = () => {
    if (msg.revoked || msg.recalled) {
      return <Text style={[styles.bubbleText, { color: bubbleText, fontStyle: 'italic', opacity: 0.7 }]}>Tin nhắn đã được thu hồi</Text>;
    }
    if (msg.type === 'image') {
      return (
        <Image
          source={{ uri: msg.payload?.url || msg.content }}
          style={styles.imgAttachment}
          resizeMode="cover"
        />
      );
    }
    if (msg.type === 'voice') {
      return (
        <VoicePlayer
          url={msg.payload?.url}
          duration={msg.payload?.duration}
          isMine={isMine}
          THEME={THEME}
        />
      );
    }
    if (msg.type === 'file') {
      return (
        <View style={styles.fileRow}>
          <Text style={{ fontSize: 20 }}>📎</Text>
          <Text style={[styles.bubbleText, { color: bubbleText, textDecorationLine: 'underline' }]}>
            {msg.payload?.fileName || msg.content}
          </Text>
        </View>
      );
    }
    return (
      <Text style={[styles.bubbleText, { color: bubbleText }]}>
        {msg.content}
        {msg.edited && (
          <Text style={{ fontSize: 11, fontStyle: 'italic', opacity: 0.6 }}> (đã chỉnh sửa)</Text>
        )}
      </Text>
    );
  };

  const renderSeenStatus = () => {
    if (!isMine || msg.revoked) return null;

    if (msg.blocked) {
      return (
        <Text style={[styles.seenText, { color: '#ef4444' }]}>
          Bị chặn bởi người dùng này
        </Text>
      );
    }

    const readBy = msg.readBy || [];

    if (conversation.type !== 'group') {
      // Chat đơn: Đã xem / Đã gửi
      const isSeen = readBy.length > 0;
      return (
        <Text style={styles.seenText}>
          {isSeen ? 'Đã xem' : 'Đã gửi'}
        </Text>
      );
    } else {
      // Chat group: Avatars
      if (readBy.length === 0) return null;
      return (
        <TouchableOpacity
          style={styles.seenAvatars}
          onPress={() => onShowReadBy(readBy)}
        >
          {readBy.slice(0, 3).map((r, i) => (
            <View key={r.userId} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }]}>
              {r.avatar ? (
                <Image source={{ uri: r.avatar }} style={styles.miniAvatarImg} />
              ) : (
                <View style={[styles.miniAvatarImg, { backgroundColor: THEME.accent, justifyContent: 'center', alignItems: 'center' }]}>
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
    }
  };

  return (
    <View style={[styles.msgRow, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
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

      <View style={[styles.msgContent, { alignItems: isMine ? 'flex-end' : 'flex-start' }]}>
        {showHeader && (
          <View style={[styles.msgHeader, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
            {!isMine && <Text style={[styles.senderName, { color: senderColor }]}>{msg.senderName}</Text>}
            <Text style={styles.msgTime}>{msg.time}</Text>
          </View>
        )}

        <Pressable onLongPress={() => onLongPress && onLongPress(msg)} delayLongPress={400}>
          <View style={[styles.bubble, { backgroundColor: bubbleBg }, borderRadius]}>
            {renderContent()}
          </View>
        </Pressable>

        {/* Reactions Summary */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <View style={[
            styles.reactionSummary,
            isMine ? { right: 12 } : { left: 12 }
          ]}>
            {Object.entries(msg.reactions).map(([emoji, count], idx) => (
              <View key={idx} style={styles.reactionItem}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
              </View>
            ))}
          </View>
        )}
        {renderSeenStatus()}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Emoji list
// ─────────────────────────────────────────────
const EMOJIS = [
  '😀', '😂', '😍', '🥺', '😭', '😊', '😎', '🤔',
  '😅', '🥰', '😢', '😡', '😴', '🤗', '😏', '🙄',
  '❤️', '🔥', '✨', '🎉', '👍', '👏', '🙏', '💯',
];

// ─────────────────────────────────────────────
// Forward Modal
// ─────────────────────────────────────────────
const ForwardModal = ({ isOpen, onClose, msg, THEME, styles }) => {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      conversationApi.listMyConversations()
        .then(res => setConversations(res.data.data || []))
        .catch(err => console.error('listMyConversations error:', err))
        .finally(() => setLoading(false));
    } else {
      setSearch('');
      setSelectedIds([]);
      setSending(false);
    }
  }, [isOpen]);

  const filtered = conversations.filter(c => {
    const name = c.type === 'dm' ? c.otherUser?.displayName : c.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      for (const convId of selectedIds) {
        await messageApi.forwardMessage(convId, msg._id || msg.id);
      }
      onClose();
      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn');
    } catch (err) {
      console.error('Forward error:', err);
      Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: THEME.bgTertiary, paddingTop: Platform.OS === 'ios' ? 50 : 10 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', padding: 16,
          backgroundColor: THEME.bgSecondary, borderBottomWidth: 1, borderBottomColor: THEME.border
        }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary }}>Chuyển tiếp</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 24, color: THEME.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ padding: 12 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bgInput,
            borderRadius: 10, paddingHorizontal: 12
          }}>
            <Text style={{ fontSize: 18 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, padding: 10, color: THEME.textPrimary }}
              placeholder="Tìm kiếm người hoặc nhóm..."
              placeholderTextColor={THEME.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => {
            const name = item.type === 'dm' ? item.otherUser?.displayName : item.name;
            const avatar = item.type === 'dm' ? item.otherUser?.avatar : item.avatar;
            const isSelected = selectedIds.includes(item._id);

            return (
              <TouchableOpacity
                onPress={() => toggleSelect(item._id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
                  backgroundColor: isSelected ? THEME.bgHover : 'transparent'
                }}
              >
                <Avatar name={name} avatar={avatar} size={44} THEME={THEME} styles={styles} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: THEME.textPrimary }}>{name}</Text>
                  <Text style={{ fontSize: 12, color: THEME.textMuted }}>
                    {item.type === 'dm' ? 'Cá nhân' : `${item.totalMembers || 0} thành viên`}
                  </Text>
                </View>
                <View style={{
                  width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                  borderColor: isSelected ? THEME.accent : THEME.border,
                  backgroundColor: isSelected ? THEME.accent : 'transparent',
                  justifyContent: 'center', alignItems: 'center'
                }}>
                  {isSelected && <Text style={{ color: '#fff', fontSize: 14 }}>✔️</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: THEME.textMuted }}>Không tìm thấy kết quả</Text>}
        />

        {/* Footer */}
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: THEME.border, backgroundColor: THEME.bgSecondary }}>
          <TouchableOpacity
            disabled={selectedIds.length === 0 || sending}
            onPress={handleSend}
            style={{
              backgroundColor: selectedIds.length > 0 ? THEME.accent : THEME.border,
              padding: 14, borderRadius: 10, alignItems: 'center'
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {sending ? 'Đang gửi...' : `Chuyển tiếp ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Message Screen
// ─────────────────────────────────────────────
export default function MessageScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { user, token } = useAuth();
  const { theme: THEME } = useTheme();
  const { isUserOnline, getLastSeen } = usePresence();
  const msgStyles = useStyles(THEME);

  const currentUserId = user?._id?.toString() || null;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [typingUser, setTypingUser] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [reactionTypes, setReactionTypes] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [currentReadByList, setCurrentReadByList] = useState([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState(null);

  // Info panel state (from demo)
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [infoTab, setInfoTab] = useState('info'); // 'info' | 'media' | 'files'
  const [mediaData, setMediaData] = useState({ images: [], files: [] });
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockStatus, setBlockStatus] = useState(null); // { iBlocked, theyBlockedMe }

  const flatRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    // Load reaction types
    messageApi.getReactionTypes()
      .then(res => setReactionTypes(res.data.data))
      .catch(err => console.error('getReactionTypes error:', err));
  }, []);

  // ── Keyboard listener (fixes Android keyboard overlap) ─────────────────
  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const onShow = (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setShowEmoji(false); // ẩn emoji picker khi bàn phím hiện
    };
    const onHide = () => setKeyboardHeight(0);

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // ── Load messages from API (với cơ chế cache và lọc trùng lặp) ────────
  const loadMessages = useCallback(async () => {
    try {
      const res = await messageApi.getMessages(conversation.id);
      const raw = (res.data.messages || []).map(normalizeMsg);
      const seen = new Set();
      const msgs = raw.filter(m => {
        const k = m._id?.toString();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setMessages(msgs);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, [conversation.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Reload khi screen gain focus (back từ profile, v.v.)
  useFocusEffect(useCallback(() => { loadMessages(); }, [loadMessages]));

  // ── Load media/files khi mở info panel tab media/files ────────────────
  const loadMediaData = useCallback(async () => {
    if (!conversation.id) return;
    setLoadingMedia(true);
    try {
      const res = await messageApi.getAttachments(conversation.id);
      setMediaData(res.data || { images: [], files: [] });
    } catch {
      setMediaData({ images: [], files: [] });
    } finally {
      setLoadingMedia(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    if (showInfoPanel && (infoTab === 'media' || infoTab === 'files')) {
      loadMediaData();
    }
  }, [showInfoPanel, infoTab, loadMediaData]);

  // ── Fetch block status ─────────────────────────────────────────────────
  const fetchBlockStatus = useCallback(async () => {
    if (!conversation.otherUserId || conversation.type !== 'dm') return;
    try {
      const res = await friendApi.getFriendStatus(conversation.otherUserId);
      const d = res?.data?.data;
      setBlockStatus(d ? { iBlocked: !!d.iBlocked, theyBlockedMe: !!d.theyBlockedMe } : null);
    } catch {
      setBlockStatus(null);
    }
  }, [conversation.otherUserId, conversation.type]);

  useEffect(() => { fetchBlockStatus(); }, [fetchBlockStatus]);

  // ── Block / Unblock user ─────────────────────────────────────────────────
  const handleBlockUser = async () => {
    if (!conversation.otherUserId) return;
    setBlockBusy(true);
    try {
      await friendApi.blockFriend(conversation.otherUserId);
      setBlockConfirm(false);
      setShowInfoPanel(false);
      await fetchBlockStatus();
      const isNowBlocked = !blockStatus?.iBlocked;
      Alert.alert(isNowBlocked ? 'Đã chặn' : 'Đã bỏ chặn', isNowBlocked ? `Bạn đã chặn ${conversation.name}.` : `Đã bỏ chặn ${conversation.name}.`);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thực hiện.');
    } finally {
      setBlockBusy(false);
    }
  };

  // ── Socket.io connection ───────────────────────────────────────────────
  useEffect(() => {
    const accessToken = token;
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.emit('chat:join', { conversationId: conversation.id });

    socket.on('chat:new-message', ({ conversationId, message }) => {
      if (conversationId !== conversation.id) return;
      const msg = normalizeMsg(message);
      setMessages(prev => {
        if (prev.some(m => m._id?.toString() === msg._id?.toString())) return prev;
        return [...prev, msg];
      });
    });

    socket.on('chat:typing', ({ conversationId: cid, userId, displayName }) => {
      if (cid !== conversation.id || userId === currentUserId) return;
      setTypingUser({ userId, displayName });
    });

    socket.on('chat:stop-typing', ({ conversationId: cid }) => {
      if (cid !== conversation.id) return;
      setTypingUser(null);
    });

    socket.on('chat:message-reaction', (data) => {
      const { conversationId: cid, messageId, userId, emoji, action, reactions: serverReactions } = data;
      if (cid !== conversation.id) return;

      setMessages(prev => prev.map(m => {
        const mId = m._id?.toString();
        if (mId !== messageId) return m;

        const newReactions = serverReactions || m.reactions || {};
        let newMyReaction = m.myReaction;
        if (userId === currentUserId) {
          newMyReaction = (action === 'removed') ? null : emoji;
        }

        return { ...m, reactions: newReactions, myReaction: newMyReaction };
      }));
    });

    socket.on('chat:message-revoked', ({ conversationId: cid, messageId }) => {
      if (cid !== conversation.id) return;
      setMessages(prev => prev.map(m =>
        (m._id?.toString() === messageId?.toString()) ? { ...m, revoked: true } : m
      ));
    });

    socket.on('chat:message-edited', ({ conversationId: cid, message }) => {
      if (cid !== conversation.id) return;
      setMessages(prev => prev.map(m => {
        if (m._id?.toString() === message._id?.toString()) {
          const normalized = normalizeMsg(message);
          // TRỘN DỮ LIỆU: Giữ lại reactions và myReaction cũ
          return {
            ...m,
            ...normalized,
            reactions: m.reactions,
            myReaction: m.myReaction
          };
        }
        return m;
      }));
    });

    socket.on('chat:message-read', (data) => {
      const { conversationId: cid, messageId, userId, displayName, avatar, readAt } = data;
      if (cid !== conversation.id) return;

      setMessages(prev => prev.map(m => {
        if (m._id?.toString() === messageId?.toString()) {
          const alreadyRead = (m.readBy || []).some(r => r.userId?.toString() === userId?.toString());
          if (alreadyRead) return m;
          const newReadBy = [...(m.readBy || []), { userId, displayName, avatar, readAt }];
          return { ...m, readBy: newReadBy };
        }
        return m;
      }));
    });

    socket.on('chat:message-deleted-for-me', ({ conversationId: cid, messageId }) => {
      if (cid !== conversation.id) return;
      setMessages(prev => prev.filter(m => (m._id || m.id)?.toString() !== messageId?.toString()));
    });

    return () => {
      socket.emit('chat:leave', { conversationId: conversation.id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, conversation.id, currentUserId]);

  const scrollToBottom = useCallback(() => {
    if (flatRef.current && messages.length > 0) {
      flatRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages]);

  // ── Auto mark as read ───────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.senderId !== currentUserId) {
      const mId = lastMsg._id?.toString();
      if (mId && !mId.startsWith('temp_')) {
        messageApi.markAsRead(conversation.id, mId).catch(() => { });
      }
    }
  }, [messages.length, conversation.id]);

  // scroll khi keyboard hiện để tin nhắn cuối không bị che
  useEffect(() => {
    if (keyboardHeight > 0) {
      const t = setTimeout(scrollToBottom, 80);
      return () => clearTimeout(t);
    }
  }, [keyboardHeight]);

  // ── Typing indicator ───────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { conversationId: conversation.id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stop-typing', { conversationId: conversation.id });
    }, 2000);
  }, [conversation.id]);

  // ── Send text / Update edited text ──────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      // ── Chế độ CHỈNH SỬA ──────────────────────────────────────────
      const mId = editingMessage._id?.toString();
      const oldContent = editingMessage.content;

      // Optimistic update
      setMessages(prev => prev.map(m =>
        (m._id?.toString() === mId) ? { ...m, content: trimmed, edited: true } : m
      ));
      setEditingMessage(null);
      setText('');
      Keyboard.dismiss();

      try {
        await messageApi.editMessage(mId, trimmed);
      } catch (err) {
        console.error('editMessage error:', err);
        Alert.alert('Lỗi', 'Không thể chỉnh sửa tin nhắn');
        // Rollback nếu cần hoặc thông báo cho user
      }
      return;
    }

    // ── Chế độ GỬI MỚI ──────────────────────────────────────────────
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const tempMsg = {
      _id: tempId, senderId: currentUserId,
      senderName: user?.displayName || 'Tôi',
      avatar: user?.avatar || null,
      type: 'text', content: trimmed, payload: {},
      time: fmtTime(now), createdAt: now,
    };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    setShowEmoji(false);

    if (socketRef.current) {
      clearTimeout(typingTimerRef.current);
      socketRef.current.emit('chat:stop-typing', { conversationId: conversation.id });
    }

    try {
      const res = await messageApi.sendText(conversation.id, trimmed);
      const real = normalizeMsg(res.data.data);
      const realId = real._id?.toString();
      setMessages(prev => {
        const cleaned = prev.filter(m => m._id?.toString() !== realId);
        return cleaned.map(m => m._id === tempId ? real : m);
      });
    } catch (err) {
      console.error('sendText error:', err);
      if (err?.response?.status === 403) {
        // Tin nhắn bị chặn: giữ lại nhưng đánh dấu blocked
        setMessages(prev => prev.map(m =>
          m._id === tempId ? { ...m, blocked: true } : m
        ));
        await fetchBlockStatus();
      } else {
        setMessages(prev => prev.filter(m => m._id !== tempId));
      }
    }
  };

  // ── Voice recording (native only — expo-av Recording not supported on web) ──
  const startRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Thông báo', 'Ghi âm chưa được hỗ trợ trên web.');
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập mic', 'Vui lòng cấp quyền microphone để ghi âm.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      setIsRecording(true);
      setRecordingSec(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSec(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('startRecording error:', err);
    }
  };

  const stopRecording = async () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const duration = recordingSec;

    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }

      const uri = recording.getURI();
      recordingRef.current = null;

      const fd = new FormData();
      fd.append('voice', { uri, name: 'voice.m4a', type: 'audio/mp4' });
      fd.append('duration', String(duration));

      const up = await messageApi.uploadVoice(fd);
      const res = await messageApi.sendVoice(conversation.id, up.data.voice.fileId);
      const msg = normalizeMsg(res.data.data);
      const id = msg._id?.toString();
      setMessages(prev => prev.some(m => m._id?.toString() === id) ? prev : [...prev, msg]);
    } catch (err) {
      console.error('stopRecording error:', err);
    }
  };

  const cancelRecording = async () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) {
        await recording.stopAndUnloadAsync();
        if (Platform.OS !== 'web') {
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        }
      }
    } catch { }
  };

  // ── Send image ────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    try {
      // On web, permissions are not required (browser file picker handles it)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        // 'limited' = iOS user granted access to selected photos only – still allow picker
        if (status !== 'granted' && status !== 'limited') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh trong Cài đặt.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fd = new FormData();
      if (Platform.OS === 'web') {
        // On web, asset.uri is a blob: or data: URL – convert to Blob for browser FormData
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        fd.append('file', blob, asset.fileName || 'image.jpg');
      } else {
        // React Native FormData accepts { uri, name, type } objects
        fd.append('file', { uri: asset.uri, name: asset.fileName || 'image.jpg', type: asset.mimeType || 'image/jpeg' });
      }

      const up = await messageApi.uploadImage(fd);
      const res = await messageApi.sendImage(conversation.id, up.data.file.fileId);
      const msg = normalizeMsg(res.data.data);
      const id = msg._id?.toString();
      setMessages(prev => prev.some(m => m._id?.toString() === id) ? prev : [...prev, msg]);
    } catch (err) {
      console.error('handlePickImage error:', err);
      Alert.alert('Lỗi', 'Không thể gửi ảnh. Vui lòng thử lại.');
    }
  };

  // ── Send file ─────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fd = new FormData();
      if (Platform.OS === 'web') {
        // On web, asset.uri is a blob: URL – convert to Blob for browser FormData
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        fd.append('file', blob, asset.name);
      } else {
        fd.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
      }

      const up = await messageApi.uploadFile(fd);
      const res = await messageApi.sendFile(conversation.id, up.data.file.fileId);
      const msg = normalizeMsg(res.data.data);
      const id = msg._id?.toString();
      setMessages(prev => prev.some(m => m._id?.toString() === id) ? prev : [...prev, msg]);
    } catch (err) {
      console.error('handlePickFile error:', err);
      Alert.alert('Lỗi', 'Không thể gửi file. Vui lòng thử lại.');
    }
  };

  const insertEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleReact = async (msg, emoji) => {
    try {
      const mId = msg._id || msg.id;
      if (!mId) return;
      await messageApi.toggleReaction(mId.toString(), emoji);
    } catch (err) {
      console.error('handleReact error:', err);
    }
  };

  const handleRevoke = async (msg) => {
    try {
      const mId = msg._id || msg.id;
      if (!mId) return;
      await messageApi.revokeMessage(mId.toString());
      // Optimistic update
      setMessages(prev => prev.map(m =>
        (m._id?.toString() === mId.toString()) ? { ...m, revoked: true } : m
      ));
    } catch (err) {
      console.error('handleRevoke error:', err);
      Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
    }
  };

  const handleDeleteForMe = async (msg) => {
    try {
      const mId = msg._id || msg.id;
      if (!mId) return;

      // Optimistic update: Xóa ngay lập tức trên UI
      setMessages(prev => prev.filter(m => (m._id || m.id) !== mId));

      // Gọi API xóa phía tôi
      await messageApi.deleteForMe(mId.toString());
    } catch (err) {
      console.error('handleDeleteForMe error:', err);
      Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setText(msg.content || '');
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleShowReadBy = (readBy) => {
    setCurrentReadByList(readBy);
    setShowReadByModal(true);
  };


  // ── Build display list ─────────────────────────────────────────────────
  const displayItems = [];
  const seenIds = new Set();
  messages.forEach((msg, i) => {
    const msgKey = msg._id?.toString() || msg.id?.toString();
    if (msgKey && seenIds.has(msgKey)) return;
    if (msgKey) seenIds.add(msgKey);

    const prev = messages[i - 1];
    const msgDate = msg.time?.split(' ')[0];
    const prevDate = prev?.time?.split(' ')[0];
    if (i === 0 || (msgDate && prevDate && msgDate !== prevDate && msg.time?.includes(' '))) {
      if (msg.time?.includes(' ')) {
        displayItems.push({ type: 'date', label: msgDate, key: `date-${msgKey || i}` });
      }
    }
    const sameGroup = prev && prev.senderId === msg.senderId
      && !msg.time?.includes(' ') && !prev.time?.includes(' ');
    displayItems.push({
      type: 'msg', msg, key: `msg-${msgKey || i}`,
      isMine: msg.senderId === currentUserId,
      showHeader: !sameGroup,
    });
  });

  // Live presence — không dùng conversation.online (static, luôn false)
  const isOnline = conversation.type === 'dm' && conversation.otherUserId
    ? isUserOnline(conversation.otherUserId)
    : null;
  const statusText = conversation.type === 'dm'
    ? (isOnline
        ? 'Đang hoạt động'
        : (() => {
            const ls = conversation.otherUserId ? getLastSeen(conversation.otherUserId) : null;
            return ls ? `Hoạt động ${formatLastSeen(ls)}` : 'Ngoại tuyến';
          })())
    : `${conversation.memberCount || conversation.members || 0} thành viên`;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* ── Header ── */}
      <View style={msgStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={msgStyles.backBtn}>
          <Text style={msgStyles.backArrow}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginRight: 10 }}
          onPress={() => conversation.otherUserId && navigation.push('UserProfile', { userId: conversation.otherUserId })}
          activeOpacity={conversation.otherUserId ? 0.7 : 1}
        >
          <Avatar
            name={conversation.name}
            avatar={conversation.avatar}
            size={36}
            online={isOnline}
            THEME={THEME}
            styles={msgStyles}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={msgStyles.headerName} numberOfLines={1}>
            {conversation.type === 'group' ? `# ${conversation.name}` : conversation.name}
          </Text>
          <Text style={[msgStyles.headerStatus, { color: isOnline ? THEME.statusOnline : THEME.textMuted }]}>
            {statusText}
          </Text>
        </View>

        <View style={msgStyles.headerActions}>
          <TouchableOpacity style={msgStyles.headerBtn}>
            <Text style={{ fontSize: 18 }}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={msgStyles.headerBtn}>
            <Text style={{ fontSize: 18 }}>📹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={msgStyles.headerBtn} onPress={() => { setInfoTab('info'); setShowInfoPanel(true); }}>
            <Text style={{ fontSize: 18 }}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body: messages + input — dùng View thường, padding theo keyboardHeight ── */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatRef}
          data={displayItems}
          keyExtractor={item => item.key}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListHeaderComponent={() => (
            <View style={msgStyles.introBox}>
              <View style={[msgStyles.introAvatar, { backgroundColor: getAvatarColor(conversation.name) }]}>
                <Text style={msgStyles.introInitials}>{getInitials(conversation.name)}</Text>
              </View>
              <Text style={msgStyles.introName}>
                {conversation.type === 'dm' ? conversation.name : `# ${conversation.name}`}
              </Text>
              <Text style={msgStyles.introDesc}>
                {conversation.type === 'dm'
                  ? `Đây là bắt đầu trò chuyện với ${conversation.name}.`
                  : `Chào mừng đến kênh #${conversation.name}!`}
              </Text>
            </View>
          )}
          ListFooterComponent={() =>
            typingUser ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                <Text style={{ fontSize: 12, color: THEME.textMuted, fontStyle: 'italic' }}>
                  {typingUser.displayName} đang nhập...
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item.type === 'date'
              ? <DateDivider label={item.label} styles={msgStyles} />
              : <MessageBubble
                msg={item.msg}
                isMine={item.isMine}
                showHeader={item.showHeader}
                onLongPress={setActionMsg}
                onShowReadBy={handleShowReadBy}
                onAvatarPress={(senderId) => senderId && navigation.push('UserProfile', { userId: senderId })}
                currentUserId={currentUserId}
                conversation={conversation}
                THEME={THEME}
                styles={msgStyles}
              />
          }
        />

        {/* ── Block banners ── */}
        {conversation.type === 'dm' && blockStatus?.iBlocked && (
          <View style={{ backgroundColor: THEME.bgSecondary, borderTopWidth: 1, borderTopColor: THEME.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Text style={{ color: THEME.textMuted, fontSize: 13 }}>Bạn đã chặn người này.</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await friendApi.blockFriend(conversation.otherUserId);
                  await fetchBlockStatus();
                } catch (e) {
                  Alert.alert('Lỗi', 'Không thể bỏ chặn');
                }
              }}
              style={{ backgroundColor: THEME.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Bỏ chặn</Text>
            </TouchableOpacity>
          </View>
        )}
        {conversation.type === 'dm' && blockStatus?.theyBlockedMe && (
          <View style={{ backgroundColor: '#fef3c7', borderTopWidth: 1, borderTopColor: '#fcd34d', padding: 8, alignItems: 'center' }}>
            <Text style={{ color: '#92400e', fontSize: 12 }}>Bạn đã bị người này chặn. Tin nhắn sẽ không được nhận.</Text>
          </View>
        )}

        {/* ── Wrapper bọc emoji + input/recording, đẩy lên theo keyboardHeight ── */}
        <View style={{ paddingBottom: keyboardHeight }}>

          {/* ── Editing bar ── */}
          {editingMessage && (
            <View style={msgStyles.editBar}>
              <View style={{ flex: 1 }}>
                <Text style={msgStyles.editLabel}>Đang chỉnh sửa tin nhắn</Text>
                <Text style={msgStyles.editContent} numberOfLines={1}>
                  {editingMessage.content}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setText(''); }} style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: THEME.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Emoji picker ── */}
          {showEmoji && (
            <View style={msgStyles.emojiPicker}>
              <View style={msgStyles.emojiGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity key={e} onPress={() => insertEmoji(e)} style={msgStyles.emojiBtn}>
                    <Text style={msgStyles.emojiChar}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Recording / Input (ẩn khi người dùng chặn người kia) ── */}
          {!(conversation.type === 'dm' && blockStatus?.iBlocked) && (isRecording ? (
            <View style={msgStyles.recordingBar}>
              <View style={msgStyles.recordingDot} />
              <Text style={msgStyles.recordingTimer}>{fmtDur(recordingSec)}</Text>
              <Text style={{ flex: 1, fontSize: 13, color: THEME.textMuted }}>Đang ghi âm...</Text>
              <TouchableOpacity onPress={cancelRecording} style={msgStyles.inputBtn}>
                <Text style={{ fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRecording} style={[msgStyles.sendBtn, { backgroundColor: '#ed4245' }]}>
                <Text style={msgStyles.sendIcon}>↑</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Input bar ── */
            <View style={msgStyles.inputBar}>
              <TouchableOpacity style={msgStyles.inputBtn} onPress={handlePickFile}>
                <Text style={msgStyles.inputBtnIcon}>📎</Text>
              </TouchableOpacity>

              <View style={msgStyles.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={msgStyles.textInput}
                  value={text}
                  onChangeText={(v) => { setText(v); if (v.trim()) emitTyping(); }}
                  placeholder={`Nhắn tin ${conversation.type === 'group' ? '#' : ''}${conversation.name}...`}
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  selectionColor={THEME.accent}
                />
                <TouchableOpacity onPress={() => setShowEmoji(v => !v)} style={msgStyles.emojiToggle}>
                  <Text style={{ fontSize: 20 }}>😊</Text>
                </TouchableOpacity>
              </View>

              {text.trim().length > 0 ? (
                <TouchableOpacity style={msgStyles.sendBtn} onPress={handleSend}>
                  <Text style={msgStyles.sendIcon}>↑</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={msgStyles.inputBtn} onPress={handlePickImage}>
                    <Text style={msgStyles.inputBtnIcon}>🖼️</Text>
                  </TouchableOpacity>
                  {/* expo-av Recording is not supported on Expo Web */}
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity style={msgStyles.inputBtn} onPress={startRecording}>
                      <Text style={msgStyles.inputBtnIcon}>🎤</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* ── Conversation Info Panel ── */}
      <Modal visible={showInfoPanel} transparent animationType="slide" onRequestClose={() => setShowInfoPanel(false)}>
        <Pressable style={msgStyles.sheetOverlay} onPress={() => setShowInfoPanel(false)}>
          <View style={[msgStyles.sheet, { maxHeight: '85%' }]} onStartShouldSetResponder={() => true}>
            <View style={msgStyles.sheetHandle} />

            {/* Avatar + Name */}
            <View style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 }}>
              <Avatar
                name={conversation.name}
                avatar={conversation.avatar}
                size={72}
                online={isOnline}
                THEME={THEME}
                styles={msgStyles}
              />
              <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.textPrimary, marginTop: 10 }}>
                {conversation.name}
              </Text>
              {conversation.type === 'dm' && (
                <Text style={{ fontSize: 12, color: isOnline ? THEME.statusOnline : THEME.textMuted, marginTop: 2 }}>
                  {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </Text>
              )}
            </View>

            {/* Tab bar */}
            <View style={{ flexDirection: 'row', marginHorizontal: 16, backgroundColor: THEME.bgPrimary, borderRadius: 8, padding: 3, marginBottom: 12 }}>
              {[
                { key: 'info', label: 'Thông tin' },
                { key: 'media', label: 'Ảnh' },
                { key: 'files', label: 'File' },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setInfoTab(t.key)}
                  style={{
                    flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center',
                    backgroundColor: infoTab === t.key ? THEME.bgSecondary : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: infoTab === t.key ? '700' : '500', color: infoTab === t.key ? THEME.textPrimary : THEME.textMuted }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Info tab */}
              {infoTab === 'info' && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                  <View style={{ backgroundColor: THEME.bgPrimary, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                    <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.border, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: THEME.textMuted }}>Loại</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.textPrimary }}>
                        {conversation.type === 'dm' ? 'Tin nhắn trực tiếp' : 'Nhóm chat'}
                      </Text>
                    </View>
                    {conversation.type === 'dm' && conversation.otherUserId && (
                      <TouchableOpacity
                        style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        onPress={() => { setShowInfoPanel(false); navigation.push('UserProfile', { userId: conversation.otherUserId }); }}
                      >
                        <Text style={{ fontSize: 13, color: THEME.textMuted }}>Xem hồ sơ</Text>
                        <Text style={{ fontSize: 13, color: THEME.accent, fontWeight: '600' }}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Actions */}
                  {conversation.type === 'dm' && conversation.otherUserId && (
                    <>
                      {blockStatus?.iBlocked ? (
                        // Đã chặn → Nút bỏ chặn
                        <TouchableOpacity
                          onPress={handleBlockUser}
                          disabled={blockBusy}
                          style={{ backgroundColor: THEME.bgHover, borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: THEME.border, opacity: blockBusy ? 0.6 : 1 }}
                        >
                          <Text style={{ fontSize: 18 }}>✅</Text>
                          <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 15 }}>{blockBusy ? 'Đang xử lý...' : `Bỏ chặn ${conversation.name}`}</Text>
                        </TouchableOpacity>
                      ) : !blockConfirm ? (
                        // Chưa chặn → Nút chặn
                        <TouchableOpacity
                          onPress={() => setBlockConfirm(true)}
                          style={{ backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(237,66,69,0.3)' }}
                        >
                          <Text style={{ fontSize: 18 }}>🚫</Text>
                          <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>Chặn {conversation.name}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(237,66,69,0.4)' }}>
                          <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 6 }}>
                            Xác nhận chặn {conversation.name}?
                          </Text>
                          <Text style={{ color: THEME.textMuted, fontSize: 12, marginBottom: 14 }}>
                            Bạn sẽ không thể gửi tin nhắn cho người này.
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              onPress={() => setBlockConfirm(false)}
                              style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: THEME.bgHover, alignItems: 'center' }}
                            >
                              <Text style={{ color: THEME.textPrimary, fontWeight: '600' }}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleBlockUser}
                              disabled={blockBusy}
                              style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#ed4245', alignItems: 'center', opacity: blockBusy ? 0.6 : 1 }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '700' }}>{blockBusy ? 'Đang chặn...' : 'Chặn'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Media tab */}
              {infoTab === 'media' && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                  {loadingMedia && (
                    <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>
                  )}
                  {!loadingMedia && mediaData.images.length === 0 && (
                    <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Chưa có ảnh nào được chia sẻ</Text>
                  )}
                  {!loadingMedia && mediaData.images.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                      {mediaData.images.map((item) => (
                        <Image
                          key={item._id}
                          source={{ uri: item.url }}
                          style={{ width: '32%', aspectRatio: 1, borderRadius: 6 }}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Files tab */}
              {infoTab === 'files' && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                  {loadingMedia && (
                    <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>
                  )}
                  {!loadingMedia && mediaData.files.length === 0 && (
                    <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Chưa có file nào được chia sẻ</Text>
                  )}
                  {!loadingMedia && mediaData.files.map((file) => (
                    <View
                      key={file._id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 6 }}
                    >
                      <Text style={{ fontSize: 24 }}>📄</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.textPrimary }} numberOfLines={1}>
                          {file.fileName}
                        </Text>
                        {file.fileSize && (
                          <Text style={{ fontSize: 11, color: THEME.textMuted }}>
                            {(file.fileSize / 1024).toFixed(0)} KB
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Long press action sheet ── */}
      <Modal visible={!!actionMsg} transparent animationType="slide">
        <Pressable style={msgStyles.sheetOverlay} onPress={() => setActionMsg(null)}>
          <View style={msgStyles.sheet}>
            <View style={msgStyles.sheetHandle} />

            {!actionMsg?.revoked && (
              <View style={msgStyles.reactRow}>
                {(reactionTypes.length > 0 ? reactionTypes : [
                  { emoji: '👍' }, { emoji: '❤️' }, { emoji: '😂' }, { emoji: '😮' }, { emoji: '😢' }, { emoji: '🔥' }
                ]).map(r => (
                  <TouchableOpacity
                    key={r.emoji}
                    onPress={() => { handleReact(actionMsg, r.emoji); setActionMsg(null); }}
                    style={msgStyles.reactBtn}
                  >
                    <Text style={msgStyles.reactEmoji}>{r.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {[
              { icon: '↩️', label: 'Trả lời', action: 'reply' },
              { icon: '➡️', label: 'Chuyển tiếp', action: 'forward' },
              { icon: '📋', label: 'Sao chép tin nhắn', action: 'copy' },
              { icon: '📌', label: 'Ghim tin nhắn', action: 'pin' },
              { icon: '🛡️', label: 'Thu hồi', action: 'revoke', danger: true },
              { icon: '✏️', label: 'Chỉnh sửa tin nhắn', action: 'edit' },
              { icon: '🗑️', label: 'Xóa tin nhắn', action: 'delete', danger: true },
            ].map(a => {
              // Logic hiển thị:
              const isMe = actionMsg?.senderId === currentUserId;
              const isRevoked = actionMsg?.revoked;

              if (a.action === 'revoke' && (!isMe || isRevoked)) return null;
              if (a.action === 'edit' && (!isMe || isRevoked || actionMsg?.type !== 'text')) return null;
              if (a.action === 'copy' && actionMsg?.type !== 'text') return null;

              return (
                <TouchableOpacity
                  key={a.label}
                  onPress={() => {
                    if (a.action === 'revoke') handleRevoke(actionMsg);
                    if (a.action === 'edit') handleStartEdit(actionMsg);
                    if (a.action === 'delete') handleDeleteForMe(actionMsg);
                    if (a.action === 'forward') {
                      setForwardingMsg(actionMsg);
                      setShowForwardModal(true);
                    }
                    setActionMsg(null);
                  }}
                  style={msgStyles.sheetAction}
                >
                  <Text style={msgStyles.sheetActionIcon}>{a.icon}</Text>
                  <Text style={[msgStyles.sheetActionLabel, a.danger && { color: THEME.danger }]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Read By Modal ── */}
      <Modal visible={showReadByModal} transparent animationType="fade">
        <Pressable style={msgStyles.sheetOverlay} onPress={() => setShowReadByModal(false)}>
          <View style={[msgStyles.sheet, { paddingBottom: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary }}>Người đã xem</Text>
              <TouchableOpacity onPress={() => setShowReadByModal(false)}>
                <Text style={{ fontSize: 22, color: THEME.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {currentReadByList.map(r => (
                <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    {r.avatar ? <Image source={{ uri: r.avatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{r.displayName?.charAt(0)}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: THEME.textPrimary }}>{r.displayName}</Text>
                    <Text style={{ fontSize: 12, color: THEME.textMuted }}>Đã xem lúc {new Date(r.readAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Forward Modal ── */}
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        msg={forwardingMsg}
        THEME={THEME}
        styles={msgStyles}
      />

    </View>
  );
}

const useStyles = (THEME) => StyleSheet.create({
  avatarCircle: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    borderWidth: 2, borderColor: THEME.bgSecondary,
  },

  // Header
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
    paddingHorizontal: 4,
  },
  backBtn: { padding: 12 },
  backArrow: { fontSize: 22, color: THEME.accent, fontWeight: '700' },
  headerName: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary },
  headerStatus: { fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 10 },

  // Intro
  introBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: THEME.border, marginBottom: 8 },
  introAvatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  introInitials: { color: '#fff', fontWeight: '800', fontSize: 22 },
  introName: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 4 },
  introDesc: { fontSize: 14, color: THEME.textMuted, lineHeight: 20 },

  // Date divider
  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  dateLine: { flex: 1, height: 1, backgroundColor: THEME.border },
  dateLabel: { fontSize: 11, color: THEME.textMuted, fontWeight: '600', paddingHorizontal: 8 },

  // Message
  msgRow: { paddingHorizontal: 12, paddingVertical: 2, alignItems: 'flex-start' },
  msgContent: { maxWidth: '80%', flex: 1 },
  msgHeader: { gap: 6, alignItems: 'baseline', marginBottom: 3 },
  senderName: { fontSize: 13, fontWeight: '700' },
  msgTime: { fontSize: 10, color: THEME.textMuted },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 2, elevation: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  reactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.bgSecondary,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: 'absolute',
    bottom: -12,
    zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 1, elevation: 2,
  },
  reactionItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: '700', color: THEME.textMuted },

  // Seen status
  seenText: { fontSize: 10, color: THEME.textMuted, alignSelf: 'flex-end', marginTop: 2, marginRight: 2 },
  seenAvatars: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, marginRight: 2 },
  miniAvatar: { width: 14, height: 14, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: THEME.bgSecondary },
  miniAvatarImg: { width: '100%', height: '100%' },
  seenCount: { fontSize: 9, color: THEME.textMuted, marginLeft: 2 },

  imgAttachment: { width: 220, height: 160, borderRadius: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Emoji picker
  emojiPicker: {
    backgroundColor: THEME.bgSecondary, borderTopWidth: 1, borderTopColor: THEME.border,
    padding: 10,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  emojiBtn: { width: '11.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  emojiChar: { fontSize: 22 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: THEME.bgSecondary,
    borderTopWidth: 1, borderTopColor: THEME.border,
  },
  inputBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  inputBtnIcon: { fontSize: 22, color: THEME.textMuted },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: THEME.bgInput, borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 6, gap: 6,
    minHeight: 40,
  },
  textInput: {
    flex: 1, color: THEME.textPrimary, fontSize: 16,
    maxHeight: 100, paddingVertical: 4,
  },
  emojiToggle: { paddingBottom: 4, justifyContent: 'flex-end' },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: THEME.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },

  // Recording bar
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: THEME.bgSecondary,
    borderTopWidth: 1, borderTopColor: '#ed4245',
  },
  recordingDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#ed4245',
  },
  recordingTimer: {
    fontSize: 16, fontWeight: '700', color: '#ed4245', letterSpacing: 1, minWidth: 48,
  },

  // Action sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: THEME.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: THEME.bgHover,
    borderRadius: 2, alignSelf: 'center', marginVertical: 12,
  },
  reactRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  reactBtn: { padding: 8, borderRadius: 10 },
  reactEmoji: { fontSize: 30 },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 15,
  },
  sheetActionIcon: { fontSize: 20 },
  sheetActionLabel: { fontSize: 16, color: THEME.textPrimary, fontWeight: '500' },

  // Edit bar
  editBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: THEME.bgSecondary,
    borderTopWidth: 1, borderTopColor: THEME.accent,
  },
  editLabel: { fontSize: 12, fontWeight: '700', color: THEME.accent, marginBottom: 2 },
  editContent: { fontSize: 13, color: THEME.textMuted },
});