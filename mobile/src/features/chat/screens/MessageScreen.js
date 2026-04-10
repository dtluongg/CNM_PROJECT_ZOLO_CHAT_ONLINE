import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, TextInput, KeyboardAvoidingView, Platform,
  Modal, StatusBar, Pressable, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import messageApi from '../api/messageApi';
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
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
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
    return () => {
      soundRef.current?.unloadAsync();
    };
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
const SENDER_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245'];
const getSenderColor = (name, THEME) =>
  name ? SENDER_COLORS[name.charCodeAt(0) % SENDER_COLORS.length] : THEME.accent;

const MessageBubble = ({ msg, isMine, showHeader, onLongPress, THEME, styles }) => {
  const senderColor = isMine ? THEME.accent : getSenderColor(msg.senderName, THEME);
  const bubbleBg    = isMine ? THEME.bubbleSelf : THEME.bubbleOther;
  const bubbleText  = isMine ? '#ffffff' : THEME.textPrimary;

  const borderRadius = { borderRadius: 18 };
  if (isMine) {
    borderRadius.borderTopRightRadius    = showHeader ? 4 : 18;
    borderRadius.borderBottomRightRadius = 4;
  } else {
    borderRadius.borderTopLeftRadius    = showHeader ? 4 : 18;
    borderRadius.borderBottomLeftRadius = 4;
  }

  const renderContent = () => {
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
    return <Text style={[styles.bubbleText, { color: bubbleText }]}>{msg.content}</Text>;
  };

  return (
    <View style={[styles.msgRow, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
      <View style={{ width: 38, alignItems: 'center', marginTop: showHeader ? 2 : 0 }}>
        {showHeader && !isMine && (
          <Avatar name={msg.senderName} avatar={msg.avatar} size={36} THEME={THEME} styles={styles} />
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
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Emoji list
// ─────────────────────────────────────────────
const EMOJIS = [
  '😀','😂','😍','🥺','😭','😊','😎','🤔',
  '😅','🥰','😢','😡','😴','🤗','😏','🙄',
  '❤️','🔥','✨','🎉','👍','👏','🙏','💯',
];

// ─────────────────────────────────────────────
// Message Screen
// ─────────────────────────────────────────────
export default function MessageScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { user, token } = useAuth();
  const { theme: THEME } = useTheme();
  const msgStyles = useStyles(THEME);

  const currentUserId = user?._id?.toString() || null;

  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [showEmoji, setShowEmoji]   = useState(false);
  const [actionMsg, setActionMsg]   = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [typingUser, setTypingUser] = useState(null);

  const flatRef          = useRef(null);
  const inputRef         = useRef(null);
  const socketRef        = useRef(null);
  const recordingRef     = useRef(null);
  const recordingTimerRef = useRef(null);
  const typingTimerRef   = useRef(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  // ── Load messages from API ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await messageApi.getMessages(conversation.id);
        const msgs = (res.data.messages || []).map(normalizeMsg);
        setMessages(msgs);
      } catch (err) {
        console.error('Load messages error:', err);
      }
    })();
  }, [conversation.id]);

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

  // ── Typing indicator ───────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { conversationId: conversation.id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stop-typing', { conversationId: conversation.id });
    }, 2000);
  }, [conversation.id]);

  // ── Send text ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp_${Date.now()}`;
    const now    = new Date().toISOString();
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
      const res    = await messageApi.sendText(conversation.id, trimmed);
      const real   = normalizeMsg(res.data.data);
      const realId = real._id?.toString();
      // Remove any socket-delivered copy, then replace temp → prevent duplicate keys
      setMessages(prev => {
        const cleaned = prev.filter(m => m._id?.toString() !== realId);
        return cleaned.map(m => m._id === tempId ? real : m);
      });
    } catch (err) {
      console.error('sendText error:', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  // ── Voice recording ───────────────────────────────────────────────────
  const startRecording = async () => {
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
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;

      const fd = new FormData();
      fd.append('voice', { uri, name: 'voice.m4a', type: 'audio/mp4' });
      fd.append('duration', String(duration));

      const up  = await messageApi.uploadVoice(fd);
      const res = await messageApi.sendVoice(conversation.id, up.data.voice.fileId);
      const msg = normalizeMsg(res.data.data);
      setMessages(prev => [...prev, msg]);
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
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }
    } catch {}
  };

  // ── Send image ────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const fd = new FormData();
      fd.append('file', { uri: asset.uri, name: asset.fileName || 'image.jpg', type: asset.mimeType || 'image/jpeg' });

      const up  = await messageApi.uploadImage(fd);
      const res = await messageApi.sendImage(conversation.id, up.data.file.fileId);
      const msg = normalizeMsg(res.data.data);
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error('handlePickImage error:', err);
    }
  };

  // ── Send file ─────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;

      const asset = result.assets[0];
      const fd = new FormData();
      fd.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });

      const up  = await messageApi.uploadFile(fd);
      const res = await messageApi.sendFile(conversation.id, up.data.file.fileId);
      const msg = normalizeMsg(res.data.data);
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error('handlePickFile error:', err);
    }
  };

  const insertEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // ── Build display list ────────────────────────────────────────────────
  const displayItems = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const msgDate  = msg.time?.split(' ')[0];
    const prevDate = prev?.time?.split(' ')[0];
    if (i === 0 || (msgDate && prevDate && msgDate !== prevDate && msg.time?.includes(' '))) {
      if (msg.time?.includes(' ')) {
        displayItems.push({ type: 'date', label: msgDate, key: `date-${i}` });
      }
    }
    const sameGroup = prev && prev.senderId === msg.senderId
      && !msg.time?.includes(' ') && !prev.time?.includes(' ');
    displayItems.push({
      type: 'msg', msg, key: String(msg._id || msg.id || i),
      isMine: msg.senderId === currentUserId,
      showHeader: !sameGroup,
    });
  });

  const isOnline  = conversation.type === 'dm' ? (conversation.online ?? false) : null;
  const statusText = conversation.type === 'dm'
    ? (conversation.online ? 'Đang hoạt động' : 'Ngoại tuyến')
    : `${conversation.memberCount || conversation.members || 0} thành viên`;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* ── Header ── */}
      <View style={msgStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={msgStyles.backBtn}>
          <Text style={msgStyles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={{ marginRight: 10 }}>
          <Avatar
            name={conversation.name}
            avatar={conversation.avatar}
            size={36}
            online={isOnline}
            THEME={THEME}
            styles={msgStyles}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={msgStyles.headerName} numberOfLines={1}>
            {conversation.type === 'group' ? `# ${conversation.name}` : conversation.name}
          </Text>
          <Text style={[msgStyles.headerStatus, { color: conversation.online ? THEME.statusOnline : THEME.textMuted }]}>
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
          <TouchableOpacity style={msgStyles.headerBtn}>
            <Text style={{ fontSize: 18 }}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={displayItems}
          keyExtractor={item => item.key}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
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
                  THEME={THEME}
                  styles={msgStyles}
                />
          }
        />

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

        {/* ── Recording bar ── */}
        {isRecording ? (
          <View style={msgStyles.recordingBar}>
            <View style={msgStyles.recordingDot} />
            <Text style={msgStyles.recordingTimer}>
              {fmtDur(recordingSec)}
            </Text>
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
                <TouchableOpacity style={msgStyles.inputBtn} onPress={startRecording}>
                  <Text style={msgStyles.inputBtnIcon}>🎤</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Long press action sheet ── */}
      <Modal visible={!!actionMsg} transparent animationType="slide">
        <Pressable style={msgStyles.sheetOverlay} onPress={() => setActionMsg(null)}>
          <View style={msgStyles.sheet}>
            <View style={msgStyles.sheetHandle} />

            <View style={msgStyles.reactRow}>
              {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => setActionMsg(null)} style={msgStyles.reactBtn}>
                  <Text style={msgStyles.reactEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { icon: '↩️', label: 'Trả lời' },
              { icon: '📋', label: 'Sao chép tin nhắn' },
              { icon: '📌', label: 'Ghim tin nhắn' },
              ...(actionMsg?.senderId === currentUserId ? [{ icon: '🗑️', label: 'Xóa tin nhắn', danger: true }] : []),
            ].map(a => (
              <TouchableOpacity key={a.label} onPress={() => setActionMsg(null)} style={msgStyles.sheetAction}>
                <Text style={msgStyles.sheetActionIcon}>{a.icon}</Text>
                <Text style={[msgStyles.sheetActionLabel, a.danger && { color: THEME.danger }]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = (THEME) => StyleSheet.create({
  avatarCircle: { justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700' },
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
  backBtn:     { padding: 12 },
  backArrow:   { fontSize: 22, color: THEME.accent, fontWeight: '700' },
  headerName:  { fontSize: 15, fontWeight: '700', color: THEME.textPrimary },
  headerStatus: { fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn:   { padding: 10 },

  // Intro
  introBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: THEME.border, marginBottom: 8 },
  introAvatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  introInitials: { color: '#fff', fontWeight: '800', fontSize: 22 },
  introName:  { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 4 },
  introDesc:  { fontSize: 14, color: THEME.textMuted, lineHeight: 20 },

  // Date divider
  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  dateLine:    { flex: 1, height: 1, backgroundColor: THEME.border },
  dateLabel:   { fontSize: 11, color: THEME.textMuted, fontWeight: '600', paddingHorizontal: 8 },

  // Message
  msgRow:    { paddingHorizontal: 12, paddingVertical: 2, alignItems: 'flex-start' },
  msgContent: { maxWidth: '80%', flex: 1 },
  msgHeader:  { gap: 6, alignItems: 'baseline', marginBottom: 3 },
  senderName: { fontSize: 13, fontWeight: '700' },
  msgTime:    { fontSize: 10, color: THEME.textMuted },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 2, elevation: 1,
  },
  bubbleText:    { fontSize: 15, lineHeight: 22 },
  imgAttachment: { width: 220, height: 160, borderRadius: 8 },
  fileRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Emoji picker
  emojiPicker: {
    backgroundColor: THEME.bgSecondary, borderTopWidth: 1, borderTopColor: THEME.border,
    padding: 10,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  emojiBtn:  { width: '11.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
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
  reactBtn:          { padding: 8, borderRadius: 10 },
  reactEmoji:        { fontSize: 30 },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 15,
  },
  sheetActionIcon:  { fontSize: 20 },
  sheetActionLabel: { fontSize: 16, color: THEME.textPrimary, fontWeight: '500' },
});
