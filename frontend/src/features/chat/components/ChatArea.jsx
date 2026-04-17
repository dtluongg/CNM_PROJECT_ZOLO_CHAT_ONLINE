import React, { useEffect, useRef, useState } from 'react';
import { Search, Users, Pin, MoreHorizontal, ArrowLeft, Phone, Video, MessageCircle, CornerUpLeft, CornerUpRight, Paperclip, ThumbsUp, Reply, Copy, Trash2 } from 'lucide-react';
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
// ── Message Bubble ─────────────────────────────────────
import MessageBubble from './chatArea/modals/MessageBubble';
// ── AI Summary components ──────────────────────────────────────────────
import UnreadDivider from './chatArea/ui/UnreadDivider';
import AiSummaryCard from './chatArea/ui/AiSummaryCard';

// ── Modals ─────────────────────────────────────────────
import ForwardModal from './chatArea/modals/ForwardModal';
import { ReactionListModal, ReadListModal } from './chatArea/modals/ReactionModal';

// ── Custom Hooks ───────────────────────────────────────
import useChatSocket from './chatArea/hooks/useChatSocket';
import useScrollBehavior from './chatArea/hooks/useScrollBehavior';

// ── Utils ──────────────────────────────────────────────
import { getAvatarColor, getInitials } from './chatArea/utils/avatarUtils';
// ─────────────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  online: 'Đang hoạt động',
  idle:   'Vắng mặt',
  dnd:    'Không làm phiền',
};
const STATUS_COLOR_MAP = {
  online: '#3ba55c',
  idle:   '#faa61a',
  dnd:    '#ed4245',
};

// ─────────────────────────────────────────────────────────────────────
export default function ChatArea({
  conversation,
  messages,
  currentUserId,
  typingUser,
  socket,
  onSendMessage,
  onToggleRight,
  showRight,
  onBack,
  isMobile,
  setMessages,
  onViewProfile,
  sendBlockError,
  blockStatus,
  onBlockStatusChanged,
  onPhoneCall,
  onVideoCall,
}) {
  const { isUserOnline, getPresenceStatus, getLastSeen } = usePresence();

  const [openMenuId,      setOpenMenuId]      = useState(null);
  const [reactionTypes,   setReactionTypes]   = useState([]);
  const [showReactionList, setShowReactionList] = useState(null);
  const [reactionDetails, setReactionDetails] = useState([]);
  const [showReadList,    setShowReadList]    = useState(null);
  const [editingMessage,  setEditingMessage]  = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);
  const [highlightedId,   setHighlightedId]   = useState(null);
  const [forwardingMsg,   setForwardingMsg]   = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  // ── Snapshot lastReadMessageId tại thời điểm mở conversation ────────
  // Phải capture inline (không dùng useEffect) để lấy giá trị trước khi markAsRead chạy
  const prevConvIdRef  = useRef(null);
  const aiSnapshotRef  = useRef({ unreadCount: 0, lastReadId: null });
  if (conversation?.id !== prevConvIdRef.current) {
    prevConvIdRef.current = conversation?.id;
    aiSnapshotRef.current = {
      unreadCount: conversation?.unread || 0,
      lastReadId:  conversation?.myMembership?.lastReadMessageId || null,
    };
  }

  // ── Fetch reaction types khi mount ─────────────────────────
  useEffect(() => {
    messageApi.getReactionTypes()
      .then(res => setReactionTypes(res.data.data))
      .catch(console.error);
  }, []);

  // ── Socket listeners ───────────────────────────────────────
  useChatSocket({ socket, conversation, currentUserId, setMessages });

  // ── Auto scroll ────────────────────────────────────────────
  const { bottomRef } = useScrollBehavior({ messages, currentUserId });

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
      setMessages(prev => prev.filter(m => (m.id || m._id) !== (msg.id || msg._id)));
      await messageApi.deleteForMe(msg._id || msg.id);
    } catch (err) { console.error('Delete error:', err); }
  };

  const handleImageLoad = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  };

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
          Chào mừng đến ZoloChat
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 280 }}>
          Chọn một cuộc trò chuyện để bắt đầu nhắn tin
        </p>
      </div>
    );
  }

  // ── Build display items ────────────────────────────────────
  const displayItems = [];
  messages.forEach((msg, i) => {
    const prev    = messages[i - 1];
    const msgDate = msg.time?.split(' ')[0];
    const prevDate = prev?.time?.split(' ')[0];
    if (i === 0 || (msgDate && prevDate && msgDate !== prevDate && msg.time?.includes(' '))) {
      if (msg.time?.includes(' ')) displayItems.push({ type: 'date', label: msgDate, key: `date-${i}` });
    }
    const sameGroup = prev && prev.senderId === msg.senderId && !prev.time?.includes(' ') && !msg.time?.includes(' ');
    displayItems.push({
      type:      msg.type === 'system' ? 'system' : 'msg',
      msg,
      isMine:    msg.senderId === currentUserId,
      showHeader: msg.type === 'system' ? false : !sameGroup,
      onForward: (m) => { setForwardingMsg(m); setShowForwardModal(true); },
      key:       msg._id || msg.id,
    });
  });

  // ── Chèn UnreadDivider + AiSummaryCard nếu có tin chưa đọc ─────────────
  // Dùng snapshot (không bị timing) thay vì live values
  const unreadCount    = aiSnapshotRef.current.unreadCount;
  const lastReadId     = aiSnapshotRef.current.lastReadId;
  const savedAiSummary = conversation?.aiSummary || null;  // từ DB

  if (unreadCount > 0) {
    if (lastReadId) {
      // Tìm vị trí của tin đã đọc cuối cùng trong displayItems
      const insertIdx = displayItems.findIndex(
        (item) => item.type === 'msg' && (item.msg?._id || item.msg?.id) === lastReadId
      );
      if (insertIdx !== -1) {
        displayItems.splice(insertIdx + 1, 0, {
          type: 'unread-divider',
          key: `unread-divider-${conversation.id}`,
        });
      } else {
        // lastReadId không có trong 30 tin đang load → chèn ở đầu list
        displayItems.unshift({
          type: 'unread-divider',
          key: `unread-divider-${conversation.id}`,
        });
      }
    } else {
      // Chưa từng đọc tin nào → tất cả là unread, chèn ở đầu
      displayItems.unshift({
        type: 'unread-divider',
        key: `unread-divider-${conversation.id}`,
      });
    }
    // AiSummaryCard luôn nằm ở cuối
    displayItems.push({
      type: 'ai-summary',
      key: `ai-summary-${conversation.id}`,
      conversationId:   conversation.id,
      initialSummary:   savedAiSummary,
      snapshotLastReadId: lastReadId,    // snapshot trước markAsRead
    });
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
      ? (STATUS_LABEL[dmStatus] || 'Đang hoạt động')
      : (() => {
        const ls = conversation.otherUserId ? getLastSeen(conversation.otherUserId) : null;
        return ls ? formatLastSeen(ls) : 'Ngoại tuyến';
      })())
    : `${conversation.memberCount || conversation.members || 0} thành viên`;

  const headerDotColor = conversation.type === 'dm'
    ? (dmOnline ? (STATUS_COLOR_MAP[dmStatus] || '#3ba55c') : '#80848e')
    : null;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-tertiary)', overflow: 'hidden', height: '100%',
    }}>
      {/* Header */}
      <div style={{
        height: isMobile ? 56 : 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 8px 0 4px' : '0 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
        flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
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
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {conversation.type === 'group' && <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>#</span>}
              {conversation.name}
            </div>
            <div style={{ fontSize: 11, color: dmOnline ? (STATUS_COLOR_MAP[dmStatus] || '#3ba55c') : 'var(--text-muted)', lineHeight: 1 }}>
              {onlineStatus}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 2 }}>
          {isMobile ? (
            <>
              {[
                { icon: <Phone size={20} />, title: 'Gọi thoại', onClick: conversation?.type === 'dm' ? onPhoneCall : undefined },
                { icon: <Video size={20} />, title: 'Gọi video', onClick: conversation?.type === 'dm' ? onVideoCall : undefined },
                { icon: <Users size={20} />, title: 'Thông tin', onClick: onToggleRight, active: showRight },
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
            </>
          ) : (
            <>
              {[
                { icon: <Phone size={16} />, title: 'Gọi thoại', onClick: conversation?.type === 'dm' ? onPhoneCall : undefined },
                { icon: <Video size={16} />, title: 'Gọi video', onClick: conversation?.type === 'dm' ? onVideoCall : undefined },
                { icon: <Search size={16} />, title: 'Tìm kiếm' },
                { icon: <Users size={16} />, title: 'Thành viên', onClick: onToggleRight, active: showRight },
                { icon: <Pin size={16} />, title: 'Tin nhắn đã ghim' },
                { icon: <MoreHorizontal size={16} />, title: 'Thêm' },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    background: btn.active ? 'var(--bg-hover)' : 'none', border: 'none', cursor: 'pointer',
                    color: btn.active ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '6px 8px', borderRadius: 6,
                    display: 'flex', alignItems: 'center', transition: 'background 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = btn.active ? 'var(--bg-hover)' : 'none'; e.currentTarget.style.color = btn.active ? 'var(--text-primary)' : 'var(--text-muted)'; }}
                >
                  {btn.icon}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ padding: isMobile ? '24px 16px 16px' : '28px 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{
            width: isMobile ? 56 : 60, height: isMobile ? 56 : 60, borderRadius: '50%',
            background: getAvatarColor(conversation.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, color: '#fff', fontWeight: 800, fontSize: isMobile ? 22 : 26,
          }}>
            {getInitials(conversation.name)}
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: isMobile ? 20 : 22, margin: '0 0 6px' }}>
            {conversation.type === 'dm' ? conversation.name : `# ${conversation.name}`}
          </h2>
          <div style={{ marginBottom: 6 }}>
            <span style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              color: 'var(--text-muted)', padding: '3px 8px', borderRadius: 999, background: 'var(--bg-hover)',
            }}>
              {conversation.type === 'dm' ? 'Tin nhắn trực tiếp' : 'Nhóm chat'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {conversation.type === 'dm'
              ? `Đây là nơi bắt đầu cuộc trò chuyện giữa bạn và ${conversation.name}.`
              : `Đây là kênh đầu tiên của nhóm ${conversation.name}.`}
          </p>
        </div>

        {displayItems.map(item => {
          if (item.type === 'date') return <DateDivider key={item.key} label={item.label} />;
          if (item.type === 'system') return <SystemMessage key={item.key} msg={item.msg} />;
          if (item.type === 'unread-divider') return <UnreadDivider key={item.key} />;
          if (item.type === 'ai-summary') return (
            <AiSummaryCard
              key={item.key}
              conversationId={item.conversationId}
              initialSummary={item.initialSummary}
              snapshotLastReadId={item.snapshotLastReadId}
            />
          );
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
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Bạn đã chặn người này. Không thể gửi tin nhắn.</span>
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
            Bỏ chặn
          </button>
        </div>
      )}

      {conversation.type === 'dm' && blockStatus?.theyBlockedMe && (
        <div style={{
          padding: '7px 16px', background: '#fef3c7', borderTop: '1px solid #fcd34d',
          textAlign: 'center', flexShrink: 0, color: '#92400e', fontSize: 12,
        }}>
          Bạn đã bị người này chặn. Tin nhắn của bạn sẽ không được nhận.
        </div>
      )}

      {!(conversation.type === 'dm' && blockStatus?.iBlocked) && (
        <MessageInput
          onSend={async (payload) => {
            await onSendMessage(payload);
            if (payload.isEdit) setEditingMessage(null);
            setReplyingMessage(null); // Fix: Clear reply bar after successful send
          }}
          placeholder={`Nhắn tin tới ${conversation.type === 'group' ? '#' : ''}${conversation.name}...`}
          isMobile={isMobile}
          conversationId={conversation.id}
          socket={socket}
          editingMessage={editingMessage}
          replyingMessage={replyingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onCancelReply={() => setReplyingMessage(null)}
        />
      )}

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

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}