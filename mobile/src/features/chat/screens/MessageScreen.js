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
const SENDER_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245'];
const getSenderColor = (name, THEME) =>
  name ? SENDER_COLORS[name.charCodeAt(0) % SENDER_COLORS.length] : THEME.accent;

const MessageBubble = ({ msg, isMine, showHeader, onLongPress, onAvatarPress, THEME, styles }) => {
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
  const { isUserOnline, getLastSeen } = usePresence();
  const msgStyles = useStyles(THEME);

  const currentUserId = user?._id?.toString() || null;

  const [messages, setMessages]         = useState([]);
  const [text, setText]                 = useState('');
  const [showEmoji, setShowEmoji]       = useState(false);
  const [actionMsg, setActionMsg]       = useState(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [typingUser, setTypingUser]     = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Info panel state
  const [showInfoPanel, setShowInfoPanel]   = useState(false);
  const [infoTab, setInfoTab]               = useState('info'); // 'info' | 'media' | 'files'
  const [mediaData, setMediaData]           = useState({ images: [], files: [] });
  const [loadingMedia, setLoadingMedia]     = useState(false);
  const [blockConfirm, setBlockConfirm]     = useState(false);
  const [blockBusy, setBlockBusy]           = useState(false);

  const flatRef           = useRef(null);
  const inputRef          = useRef(null);
  const socketRef         = useRef(null);
  const recordingRef      = useRef(null);
  const recordingTimerRef = useRef(null);
  const typingTimerRef    = useRef(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
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

  // ── Load messages from API (khi mount hoặc conversation thay đổi) ────────
  const loadMessages = useCallback(async () => {
    try {
      const res = await messageApi.getMessages(conversation.id);
      const raw  = (res.data.messages || []).map(normalizeMsg);
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

  // ── Block user ─────────────────────────────────────────────────────────
  const handleBlockUser = async () => {
    if (!conversation.otherUserId) return;
    setBlockBusy(true);
    try {
      await friendApi.blockFriend(conversation.otherUserId);
      setBlockConfirm(false);
      setShowInfoPanel(false);
      Alert.alert('Đã chặn', `Bạn đã chặn ${conversation.name}.`);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể chặn người dùng.');
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
      setMessages(prev => {
        const cleaned = prev.filter(m => m._id?.toString() !== realId);
        return cleaned.map(m => m._id === tempId ? real : m);
      });
    } catch (err) {
      console.error('sendText error:', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
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

      const up  = await messageApi.uploadVoice(fd);
      const res = await messageApi.sendVoice(conversation.id, up.data.voice.fileId);
      const msg = normalizeMsg(res.data.data);
      const id  = msg._id?.toString();
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
    } catch {}
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

      const up  = await messageApi.uploadImage(fd);
      const res = await messageApi.sendImage(conversation.id, up.data.file.fileId);
      const msg = normalizeMsg(res.data.data);
      const id  = msg._id?.toString();
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

      const up  = await messageApi.uploadFile(fd);
      const res = await messageApi.sendFile(conversation.id, up.data.file.fileId);
      const msg = normalizeMsg(res.data.data);
      const id  = msg._id?.toString();
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

  // ── Build display list ─────────────────────────────────────────────────
  const displayItems = [];
  const seenIds = new Set();
  messages.forEach((msg, i) => {
    const msgKey = msg._id?.toString() || msg.id?.toString();
    if (msgKey && seenIds.has(msgKey)) return;
    if (msgKey) seenIds.add(msgKey);

    const prev = messages[i - 1];
    const msgDate  = msg.time?.split(' ')[0];
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
                  onAvatarPress={(senderId) => senderId && navigation.push('UserProfile', { userId: senderId })}
                  THEME={THEME}
                  styles={msgStyles}
                />
          }
        />

        {/* ── Wrapper bọc emoji + input/recording, đẩy lên theo keyboardHeight ── */}
        <View style={{ paddingBottom: keyboardHeight }}>

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
          )}
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
                      {!blockConfirm ? (
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
                            Người này sẽ không thể nhắn tin cho bạn nữa.
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