import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Search, Users, Pin, MoreHorizontal, ArrowLeft, Phone, Video, MessageCircle, CornerUpLeft, CornerUpRight, Paperclip, ThumbsUp, Reply, Copy, Trash2, Hash, Lock, Volume2 } from 'lucide-react';
import GroupCallButton from '../../call/components/GroupCallButton';
import ReportButton from '../../admin/components/ReportButton';
import MessageInput from './MessageInput';
import messageApi from '../api/messageApi';
import conversationApi from '../api/conversationApi';
import { X, Check } from 'lucide-react'; // Dùng cho modal
import { usePresence, formatLastSeen } from '../../../context/PresenceContext';
// ── UI Components ──────────────────────────────────────
import Avatar from './chatArea/ui/Avatar';
import DateDivider from './chatArea/ui/DateDivider';
import TypingIndicator from './chatArea/ui/TypingIndicator';
import SystemMessage from './chatArea/ui/SystemMessage';
import PinnedBar from './chatArea/ui/PinnedBar';
// ── Message Bubble ─────────────────────────────────────
import MessageBubble from './chatArea/modals/MessageBubble';
import PinLimitModal from './chatArea/modals/PinLimitModal';
// ── AI components ──────────────────────────────────────────────────────
import UnreadDivider from './chatArea/ui/UnreadDivider';
import AiPanel from './chatArea/AiPanel';
import AiLogo from './chatArea/ui/AiLogo';
import SearchPanel from './chatArea/SearchPanel';

// ── Modals ─────────────────────────────────────────────
import ForwardModal from './chatArea/modals/ForwardModal';
import { ReactionListModal, ReadListModal } from './chatArea/modals/ReactionModal';
import UnpinConfirmModal from './chatArea/modals/UnpinConfirmModal';
import CreateReminderModal from './chatArea/modals/CreateReminderModal';

// ── Custom Hooks ───────────────────────────────────────
import useChatSocket from './chatArea/hooks/useChatSocket';
import useScrollBehavior from './chatArea/hooks/useScrollBehavior';

// ── Voice channel ──────────────────────────────────────
import VoiceChannelView from '../../voice/components/VoiceChannelView';

// ── Utils ──────────────────────────────────────────────
import { getAvatarColor, getInitials } from './chatArea/utils/avatarUtils';
import { useLanguage } from '../../../context/LanguageContext';
import { translateTopicName } from '../../../utils/translationUtils';

// ─────────────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  online: 'Đang hoạt động',
  idle: 'Vắng mặt',
  dnd: 'Không làm phiền',
};
const STATUS_COLOR_MAP = {
  online: '#3ba55c',
  idle: '#faa61a',
  dnd: '#ed4245',
};

// ─────────────────────────────────────────────────────────────────────
export default function ChatArea({
  conversation,
  messages,
  currentUserId,
  currentUser,
  typingUser,
  socket,
  onSendMessage,
  onToggleRight,
  showRight,
  onBack,
  isMobile,
  setMessages,
  onDeleteForMe,
  onViewProfile,
  sendBlockError,
  blockStatus,
  onBlockStatusChanged,
  onPhoneCall,
  onVideoCall,
  onVoiceRoom,
  voiceRoomActive,
  onPollVote,
  activeTopic,
  onTopicSelect,
  myPermissions,
}) {
  const { t } = useLanguage();
  const { isUserOnline, getPresenceStatus, getLastSeen } = usePresence();

  const [openMenuId, setOpenMenuId] = useState(null);
  const [reactionTypes, setReactionTypes] = useState([]);
  const [showReactionList, setShowReactionList] = useState(null);
  const [reactionDetails, setReactionDetails] = useState([]);
  const [showReadList, setShowReadList] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState(conversation?.pinnedMessages || []);
  const [showPinLimitModal, setShowPinLimitModal] = useState(false);
  const [pendingPinMsgId, setPendingPinMsgId] = useState(null);
  const [showUnpinModal, setShowUnpinModal] = useState(false);
  const [messageIdToUnpin, setMessageIdToUnpin] = useState(null);
  const [showChannelSheet, setShowChannelSheet] = useState(false);
  const [sheetTopics, setSheetTopics] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [aiReminderModal, setAiReminderModal] = useState({ open: false, content: '', dateTime: null });
  const [smartReplyText, setSmartReplyText] = useState('');
  // Sync pinned messages khi đổi conversation
  useEffect(() => {
    setPinnedMessages(conversation?.pinnedMessages || []);
    setShowAiPanel(false);
    setShowSearch(false);
  }, [conversation?.id]);
  // ── Snapshot lastReadMessageId tại thời điểm mở conversation ────────
  // Phải capture inline (không dùng useEffect) để lấy giá trị trước khi markAsRead chạy
  const prevConvIdRef = useRef(null);
  const aiSnapshotRef = useRef({ unreadCount: 0, lastReadId: null });
  if (conversation?.id !== prevConvIdRef.current) {
    prevConvIdRef.current = conversation?.id;
    aiSnapshotRef.current = {
      unreadCount: conversation?.unread || 0,
      lastReadId: conversation?.myMembership?.lastReadMessageId || null,
    };
  }
  // ── THÊM USE-EFFECT NÀY ĐỂ TỰ ĐỘNG LẤY THÀNH VIÊN KHI MỞ NHÓM ──
  useEffect(() => {
    if (conversation?.type === 'group' && conversation?.id) {
      // Gọi API lấy danh sách thành viên (Bạn hãy kiểm tra xem hàm trong file conversationApi của bạn tên là gì nhé, thường là getMembers)
      conversationApi.getConversationMembers(conversation.id)
        .then(res => {
          const membersData = Array.isArray(res.data?.data) ? res.data.data : [];
          // Bóc tách lấy thông tin User từ dữ liệu trả về
          const formattedMembers = membersData.map(m => m.userId || m.user || m);
          setGroupMembers(formattedMembers);
        })
        .catch(err => console.error("Lỗi lấy thành viên để Tag:", err));
    } else {
      setGroupMembers([]); // Xóa rỗng nếu là chat 1-1
    }
  }, [conversation?.id, conversation?.type]);
  // ── Fetch reaction types khi mount ─────────────────────────
  useEffect(() => {
    messageApi.getReactionTypes()
      .then(res => setReactionTypes(res.data.data))
      .catch(console.error);
  }, []);

  // ── Socket listeners ───────────────────────────────────────
  useChatSocket({
    socket,
    conversation,
    currentUserId,
    setMessages,
    onPinnedMessagesChange: (newPins) => setPinnedMessages(newPins)
  });

  // ── Helper to translate hardcoded backend strings ────────────────────────
  const translateTopicContent = useCallback((val) => translateTopicName(val, t), [t]);

  // ── Auto scroll (uses visibleMessages so topic switch scrolls to bottom) ──
  const { bottomRef } = useScrollBehavior({ messages: messages, currentUserId });

  // ── Handlers ───────────────────────────────────────────────
  const handleMarkAsRead = async (msg) => {
    try {
      const mId = msg._id || msg.id;
      const cId = conversation?.id || conversation?._id;
      if (mId && cId) await messageApi.markAsRead(cId.toString(), mId.toString());
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleJumpToMessage = (targetId) => {
    if (!targetId) return;
    const element = document.getElementById(`msg-${targetId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(targetId);
      setTimeout(() => setHighlightedId(null), 2000);
    } else {
      console.warn('Message not found in DOM');
    }
  };

  const handleReact = async (msg, emoji) => {
    try {
      await messageApi.toggleReaction(msg._id || msg.id, emoji);
    } catch (err) {
      console.error('React error:', err);
    }
  };

  const handleShowReactionDetails = async (msg) => {
    try {
      setShowReactionList(msg._id || msg.id);
      const res = await messageApi.getMessageReactions(msg._id || msg.id);
      setReactionDetails(res.data.data);
    } catch (err) {
      console.error('Fetch reaction details error:', err);
    }
  };

  const handleRevoke = async (msg) => {
    try { await messageApi.revokeMessage(msg._id || msg.id); }
    catch (err) { console.error('Revoke error:', err); }
  };

  const handleDeleteForMe = async (msg) => {
    try {
      const msgId = (msg._id || msg.id)?.toString();
      setMessages(prev => prev.filter(m => (m.id || m._id)?.toString() !== msgId));
      onDeleteForMe?.(msgId);
      await messageApi.deleteForMe(msgId);
    } catch (err) { console.error('Delete error:', err); }
  };

  const handleImageLoad = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const handlePin = async (msgId) => {
    try {
      await messageApi.pinMessage(conversation.id, msgId);
    } catch (err) {
      if (err?.response?.status === 400 && pinnedMessages.length >= 3) {
        setPendingPinMsgId(msgId);
        setShowPinLimitModal(true);
      } else {
        window.alert(err?.response?.data?.message || t('chat.pin_error'));
      }
    }
  };

  const handleConfirmReplacePin = async (selectedIndex) => {
    try {
      const pinToReplace = pinnedMessages[selectedIndex];
      const oldMsgId = pinToReplace.messageId._id || pinToReplace.messageId.id || pinToReplace.messageId;

      // Bỏ ghim cái cũ trước
      await messageApi.unpinMessage(conversation.id, oldMsgId);
      // Ghim cái mới
      await messageApi.pinMessage(conversation.id, pendingPinMsgId);

      setShowPinLimitModal(false);
      setPendingPinMsgId(null);
    } catch (err) {
      window.alert(t('chat_area.pin_update_error'));
    }
  };

  const handleUnpin = (msgId) => {
    setMessageIdToUnpin(msgId);
    setShowUnpinModal(true);
  };

  const confirmUnpin = async () => {
    if (!messageIdToUnpin) return;
    try {
      await messageApi.unpinMessage(conversation.id, messageIdToUnpin);
      setShowUnpinModal(false);
      setMessageIdToUnpin(null);
    } catch (err) {
      window.alert(err?.response?.data?.message || t('chat.unpin_error'));
    }
  };
  const myRole = myPermissions?.systemRole || conversation?.myMembership?.role || null;
  const isGroupLockedReadOnly =
    conversation?.type === 'group' &&
    !!conversation?.isLocked &&
    myRole === 'member';

  const canSendInActiveTopic = useMemo(() => {
    if (isGroupLockedReadOnly) return false;
    if (conversation?.type === 'group' && !myPermissions) {
      // Fallback theo role cục bộ để tránh cho gõ khi quyền chưa kịp đồng bộ.
      if (!myRole) return false;
      return myRole === 'owner' || myRole === 'admin' || conversation?.myMembership?.canSendMessages !== false;
    }
    if (!myPermissions) return true;
    if (conversation?.type !== 'group') return true; // DM luôn được gửi
    if (!activeTopic) {
      // Kênh chung — check globalPermissions
      return myPermissions.globalPermissions?.canSendMessages !== false;
    }
    // Kênh cụ thể — check topicPermissions
    const topicPerm = myPermissions.topicPermissions?.find(
      t => t._id?.toString() === activeTopic._id?.toString()
    );
    if (!topicPerm) return true; // không có entry → cho phép
    return topicPerm.canSend !== false;
  }, [myPermissions, activeTopic, conversation?.type, conversation?.myMembership?.canSendMessages, isGroupLockedReadOnly, myRole]);


  const openChannelSheet = useCallback(async () => {
    if (!conversation?.id) return;
    setShowChannelSheet(true);
    setSheetLoading(true);
    try {
      const res = await conversationApi.listTopics(conversation.id);
      setSheetTopics(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch { setSheetTopics([]); }
    finally { setSheetLoading(false); }
  }, [conversation?.id]);

  // ── Không có conversation ──────────────────────────────────
  if (!conversation) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-tertiary)', flexDirection: 'column', gap: 16, padding: 24,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--bg-hover)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 8, color: 'var(--text-muted)',
        }}>
          <MessageCircle size={40} />
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, margin: 0, textAlign: 'center' }}>
          {t('chat.welcome_title')}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 280 }}>
          {t('chat.welcome_subtitle')}
        </p>
      </div>
    );
  }
  // ── Voice channel: render full-screen voice view ──────────
  if (activeTopic?.channelType === 'voice') {
    return (
      <VoiceChannelView
        topic={activeTopic}
        conversation={conversation}
        currentUserId={currentUserId}
        onExitChannel={() => onTopicSelect && onTopicSelect(null)}
        isMobile={isMobile}
      />
    );
  }

  // ── Filter messages by active topic (groups only) ─────────
  const visibleMessages = (() => {
    if (conversation?.type === 'group' && !activeTopic) {
      // Kênh chat chung: chỉ hiện tin không thuộc topic nào (mọi loại)
      return messages.filter(m => {
        const mTopicId = m.topicId?.toString?.() || m.topicId || null;
        return !mTopicId;
      });
    }
    if (activeTopic?.channelType === 'system') {
      // Kênh nhật ký: chỉ hiện tin nhắn hệ thống (activities), ẩn text
      return messages.filter(m => m.type === 'system');
    }
    return messages; // đã được filter đúng từ Chat.jsx rồi
  })();

  // ── Build display items ────────────────────────────────────
  const displayItems = [];
  visibleMessages.forEach((msg, i) => {
    const prev = visibleMessages[i - 1];
    const msgDate = msg.time?.split(' ')[0];
    const prevDate = prev?.time?.split(' ')[0];
    if (i === 0 || (msgDate && prevDate && msgDate !== prevDate && msg.time?.includes(' '))) {
      if (msg.time?.includes(' ')) displayItems.push({ type: 'date', label: msgDate, key: `date-${i}` });
    }
    const sameGroup = prev && prev.senderId === msg.senderId && !prev.time?.includes(' ') && !msg.time?.includes(' ');
    displayItems.push({
      type: msg.type === 'system' ? 'system' : 'msg',
      msg,
      isMine:    msg.senderId?.toString() === currentUserId?.toString(),
      showHeader: msg.type === 'system' ? false : !sameGroup,
      onForward: (m) => { setForwardingMsg(m); setShowForwardModal(true); },
      key: msg._id || msg.id,
    });
  });

  // ── Chèn UnreadDivider nếu có tin chưa đọc ─────────────────────────────
  const unreadCount = aiSnapshotRef.current.unreadCount;
  const lastReadId  = aiSnapshotRef.current.lastReadId;

  if (unreadCount > 0) {
    const insertIdx = lastReadId
      ? displayItems.findIndex(item => item.type === 'msg' && (item.msg?._id || item.msg?.id) === lastReadId)
      : -1;

    const dividerItem = { type: 'unread-divider', key: `unread-divider-${conversation.id}` };

    if (insertIdx !== -1) {
      displayItems.splice(insertIdx + 1, 0, dividerItem);
    } else {
      displayItems.unshift(dividerItem);
    }
  }

  // ── Presence ───────────────────────────────────────────────
  const dmOnline = conversation.type === 'dm' && conversation.otherUserId
    ? isUserOnline(conversation.otherUserId)
    : (conversation.online ?? false);
  const dmStatus = conversation.type === 'dm' && conversation.otherUserId
    ? getPresenceStatus(conversation.otherUserId)
    : null;

  const onlineStatus = conversation.type === 'dm'
    ? (dmOnline
      ? (t(`chat.status.${dmStatus}`) || t('chat.online'))
      : (() => {
        const ls = (conversation.otherUserId ? getLastSeen(conversation.otherUserId) : null)
          || conversation.otherUserLastSeen;
        return ls ? formatLastSeen(ls) : t('chat.offline');
      })())
    : t('chat.members_count', { count: conversation.memberCount || conversation.members || 0 });

  const headerDotColor = conversation.type === 'dm'
    ? (dmOnline ? (STATUS_COLOR_MAP[dmStatus] || '#3ba55c') : '#80848e')
    : null;

  // ── Render ─────────────────────────────────────────────────
  const handleAiCreateReminder = (rem) => {
    const content = rem.title + (rem.description ? ' — ' + rem.description : '');
    const dateTime = rem.datetimeHint ? new Date(rem.datetimeHint) : new Date(Date.now() + 3600000);
    setAiReminderModal({ open: true, content, dateTime: isNaN(dateTime) ? new Date(Date.now() + 3600000) : dateTime });
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-tertiary)', overflow: 'hidden', height: '100%',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        height: isMobile ? 56 : 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 8px 0 4px' : '0 12px 0 16px',
        borderBottom: '1px solid var(--glass-border, var(--border))',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        boxShadow: '0 1px 0 var(--glass-border, var(--border)), 0 2px 8px rgba(0,0,0,0.1)',
        paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 10 }}>
          {isMobile && onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', padding: '8px 10px',
                display: 'flex', alignItems: 'center', borderRadius: 8,
              }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <Avatar name={conversation.name} avatar={conversation.avatar} size={isMobile ? 36 : 32} />
            {conversation.type === 'dm' && (
              <span style={{
                position: 'absolute', bottom: 0, right: 0,
                width: isMobile ? 11 : 10, height: isMobile ? 11 : 10,
                borderRadius: '50%', background: headerDotColor || '#80848e',
                border: '2px solid var(--bg-secondary)',
              }} />
            )}
          </div>
          <div>
            {conversation.type === 'group' ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {activeTopic?.channelType === 'voice'
                    ? <Volume2 size={13} style={{ color: '#57f287', marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />
                    : <span style={{ color: 'var(--accent)', marginRight: 1 }}>#</span>
                  }
                  {activeTopic ? translateTopicContent(activeTopic.name) : t('chat.topics.general')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>
                  {conversation.name} · {onlineStatus}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {conversation.name}
                </div>
                <div style={{ fontSize: 11, color: dmOnline ? (STATUS_COLOR_MAP[dmStatus] || '#3ba55c') : 'var(--text-muted)', lineHeight: 1 }}>
                  {onlineStatus}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 2 }}>
          {isMobile ? (
            <>
              {[
                ...(conversation?.type === 'group' ? [{ icon: <Hash size={20} />, title: t('chat.header.channels'), onClick: openChannelSheet }] : []),
                ...(conversation?.type === 'group' ? [{ icon: <Volume2 size={20} />, title: t('chat.header.voice_room'), onClick: onVoiceRoom, active: voiceRoomActive }] : []),
                ...(conversation?.type === 'dm' ? [
                  { icon: <Phone size={20} />, title: t('chat.header.call_voice'), onClick: onPhoneCall },
                  { icon: <Video size={20} />, title: t('chat.header.call_video'), onClick: onVideoCall },
                ] : []),
                { icon: <Users size={20} />, title: t('chat.header.info'), onClick: onToggleRight, active: showRight },
                { icon: <AiLogo size={20} />, title: 'AI', onClick: () => setShowAiPanel(v => !v), active: showAiPanel, aiBtn: true },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    background: btn.active ? 'var(--bg-hover)' : 'none', border: 'none', cursor: 'pointer',
                    color: btn.active ? 'var(--accent)' : 'var(--text-muted)',
                    padding: '8px 10px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', transition: 'color 0.12s',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
              {/* Group call buttons cho mobile */}
              {conversation?.type === 'group' && (
                <GroupCallButton conversationId={conversation.id || conversation._id} />
              )}
            </>
          ) : (
            <>
              {[
                // Phone/Video chỉ cho DM; group dùng GroupCallButton riêng bên dưới
                ...(conversation?.type === 'dm' ? [
                  { icon: <Phone size={16} />, title: t('chat.header.call_voice'), onClick: onPhoneCall },
                  { icon: <Video size={16} />, title: t('chat.header.call_video'), onClick: onVideoCall },
                ] : []),
                ...(conversation?.type === 'group' ? [{ icon: <Volume2 size={16} />, title: t('chat.header.voice_room'), onClick: onVoiceRoom, active: voiceRoomActive }] : []),
                // GroupCallButton sẽ tự render bên dưới cho group
                { icon: <Search size={16} />, title: t('chat.header.search'), onClick: () => setShowSearch(v => !v), active: showSearch },
                { icon: <Pin size={16} />, title: t('chat.header.pinned') },
                { icon: <MoreHorizontal size={16} />, title: t('chat.header.more') },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    background: btn.active ? 'var(--bg-hover)' : 'transparent', border: 'none', cursor: 'pointer',
                    color: btn.active ? 'var(--accent)' : 'var(--text-muted)',
                    padding: '6px 8px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = btn.active ? 'var(--bg-hover)' : 'transparent'; e.currentTarget.style.color = btn.active ? 'var(--accent)' : 'var(--text-muted)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {btn.icon}
                </button>
              ))}
              {/* Nút AI Panel */}
              <button
                onClick={() => setShowAiPanel(v => !v)}
                title="AI Trợ lý"
                style={{
                  background: showAiPanel ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: showAiPanel ? '#fff' : 'var(--text-muted)',
                  padding: '6px 8px', borderRadius: 8,
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                  boxShadow: showAiPanel ? '0 4px 12px rgba(108,99,255,0.4)' : 'none',
                }}
                onMouseEnter={e => { if (!showAiPanel) { e.currentTarget.style.background = 'rgba(167,139,250,0.12)'; e.currentTarget.style.color = '#a78bfa'; } }}
                onMouseLeave={e => { if (!showAiPanel) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
              >
                <AiLogo size={17} />
              </button>
              {/* Nút toggle info panel */}
              <button
                onClick={onToggleRight}
                title={showRight ? 'Đóng thông tin' : 'Mở thông tin'}
                style={{
                  background: showRight ? 'var(--accent)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: showRight ? '#fff' : 'var(--text-muted)',
                  padding: '6px 8px', borderRadius: 8,
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                  boxShadow: showRight ? '0 4px 10px rgba(var(--accent-rgb),0.35)' : 'none',
                }}
                onMouseEnter={e => { if (!showRight) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={e => { if (!showRight) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
              >
                <Users size={16} strokeWidth={1.8} />
              </button>
              {/* Group call buttons – chỉ hiện cho group */}
              {conversation?.type === 'group' && (
                <GroupCallButton conversationId={conversation.id || conversation._id} />
              )}
              {/* Report button */}
              <ReportButton
                targetType={conversation?.type === 'dm' ? 'user' : 'conversation'}
                targetId={conversation?.type === 'dm' ? conversation.otherUserId : conversation.id}
                targetSnapshot={conversation?.name}
              />
            </>
          )}
        </div>
      </div>

      {/* Pinned Messages Bar */}
      <PinnedBar
        pinnedMessages={pinnedMessages}
        onJump={handleJumpToMessage}
        onUnpin={handleUnpin}
      />

      <PinLimitModal
        isOpen={showPinLimitModal}
        onClose={() => { setShowPinLimitModal(false); setPendingPinMsgId(null); }}
        pinnedMessages={pinnedMessages}
        onConfirm={handleConfirmReplacePin}
      />

      <UnpinConfirmModal
        isOpen={showUnpinModal}
        onClose={() => { setShowUnpinModal(false); setMessageIdToUnpin(null); }}
        onConfirm={confirmUnpin}
      />

      {/* Voice channel view — replaces messages when voice topic is active */}
      {activeTopic?.channelType === 'voice' && (
        <VoiceChannelView
          topic={activeTopic}
          conversation={conversation}
          currentUserId={currentUserId}
          onExitChannel={() => onTopicSelect && onTopicSelect(null)}
        />
      )}

      {/* Topic bar - only for text/system topics */}
      {conversation.type === 'group' && activeTopic && activeTopic.channelType !== 'voice' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 16px', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {activeTopic.channelType === 'voice'
            ? <Volume2 size={13} style={{ color: 'var(--text-muted)' }} />
            : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>#</span>
          }
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{translateTopicContent(activeTopic.name)}</span>
          {activeTopic.description && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>— {activeTopic.description}</span>
          )}
          <button
            onClick={() => onTopicSelect && onTopicSelect(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
            title={t('chat.topics.back_to_general')}
          >
            ✕ {t('chat.topics.exit_channel')}
          </button>
        </div>
      )}

      {activeTopic?.channelType === 'voice' ? null : <><div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ padding: isMobile ? '24px 16px 16px' : '28px 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          {conversation.avatar
            ? <img src={conversation.avatar} alt={conversation.name} style={{ width: isMobile ? 56 : 60, height: isMobile ? 56 : 60, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }} />
            : <div style={{
                width: isMobile ? 56 : 60, height: isMobile ? 56 : 60, borderRadius: '50%',
                background: getAvatarColor(conversation.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12, color: '#fff', fontWeight: 800, fontSize: isMobile ? 22 : 26,
              }}>
                {getInitials(conversation.name)}
              </div>
          }
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: isMobile ? 20 : 22, margin: '0 0 6px' }}>
            {conversation.type === 'dm' ? conversation.name : `# ${conversation.name}`}
          </h2>
          <div style={{ marginBottom: 6 }}>
            <span style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              color: 'var(--text-muted)', padding: '3px 8px', borderRadius: 999, background: 'var(--bg-hover)',
            }}>
              {conversation.type === 'dm' ? t('chat.dm_label') : t('chat.group_label')}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {conversation.type === 'dm'
              ? t('chat.dm_start', { name: conversation.name })
              : t('chat.group_start', { name: conversation.name })}
          </p>
        </div>

        {displayItems.map(item => {
          if (item.type === 'date') return <DateDivider key={item.key} label={item.label} />;
          if (item.type === 'system') return <SystemMessage key={item.key} msg={item.msg} />;
          if (item.type === 'unread-divider') return <UnreadDivider key={item.key} />;
          return (
            <div
              key={item.key}
              id={item.type === 'msg' ? `msg-${item.msg?._id || item.msg?.id}` : undefined}
              className={item.type === 'msg' && (highlightedId === item.msg?._id || highlightedId === item.msg?.id) ? 'msg-highlight' : ''}
              style={{ padding: '0 16px' }}
            >
              <MessageBubble
                msg={item.msg}
                isMine={item.isMine}
                showHeader={item.showHeader}
                isMobile={isMobile}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                reactionTypes={reactionTypes}
                onReact={handleReact}
                onShowDetails={handleShowReactionDetails}
                onRecall={handleRevoke}
                onDelete={handleDeleteForMe}
                onEdit={(msg) => { setEditingMessage(msg); setReplyingMessage(null); }}
                onReply={(msg) => { setReplyingMessage(msg); setEditingMessage(null); }}
                replyingTargetId={replyingMessage?._id || replyingMessage?.id}
                onJumpToMessage={handleJumpToMessage}
                onRead={handleMarkAsRead}
                onShowReadDetails={(readBy) => setShowReadList(readBy)}
                onForward={(msg) => { setForwardingMsg(msg); setShowForwardModal(true); }}
                conversationType={conversation.type}
                currentUserId={currentUserId}
                onAvatarClick={onViewProfile}
                onImageLoad={handleImageLoad}
                onPin={handlePin}
                onUnpin={handleUnpin}
                isPinned={pinnedMessages.some(p => (p.messageId?._id || p.messageId?.id || p.messageId)?.toString() === (item.msg?._id || item.msg?.id)?.toString())}
                onVote={onPollVote}
                groupMembers={groupMembers}
              />
            </div>
          );
        })}

        {typingUser && <TypingIndicator name={typingUser.displayName} />}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {sendBlockError && (
        <div style={{ padding: '8px 16px', background: '#ed4245', color: '#fff', fontSize: 13, textAlign: 'center', flexShrink: 0 }}>
          {sendBlockError}
        </div>
      )}

      {conversation.type === 'dm' && blockStatus?.iBlocked && (
        <div style={{
          padding: '10px 16px', background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('chat.i_blocked')}</span>
          <button
            onClick={async () => {
              try {
                await import('../../friends/api/friendApi').then(m => m.default.unblockFriend(conversation.otherUserId));
                onBlockStatusChanged?.();
              } catch (err) { window.alert(err?.response?.data?.message || 'Không thể bỏ chặn'); }
            }}
            style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
            }}
          >
            {t('chat.unblock')}
          </button>
        </div>
      )}

      {conversation.type === 'dm' && blockStatus?.theyBlockedMe && (
        <div style={{
          padding: '7px 16px', background: '#fef3c7', borderTop: '1px solid #fcd34d',
          textAlign: 'center', flexShrink: 0, color: '#92400e', fontSize: 12,
        }}>
          {t('chat.they_blocked_me')}
        </div>
      )}

      {!(conversation.type === 'dm' && blockStatus?.iBlocked) && activeTopic?.channelType !== 'voice' && (
        canSendInActiveTopic ? (
          <MessageInput
            onSend={async (payload) => {
              const enriched = (conversation.type === 'group' && activeTopic)
                ? { ...payload, topicId: activeTopic._id }
                : payload;
              await onSendMessage(enriched);
              if (payload.isEdit) setEditingMessage(null);
              setReplyingMessage(null);
            }}
            placeholder={
              conversation.type === 'group'
                ? t('chat.input_group_placeholder', { name: activeTopic ? activeTopic.name : 'chung' })
                : t('chat.input_dm_placeholder', { name: conversation.name })
            }
            isMobile={isMobile}
            isGroup={conversation.type === 'group'}
            conversationId={conversation.id}
            groupMembers={groupMembers}
            socket={socket}
            editingMessage={editingMessage}
            replyingMessage={replyingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onCancelReply={() => setReplyingMessage(null)}
            externalText={smartReplyText}
            onExternalTextConsumed={() => setSmartReplyText('')}
            currentUser={currentUser}
          />
        ) : (
          // Không có quyền gửi tin trong kênh này
          <div style={{
            padding: '12px 16px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {isGroupLockedReadOnly
                ? t('chat.group_locked')
                : t('chat.no_permission', { topic: activeTopic ? ` #${activeTopic.name}` : '' })}
            </span>
          </div>
        )
      )}
      </>}{/* end voice conditional */}

      <ReactionListModal
        messageId={showReactionList}
        reactionDetails={reactionDetails}
        onClose={() => setShowReactionList(null)}
        isMobile={isMobile}
      />
      <ReadListModal
        readBy={showReadList}
        onClose={() => setShowReadList(null)}
        isMobile={isMobile}
      />
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        msg={forwardingMsg}
        onForward={() => console.log('Forwarded successfully')}
      />

      <CreateReminderModal
        isOpen={aiReminderModal.open}
        onClose={() => setAiReminderModal(p => ({ ...p, open: false }))}
        isGroup={conversation?.type === 'group'}
        initialContent={aiReminderModal.content}
        initialDateTime={aiReminderModal.dateTime}
        onCreate={async ({ content, reminderTime }) => {
          await messageApi.createReminder(conversation.id, { content, reminderTime });
          setAiReminderModal(p => ({ ...p, open: false }));
        }}
      />

      {/* Mobile channel bottom sheet (groups only) */}
      {showChannelSheet && (
        <div
          onClick={() => setShowChannelSheet(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'var(--bg-secondary)',
              borderRadius: '18px 18px 0 0',
              maxHeight: '70vh', display: 'flex', flexDirection: 'column',
              animation: 'slideUpSheet 0.25s cubic-bezier(0.4,0,0.2,1)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Sheet handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--bg-hover)' }} />
            </div>
            {/* Sheet header */}
            <div style={{ padding: '0 18px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{t('chat_area.channels_title')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{conversation.name}</div>
            </div>
            {/* Channel list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
              {/* #chung */}
              <div
                onClick={() => { onTopicSelect && onTopicSelect(null); setShowChannelSheet(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 10px', borderRadius: 10, cursor: 'pointer',
                  background: !activeTopic ? 'var(--accent)' : 'transparent',
                  marginBottom: 2,
                }}
              >
                <Hash size={18} style={{ color: !activeTopic ? '#fff' : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: !activeTopic ? 700 : 500, color: !activeTopic ? '#fff' : 'var(--text-primary)' }}>
                  {t('chat_area.general_channel')}
                </span>
              </div>

              {sheetLoading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 10px' }}>{t('chat_area.loading_channels')}</div>
              )}

              {sheetTopics.map(topic => {
                const isActive = activeTopic?._id === topic._id;
                const isVoice = topic.channelType === 'voice';
                return (
                  <div
                    key={topic._id}
                    onClick={() => { if (!topic.isLocked) { onTopicSelect && onTopicSelect(topic); setShowChannelSheet(false); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 10px', borderRadius: 10,
                      cursor: topic.isLocked ? 'not-allowed' : 'pointer',
                      background: isActive ? 'var(--accent)' : 'transparent',
                      opacity: topic.isLocked ? 0.5 : 1,
                      marginBottom: 2,
                    }}
                  >
                    {isVoice
                      ? <Volume2 size={18} style={{ color: isActive ? '#fff' : '#57f287', flexShrink: 0 }} />
                      : <Hash size={18} style={{ color: isActive ? '#fff' : 'var(--text-muted)', flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 15, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'var(--text-primary)', flex: 1 }}>
                      {topic.name}
                    </span>
                    {isVoice && !isActive && (
                      <span style={{ fontSize: 11, color: '#57f287', background: 'rgba(87,242,135,0.15)', borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>{t('chat_area.voice_label')}</span>
                    )}
                    {topic.isLocked && <Lock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  </div>
                );
              })}


              {!sheetLoading && sheetTopics.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 10px', fontStyle: 'italic' }}>
                  {t('chat_area.no_channels')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Panel */}
      {showSearch && (
        <SearchPanel
          messages={visibleMessages}
          onJumpToMessage={handleJumpToMessage}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* AI Panel */}
      {showAiPanel && (
        <AiPanel
          conversationId={conversation.id}
          conversationName={conversation.name}
          conversationType={conversation.type}
          currentUser={currentUser}
          onClose={() => setShowAiPanel(false)}
          onSelectReply={(reply) => { setSmartReplyText(reply); setShowAiPanel(false); }}
          onCreateReminder={handleAiCreateReminder}
          onJumpToMessage={(msgId) => { handleJumpToMessage(msgId); setShowAiPanel(false); }}
        />
      )}

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideUpSheet { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
}