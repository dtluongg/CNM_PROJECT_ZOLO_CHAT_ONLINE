import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Keyboard, Alert, StatusBar, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { usePresence, formatLastSeen } from '../../../context/PresenceContext';
import { useCall } from '../../call/CallContext';

// ── Components ─────────────────────────────────────────────────────────────
import Avatar from '../components/Avatar';
import DateDivider from '../components/DateDivider';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import RecordingBar from '../components/RecordingBar';
import EmojiPicker from '../components/EmojiPicker';
import ActionSheet from '../components/ActionSheet';
import InfoPanel from '../components/InfoPanel';
import PinLimitModal from '../components/PinLimitModal';
import ForwardModal from '../components/ForwardModal';
import ReadByModal from '../components/ReadByModal';
import ImagePreviewModal from '../components/ImagePreviewModal';
import SystemMessageBubble from '../components/SystemMessageBubble';
import UnreadDivider from '../components/UnreadDivider';
import AiSummaryCard from '../components/AiSummaryCard';
import PinnedBar from '../components/PinnedBar';
import CreatePollModal from '../components/CreatePollModal';
import CreateReminderModal from '../components/CreateReminderModal';
// ── Hooks ──────────────────────────────────────────────────────────────────
import useMessages from '../hooks/useMessages';
import useSocket from '../hooks/useSocket';
import useRecording from '../hooks/useRecording';
import useFileHandler from '../hooks/useFileHandler';

// ── API ────────────────────────────────────────────────────────────────────
import messageApi from '../api/messageApi';
import conversationApi from '../api/conversationApi';
import friendApi from '../../friends/api/friendApi';

// ── Styles ─────────────────────────────────────────────────────────────────
import useStyles from '../styles/messageStyles';

// Định dạng thời gian ISO → "HH:mm"
const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export default function MessageScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { user, token } = useAuth();
  const { theme: THEME } = useTheme();
  const { isUserOnline, getLastSeen } = usePresence();
  const { initiateCall } = useCall();
  const styles = useStyles(THEME);
  const currentUserId = user?._id?.toString() || null;

  // ── State UI ────────────────────────────────────────────────────────────
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [typingUser, setTypingUser] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);
  const [reactionTypes, setReactionTypes] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState(conversation.pinnedMessages || []);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    setPinnedMessages(conversation.pinnedMessages || []);
  }, [conversation.id]);

  // State các modal
  const [actionMsg, setActionMsg] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [currentReadByList, setCurrentReadByList] = useState([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState(null);

  // State info panel (modal 3 chấm)
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showPinLimitModal, setShowPinLimitModal] = useState(false);
  const [pendingPinMsgId, setPendingPinMsgId] = useState(null);
  const [infoTab, setInfoTab] = useState('info');
  const [mediaData, setMediaData] = useState({ images: [], files: [] });
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockStatus, setBlockStatus] = useState(null);

  const flatRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  // ── Snapshot unreadCount + lastReadMessageId tại thời điểm mở màn chat ───────
  // Capture lúc mount (trước markAsRead chạy) để dùng cho AI query
  const aiSnapshotRef = useRef({
    unreadCount: conversation.unread || 0,
    lastReadId: conversation.myMembership?.lastReadMessageId || null,
    aiSummary: conversation.aiSummary || null,
  });

  // ── Hooks quản lý tin nhắn ──────────────────────────────────────────────
  const msgHook = useMessages(conversation.id, currentUserId);

  // ── Hook ghi âm ─────────────────────────────────────────────────────────
  const { isRecording, recordingSec, startRecording, stopRecording, cancelRecording } =
    useRecording(conversation.id, (msg) => {
      msgHook.addMessage(msg);
      setReplyingMessage(null);
      setEditingMessage(null);
    });

  // ── Hook xử lý file ─────────────────────────────────────────────────────
  const { pickAndSendImage, pickAndSendFile, openFile } = useFileHandler(
    conversation.id,
    (msg) => {
      msgHook.addMessage(msg);
      setReplyingMessage(null);
      setEditingMessage(null);
    }
  );

  // ── Hook socket ─────────────────────────────────────────────────────────
  const socketRef = useSocket(token, conversation.id, currentUserId, {
    onNewMessage: (message) => msgHook.addMessage(message),
    onTyping: ({ userId, displayName }) => setTypingUser({ userId, displayName }),
    onStopTyping: () => setTypingUser(null),
    onReaction: (data) => msgHook.updateReaction({ ...data, currentUserId }),
    onRevoked: (messageId) => msgHook.revokeMessage(messageId),
    onEdited: (message) => msgHook.editMessage(message),
    onRead: (data) => msgHook.markRead(data),
    onDeletedForMe: (messageId) => msgHook.deleteMessage(messageId),
    onPinnedMessagesChange: (newPins) => setPinnedMessages(newPins),
    onUpdatePoll: (updatedMsg) => msgHook.updatePoll(updatedMsg),
    onReminderAlert: ({ reminderId }) => {
      msgHook.triggerReminder(reminderId);
    },
  });

  // ── Setup khi mount ─────────────────────────────────────────────────────
  useEffect(() => {
    // Ẩn header mặc định của navigator
    navigation.setOptions({ headerShown: false });

    // Tải danh sách reaction từ server
    messageApi
      .getReactionTypes()
      .then((res) => setReactionTypes(res.data.data))
      .catch((err) => console.error('getReactionTypes error:', err));
  }, []);

  // ── Keyboard listener (tránh bàn phím che input trên Android) ───────────
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

  // ── Auto scroll xuống cuối khi có tin mới ───────────────────────────────
  const scrollToBottom = useCallback(() => {
    if (flatRef.current && msgHook.messages.length > 0) {
      flatRef.current.scrollToEnd({ animated: true });
    }
  }, [msgHook.messages.length]);

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [msgHook.messages]);

  // Scroll khi bàn phím hiện để tin cuối không bị che
  useEffect(() => {
    if (keyboardHeight > 0) {
      const t = setTimeout(scrollToBottom, 80);
      return () => clearTimeout(t);
    }
  }, [keyboardHeight]);

  // ── Auto đánh dấu đọc tin nhắn cuối ────────────────────────────────────
  useEffect(() => {
    if (msgHook.messages.length === 0) return;
    const lastMsg = msgHook.messages[msgHook.messages.length - 1];
    if (lastMsg.senderId !== currentUserId) {
      const mId = lastMsg._id?.toString();
      if (mId && !mId.startsWith('temp_')) {
        messageApi.markAsRead(conversation.id, mId).catch(() => { });
      }
    }
  }, [msgHook.messages.length, conversation.id]);

  // ── Tải media/file khi mở tab tương ứng trong info panel ───────────────
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

  // ── Lấy trạng thái chặn ─────────────────────────────────────────────────
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

  useEffect(() => {
    fetchBlockStatus();
  }, [fetchBlockStatus]);

  // ── Chặn / bỏ chặn người dùng ──────────────────────────────────────────
  const handleBlockUser = async () => {
    if (!conversation.otherUserId) return;
    setBlockBusy(true);
    try {
      await friendApi.blockFriend(conversation.otherUserId);
      setBlockConfirm(false);
      setShowInfoPanel(false);
      await fetchBlockStatus();
      const isNowBlocked = !blockStatus?.iBlocked;
      Alert.alert(
        isNowBlocked ? 'Đã chặn' : 'Đã bỏ chặn',
        isNowBlocked
          ? `Bạn đã chặn ${conversation.name}.`
          : `Đã bỏ chặn ${conversation.name}.`
      );
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thực hiện.');
    } finally {
      setBlockBusy(false);
    }
  };

  // ── Typing indicator ────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { conversationId: conversation.id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stop-typing', { conversationId: conversation.id });
    }, 2000);
  }, [conversation.id]);

  // ── Gửi / chỉnh sửa tin nhắn văn bản ───────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      // ── Chế độ chỉnh sửa ──────────────────────────────────────────
      const mId = editingMessage._id?.toString();
      msgHook.applyEdit(mId, trimmed); // optimistic update
      setEditingMessage(null);
      setText('');
      Keyboard.dismiss();
      try {
        await messageApi.editMessage(mId, trimmed);
      } catch (err) {
        console.error('editMessage error:', err);
        Alert.alert('Lỗi', 'Không thể chỉnh sửa tin nhắn');
      }
      return;
    }

    // ── Chế độ gửi mới ────────────────────────────────────────────
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const tempMsg = {
      _id: tempId,
      senderId: currentUserId,
      senderName: user?.displayName || 'Tôi',
      avatar: user?.avatar || null,
      type: 'text',
      content: trimmed,
      payload: {},
      time: fmtTime(now),
      createdAt: now,
      replyToMessageId: replyingMessage || null,
    };

    msgHook.addTempMessage(tempMsg);
    const replyId = replyingMessage?._id || replyingMessage?.id;
    setText('');
    setShowEmoji(false);
    setReplyingMessage(null);

    // Dừng typing indicator
    if (socketRef.current) {
      clearTimeout(typingTimerRef.current);
      socketRef.current.emit('chat:stop-typing', { conversationId: conversation.id });
    }

    try {
      const res = await messageApi.sendText(conversation.id, trimmed, replyId);
      msgHook.replaceTemp(tempId, res.data.data);
    } catch (err) {
      console.error('sendText error:', err);
      if (err?.response?.status === 403) {
        // Tin nhắn bị chặn — giữ lại và đánh dấu
        msgHook.markBlocked(tempId);
        await fetchBlockStatus();
      } else {
        msgHook.removeTempMessage(tempId);
      }
    }
  };

  // ── Bắt đầu trả lời tin nhắn ──────────────────────────────────────────
  const handleReply = (msg) => {
    setReplyingMessage(msg);
    setEditingMessage(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Bình chọn (Poll) ──────────────────────────────────────────────────
  const handleCreatePoll = async ({ topic, options, multipleChoice }) => {
    try {
      await messageApi.createPoll(conversation.id, { topic, options, multipleChoice });
    } catch (err) {
      console.error('handleCreatePoll error:', err);
      Alert.alert('Lỗi', 'Không thể tạo bình chọn');
    }
  };

  const handlePollVote = async (messageId, voteData) => {
    try {
      await messageApi.votePoll(messageId, voteData);
    } catch (err) {
      console.error('handlePollVote error:', err);
    }
  };

  // ── Nhắc hẹn (Reminder) ──────────────────────────────────────────────
  const handleCreateReminder = async ({ content, reminderTime }) => {
    const tempId = `temp_rem_${Date.now()}`;
    const now = new Date().toISOString();
    const tempMsg = {
      _id: tempId,
      senderId: currentUserId,
      senderName: user?.displayName || 'Tôi',
      avatar: user?.avatar || null,
      type: 'reminder',
      content: content.trim(),
      payload: { reminderTime },
      time: fmtTime(now),
      createdAt: now,
    };

    msgHook.addTempMessage(tempMsg);
    setShowReminderModal(false);

    try {
      const res = await messageApi.createReminder(conversation.id, { content, reminderTime });
      msgHook.replaceTemp(tempId, res.data.data);
    } catch (err) {
      console.error('handleCreateReminder error:', err);
      msgHook.removeTempMessage(tempId);
      Alert.alert('Lỗi', 'Không thể tạo nhắc hẹn');
    }
  };

  // ── React emoji ─────────────────────────────────────────────────────────
  const handleReact = async (msg, emoji) => {
    try {
      const mId = msg._id || msg.id;
      if (!mId) return;
      await messageApi.toggleReaction(mId.toString(), emoji);
    } catch (err) {
      console.error('handleReact error:', err);
    }
  };

  // ── Thu hồi tin nhắn ────────────────────────────────────────────────────
  const handleRevoke = async (msg) => {
    try {
      const mId = msg._id || msg.id;
      if (!mId) return;
      await messageApi.revokeMessage(mId.toString());
      msgHook.revokeMessage(mId); // optimistic update
    } catch (err) {
      console.error('handleRevoke error:', err);
      Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
    }
  };

  // ── Xoá tin nhắn phía tôi ───────────────────────────────────────────────
  const handleDeleteForMe = async (msg) => {
    try {
      const mId = msg._id || msg.id;
      if (!mId) return;
      msgHook.deleteMessage(mId); // optimistic update
      await messageApi.deleteForMe(mId.toString());
    } catch (err) {
      console.error('handleDeleteForMe error:', err);
      Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
    }
  };

  const handlePin = async (msg) => {
    try {
      const mId = msg._id || msg.id;
      await messageApi.pinMessage(conversation.id, mId.toString());
    } catch (err) {
      if (err.response?.status === 400 && conversation.pinnedMessages?.length >= 3) {
        setPendingPinMsgId(msg._id || msg.id);
        setShowPinLimitModal(true);
      } else {
        Alert.alert('Lỗi', err.response?.data?.message || 'Không thể ghim tin nhắn');
      }
    }
  };

  const handleConfirmReplacePin = async (selectedIndex) => {
    try {
      const pinToReplace = conversation.pinnedMessages[selectedIndex];
      const oldMsgId = pinToReplace.messageId._id || pinToReplace.messageId.id;
      
      // Bỏ ghim cái cũ
      await messageApi.unpinMessage(conversation.id, oldMsgId.toString());
      // Ghim cái mới
      await messageApi.pinMessage(conversation.id, pendingPinMsgId.toString());
      
      setShowPinLimitModal(false);
      setPendingPinMsgId(null);
    } catch (err) {
      console.error('handleConfirmReplacePin error:', err);
      Alert.alert('Lỗi', 'Không thể thay thế tin nhắn ghim');
    }
  };

  const handleUnpin = (mId) => {
    Alert.alert(
      'Bỏ ghim',
      'Bạn có chắc muốn bỏ ghim nội dung này không?',
      [
        { text: 'Không', style: 'cancel' },
        { 
          text: 'Bỏ ghim', 
          style: 'destructive',
          onPress: async () => {
            try {
              await messageApi.unpinMessage(conversation.id, mId);
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể bỏ ghim tin nhắn');
            }
          }
        },
      ]
    );
  };

  const handleJumpToMessage = (targetId) => {
    if (!targetId) return;
    const index = msgHook.messages.findIndex(m => (m._id || m.id)?.toString() === targetId.toString());
    if (index !== -1) {
      flatRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    } else {
      Alert.alert('Thông báo', 'Tin nhắn không nằm trong lịch sử hiển thị hiện tại');
    }
  };

  // ── Bắt đầu chỉnh sửa tin nhắn ─────────────────────────────────────────
  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setText(msg.content || '');
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Xem danh sách người đã đọc ──────────────────────────────────────────
  const handleShowReadBy = (readBy) => {
    setCurrentReadByList(readBy);
    setShowReadByModal(true);
  };

  // ── Chèn emoji vào ô nhập ───────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // ── Xây dựng danh sách hiển thị (thêm divider ngày, loại bỏ trùng lặp) ─
  const displayItems = [];
  const seenIds = new Set();

  msgHook.messages.forEach((msg, i) => {
    const msgKey = msg._id?.toString() || msg.id?.toString();
    if (msgKey && seenIds.has(msgKey)) return;
    if (msgKey) seenIds.add(msgKey);

    const prev = msgHook.messages[i - 1];
    const msgDate = msg.time?.split(' ')[0];
    const prevDate = prev?.time?.split(' ')[0];

    // Thêm divider ngày khi chuyển sang ngày mới
    if (i === 0 || (msgDate && prevDate && msgDate !== prevDate && msg.time?.includes(' '))) {
      if (msg.time?.includes(' ')) {
        displayItems.push({ type: 'date', label: msgDate, key: `date-${msgKey || i}` });
      }
    }

    // Nhóm tin nhắn liên tiếp của cùng người gửi — ẩn header
    const sameGroup =
      prev &&
      prev.senderId === msg.senderId &&
      !msg.time?.includes(' ') &&
      !prev.time?.includes(' ');

    displayItems.push({
      type: msg.type === 'system' ? 'system' : 'msg',
      msg,
      key: `msg-${msgKey || i}`,
      isMine: (msg.senderId?._id || msg.senderId) === currentUserId,
      showHeader: msg.type === 'system' ? false : !sameGroup,
    });
  });

  // ── Chèn UnreadDivider + AiSummaryCard nếu có tin chưa đọc ─────────────
  // Chỉ hiện khi có lastReadId VÀ tìm được vị trí chính xác trong danh sách
  const { unreadCount, lastReadId, aiSummary } = aiSnapshotRef.current;
  if (unreadCount > 0 && lastReadId) {
    const insertIdx = displayItems.findIndex(
      (item) => item.type === 'msg' &&
        (item.msg?._id?.toString() || item.msg?.id?.toString()) === lastReadId.toString()
    );
    if (insertIdx !== -1) {
      // Chèn divider ngay sau tin đã đọc cuối
      displayItems.splice(insertIdx + 1, 0, {
        type: 'unread-divider',
        key: `unread-divider-${conversation.id}`,
      });
      // AI card luôn ở cuối
      displayItems.push({
        type: 'ai-summary',
        key: `ai-summary-${conversation.id}`,
        conversationId: conversation.id,
        snapshotLastReadId: lastReadId,
        initialSummary: aiSummary,
      });
    }
  }

  // ── Trạng thái online & text trạng thái trên header ────────────────────
  const isOnline =
    conversation.type === 'dm' && conversation.otherUserId
      ? isUserOnline(conversation.otherUserId)
      : null;

  const statusText =
    conversation.type === 'dm'
      ? isOnline
        ? 'Đang hoạt động'
        : (() => {
          const ls = conversation.otherUserId
            ? getLastSeen(conversation.otherUserId)
            : null;
          return ls ? `Hoạt động ${formatLastSeen(ls)}` : 'Ngoại tuyến';
        })()
      : `${conversation.memberCount || conversation.members || 0} thành viên`;

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={THEME.accent} />
        </TouchableOpacity>

        {/* Avatar người dùng / nhóm */}
        <TouchableOpacity
          style={{ marginRight: 10 }}
          onPress={() =>
            conversation.otherUserId &&
            navigation.push('UserProfile', { userId: conversation.otherUserId })
          }
          activeOpacity={conversation.otherUserId ? 0.7 : 1}
        >
          <Avatar
            name={conversation.name}
            avatar={conversation.avatar}
            size={36}
            online={isOnline}
            THEME={THEME}
            styles={styles}
          />
        </TouchableOpacity>

        {/* Tên + trạng thái */}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {conversation.type === 'group' ? `# ${conversation.name}` : conversation.name}
          </Text>
          <Text style={[styles.headerStatus, { color: isOnline ? THEME.statusOnline : THEME.textMuted }]}>
            {statusText}
          </Text>
        </View>

        {/* Các nút action trên header */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (conversation.type !== 'dm' || !conversation.otherUserId) return;
              initiateCall({ _id: conversation.otherUserId, displayName: conversation.name, avatar: conversation.avatar || null }, 'audio');
            }}
          >
            <Feather name="phone" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (conversation.type !== 'dm' || !conversation.otherUserId) return;
              initiateCall({ _id: conversation.otherUserId, displayName: conversation.name, avatar: conversation.avatar || null }, 'video');
            }}
          >
            <Feather name="video" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => { setInfoTab('info'); setShowInfoPanel(true); }}
          >
            <Feather name="more-horizontal" size={22} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <PinnedBar 
        pinnedMessages={pinnedMessages}
        onJump={handleJumpToMessage}
        onUnpin={handleUnpin}
      />

      {/* ── Body: danh sách tin nhắn + thanh input ────────────────────────── */}
      <View style={{ flex: 1 }}>
        <PinLimitModal 
        isOpen={showPinLimitModal}
        onClose={() => { setShowPinLimitModal(false); setPendingPinMsgId(null); }}
        pinnedMessages={conversation.pinnedMessages || []}
        onConfirm={handleConfirmReplacePin}
        THEME={THEME}
      />

      <FlatList
          ref={flatRef}
          data={displayItems}
          keyExtractor={(item) => item.key}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}

          // Phần giới thiệu đầu cuộc trò chuyện
          ListHeaderComponent={() => (
            <View style={styles.introBox}>
              <View style={{ marginBottom: 12 }}>
                <Avatar
                  name={conversation.name}
                  avatar={conversation.avatar}
                  size={72}
                  online={isOnline}
                  THEME={THEME}
                  styles={styles}
                />
              </View>
              <Text style={styles.introName}>
                {conversation.type === 'group' ? `# ${conversation.name}` : conversation.name}
              </Text>
              <Text
                style={[
                  styles.introStatus,
                  {
                    color:
                      conversation.type === 'dm'
                        ? isOnline
                          ? THEME.statusOnline
                          : THEME.textMuted
                        : THEME.textMuted,
                  },
                ]}
              >
                {conversation.type === 'dm'
                  ? isOnline
                    ? 'Đang hoạt động'
                    : 'Ngoại tuyến'
                  : `${conversation.memberCount || conversation.members || 0} thành viên`}
              </Text>
              <Text style={styles.introDesc}>
                {conversation.type === 'dm'
                  ? `Đây là bắt đầu trò chuyện với ${conversation.name}.`
                  : `Chào mừng đến kênh #${conversation.name}!`}
              </Text>
            </View>
          )}

          // Typing indicator phía dưới danh sách
          ListFooterComponent={() =>
            typingUser ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                <Text style={{ fontSize: 12, color: THEME.textMuted, fontStyle: 'italic' }}>
                  {typingUser.displayName} đang nhập...
                </Text>
              </View>
            ) : null
          }

          // Render từng item (divider ngày hoặc bong bóng tin nhắn)
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return <DateDivider label={item.label} styles={styles} />;
            }
            if (item.type === 'system') {
              return (
                <SystemMessageBubble
                  msg={item.msg}
                  currentUserId={currentUserId}
                  THEME={THEME}
                />
              );
            }
            if (item.type === 'unread-divider') {
              return <UnreadDivider key={item.key} THEME={THEME} />;
            }
            if (item.type === 'ai-summary') {
              return (
                <AiSummaryCard
                  key={item.key}
                  conversationId={item.conversationId}
                  snapshotLastReadId={item.snapshotLastReadId}
                  initialSummary={item.initialSummary}
                  THEME={THEME}
                />
              );
            }
            return (
              <MessageBubble
                msg={item.msg}
                isMine={item.isMine}
                showHeader={item.showHeader}
                onLongPress={setActionMsg}
                onShowReadBy={handleShowReadBy}
                onAvatarPress={(senderId) =>
                  senderId && navigation.push('UserProfile', { userId: senderId })
                }
                currentUserId={currentUserId}
                conversation={conversation}
                THEME={THEME}
                styles={styles}
                onImagePress={(url) => setPreviewImage(url)}
                onFilePress={(url, fileName) => openFile(url, fileName)}
                onPin={handlePin}
                onUnpin={handleUnpin}
                isPinned={pinnedMessages.some(p => (p.messageId?._id || p.messageId?.id || p.messageId)?.toString() === (item.msg?._id || item.msg?.id)?.toString())}
                onVote={(optId) => handlePollVote(item.msg?._id || item.msg?.id, optId)}
              />
            );
          }}
        />

        {/* ── Banner cảnh báo bị chặn ── */}
        {conversation.type === 'dm' && blockStatus?.iBlocked && (
          <View
            style={{
              backgroundColor: THEME.bgSecondary,
              borderTopWidth: 1,
              borderTopColor: THEME.border,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Text style={{ color: THEME.textMuted, fontSize: 13 }}>Bạn đã chặn người này.</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await friendApi.blockFriend(conversation.otherUserId);
                  await fetchBlockStatus();
                } catch {
                  Alert.alert('Lỗi', 'Không thể bỏ chặn');
                }
              }}
              style={{
                backgroundColor: THEME.accent,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Bỏ chặn</Text>
            </TouchableOpacity>
          </View>
        )}

        {conversation.type === 'dm' && blockStatus?.theyBlockedMe && (
          <View
            style={{
              backgroundColor: '#fef3c7',
              borderTopWidth: 1,
              borderTopColor: '#fcd34d',
              padding: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#92400e', fontSize: 12 }}>
              Bạn đã bị người này chặn. Tin nhắn sẽ không được nhận.
            </Text>
          </View>
        )}

        {/* ── Wrapper emoji + input, đẩy lên theo chiều cao bàn phím ── */}
        <View style={{ paddingBottom: keyboardHeight }}>

          {/* Thanh chỉnh sửa tin nhắn */}
          {editingMessage && (
            <View style={styles.editBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>Đang chỉnh sửa tin nhắn</Text>
                <Text style={styles.editContent} numberOfLines={1}>
                  {editingMessage.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setEditingMessage(null); setText(''); }}
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 18, color: THEME.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bộ chọn emoji */}
          {showEmoji && <EmojiPicker onSelect={insertEmoji} styles={styles} />}

          {/* Thanh ghi âm hoặc thanh nhập liệu */}
          {!(conversation.type === 'dm' && blockStatus?.iBlocked) && (
            isRecording ? (
              <RecordingBar
                recordingSec={recordingSec}
                onCancel={cancelRecording}
                onStop={() => stopRecording(replyingMessage?._id || replyingMessage?.id)}
                THEME={THEME}
                styles={styles}
              />
            ) : (
              <InputBar
                text={text}
                isGroup={conversation.type === 'group'}
                onChangeText={(v) => {
                  setText(v);
                  if (v.trim()) emitTyping();
                }}
                onSend={handleSend}
                onPickFile={() => pickAndSendFile(replyingMessage?._id || replyingMessage?.id)}
                onPickImage={() => pickAndSendImage(replyingMessage?._id || replyingMessage?.id)}
                onPickReminder={() => setShowReminderModal(true)}
                onStartRecord={startRecording}
                onToggleEmoji={() => setShowEmoji(!showEmoji)}
                onPickPoll={() => setShowPollModal(true)}
                inputRef={inputRef}
                placeholder={`Nhắn tin ${conversation.type === 'group' ? '#' : ''}${conversation.name}...`}
                THEME={THEME}
                styles={styles}
                replyingMessage={replyingMessage}
                onCancelReply={() => setReplyingMessage(null)}
              />
            )
          )}
          <CreatePollModal 
            visible={showPollModal}
            onClose={() => setShowPollModal(false)}
            onCreate={handleCreatePoll}
            THEME={THEME}
          />
          <CreateReminderModal
            visible={showReminderModal}
            onClose={() => setShowReminderModal(false)}
            onCreate={handleCreateReminder}
            isGroup={conversation.type === 'group'}
            THEME={THEME}
          />
        </View>
      </View>

      {/* ── Các modal ─────────────────────────────────────────────────────── */}

      {/* Panel thông tin cuộc hội thoại */}
      <InfoPanel
        visible={showInfoPanel}
        onClose={() => setShowInfoPanel(false)}
        infoTab={infoTab}
        onTabChange={setInfoTab}
        conversation={conversation}
        isOnline={isOnline}
        mediaData={mediaData}
        loadingMedia={loadingMedia}
        blockStatus={blockStatus}
        blockConfirm={blockConfirm}
        onBlockConfirm={setBlockConfirm}
        blockBusy={blockBusy}
        onBlockUser={handleBlockUser}
        onImagePress={(url) => { setShowInfoPanel(false); setTimeout(() => setPreviewImage(url), 300); }}
        onFilePress={openFile}
        onViewProfile={() => { setShowInfoPanel(false); navigation.push('UserProfile', { userId: conversation.otherUserId }); }}
        THEME={THEME}
        styles={styles}
      />

      {/* Menu action khi giữ tin nhắn */}
      <ActionSheet
        msg={actionMsg}
        visible={!!actionMsg}
        onClose={() => setActionMsg(null)}
        currentUserId={currentUserId}
        reactionTypes={reactionTypes}
        onReact={handleReact}
        onRevoke={handleRevoke}
        onEdit={handleStartEdit}
        onReply={handleReply}
        onDelete={handleDeleteForMe}
        onPin={handlePin}
        onUnpin={handleUnpin}
        isPinned={actionMsg ? pinnedMessages.some(p => (p.messageId?._id || p.messageId?.id || p.messageId)?.toString() === (actionMsg?._id || actionMsg?.id)?.toString()) : false}
        onForward={(msg) => { setForwardingMsg(msg); setShowForwardModal(true); }}
        THEME={THEME}
        styles={styles}
      />

      {/* Danh sách người đã đọc */}
      <ReadByModal
        visible={showReadByModal}
        onClose={() => setShowReadByModal(false)}
        readByList={currentReadByList}
        THEME={THEME}
        styles={styles}
      />

      {/* Chuyển tiếp tin nhắn */}
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        msg={forwardingMsg}
        THEME={THEME}
        styles={styles}
      />

      {/* Xem ảnh toàn màn hình */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
        onDownload={openFile}
        THEME={THEME}
      />
    </View>
  );
}