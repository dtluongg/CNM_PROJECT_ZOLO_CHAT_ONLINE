import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Users, Pin, MoreHorizontal, ArrowLeft, Phone, Video, MessageCircle, Smile, CornerUpLeft, Paperclip, ThumbsUp, Reply, Copy, Trash2 } from 'lucide-react';
import MessageInput from './MessageInput';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#fee75c','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => name ? AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] : AVATAR_COLORS[0];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const Avatar = ({ name, avatar, size = 36 }) => (
  avatar
    ? <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: getAvatarColor(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.38, userSelect: 'none',
      }}>{getInitials(name)}</div>
);

const DateDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 16px 8px', pointerEvents: 'none' }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', padding: '0 8px' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
);

const MessageBubble = ({ msg, isMine, showHeader, isMobile }) => {
  const [hover, setHover] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const longPressRef = useRef(null);

  const SENDER_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245'];
  const senderColor = isMine
    ? 'var(--accent)'
    : SENDER_COLORS[msg.senderName?.charCodeAt(0) % SENDER_COLORS.length] || 'var(--accent)';

  // Long press on mobile to show actions
  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressRef.current);
  };

  const maxWidth = isMobile ? '82%' : '68%';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        gap: isMobile ? 8 : 10,
        padding: showHeader
          ? (isMobile ? '8px 12px 2px' : '8px 16px 2px')
          : (isMobile ? '2px 12px' : '2px 16px'),
        alignItems: 'flex-start',
        position: 'relative',
      }}
      onMouseEnter={() => !isMobile && setHover(true)}
      onMouseLeave={() => !isMobile && setHover(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Avatar placeholder */}
      <div style={{ width: isMobile ? 34 : 36, flexShrink: 0, marginTop: showHeader ? 2 : 0 }}>
        {showHeader && !isMine && <Avatar name={msg.senderName} avatar={msg.avatar} size={isMobile ? 34 : 36} />}
      </div>

      <div style={{
        maxWidth,
        display: 'flex', flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
      }}>
        {showHeader && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
            {!isMine && (
              <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: senderColor }}>
                {msg.senderName}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{msg.time}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
          {/* Bubble */}
          <div style={{
            background: isMine ? 'var(--bubble-self)' : 'var(--bubble-other)',
            color: isMine ? '#fff' : 'var(--text-primary)',
            padding: isMobile ? '9px 14px' : '8px 13px',
            borderRadius: isMine
              ? (showHeader ? '18px 4px 18px 18px' : '18px 4px 4px 18px')
              : (showHeader ? '4px 18px 18px 18px' : '4px 18px 18px 4px'),
            fontSize: isMobile ? 15 : 14,
            lineHeight: 1.5,
            wordBreak: 'break-word',
            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
            maxWidth: '100%',
          }}>
            {msg.type === 'image' ? (
              <img src={msg.content} alt="attachment"
                style={{ maxWidth: isMobile ? 220 : 260, maxHeight: 260, borderRadius: 8, display: 'block' }} />
            ) : msg.type === 'file' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Paperclip size={18} />
                <span style={{ fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>{msg.content}</span>
              </div>
            ) : msg.content}
          </div>

          {/* Desktop hover actions */}
          {hover && !isMobile && (
            <div style={{
              display: 'flex', gap: 2,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '3px 6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}>
              {[
                { content: <ThumbsUp size={13} />, title: 'Thả cảm xúc' },
                { content: <CornerUpLeft size={13} />, title: 'Trả lời' },
                { content: <MoreHorizontal size={14} />, title: 'Thêm' },
              ].map((btn, i) => (
                <button key={i} title={btn.title}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '3px 5px', borderRadius: 4, color: 'var(--text-secondary)', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {btn.content}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp on hover (desktop) */}
        {!showHeader && hover && !isMobile && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, paddingLeft: isMine ? 0 : 4 }}>
            {msg.time}
          </span>
        )}
      </div>

      {/* Mobile long-press actions overlay */}
      {showActions && isMobile && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowActions(false)}
        >
          <div
            style={{
              width: '100%', background: 'var(--bg-secondary)',
              borderRadius: '20px 20px 0 0',
              padding: '16px 0 calc(16px + env(safe-area-inset-bottom, 0px))',
              animation: 'fadeInUp 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Quick emoji reactions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '0 16px 16px', borderBottom: '1px solid var(--border)' }}>
              {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                <button key={emoji}
                  onClick={() => setShowActions(false)}
                  style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 10, transition: 'transform 0.1s' }}
                  onTouchStart={e => e.currentTarget.style.transform = 'scale(1.3)'}
                  onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                >{emoji}</button>
              ))}
            </div>
            {/* Actions */}
            {[
              { icon: <Reply size={20} />, label: 'Trả lời' },
              { icon: <Copy size={20} />, label: 'Sao chép' },
              { icon: <Pin size={20} />, label: 'Ghim tin nhắn' },
              { icon: <Trash2 size={20} />, label: 'Xóa tin nhắn', danger: true },
            ].map(action => (
              <button key={action.label}
                onClick={() => setShowActions(false)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '14px 20px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 14,
                  fontSize: 16, color: action.danger ? '#ed4245' : 'var(--text-primary)',
                  fontWeight: action.danger ? 600 : 400,
                  transition: 'background 0.1s',
                }}
                onTouchStart={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onTouchEnd={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TypingIndicator = ({ name }) => (
  <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ background: 'var(--bubble-other)', padding: '10px 14px', borderRadius: '4px 16px 16px 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {name} đang nhập...
    </span>
  </div>
);

export default function ChatArea({
  conversation, messages, onSendMessage,
  onToggleRight, showRight, onBack, isMobile,
}) {
  const bottomRef = useRef(null);
  const [typing] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-tertiary)', flexDirection: 'column', gap: 16,
        padding: 24,
      }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: 'var(--text-muted)' }}>
          <MessageCircle size={40} />
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, margin: 0, textAlign: 'center' }}>Chào mừng đến ZoloChat</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 280 }}>
          Chọn một cuộc trò chuyện để bắt đầu nhắn tin
        </p>
      </div>
    );
  }

  // Build display items
  const displayItems = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const msgDate = msg.time?.split(' ')[0];
    const prevDate = prev?.time?.split(' ')[0];
    if (i === 0 || (msgDate && prevDate && msgDate !== prevDate && msg.time?.includes(' '))) {
      if (msg.time?.includes(' ')) {
        displayItems.push({ type: 'date', label: msgDate, key: `date-${i}` });
      }
    }
    const sameGroup = prev && prev.senderId === msg.senderId && !prev.time?.includes(' ') && !msg.time?.includes(' ');
    displayItems.push({ type: 'msg', msg, isMine: msg.senderId === 'me', showHeader: !sameGroup, key: msg.id });
  });

  const onlineStatus = conversation.type === 'dm'
    ? (conversation.online ? 'Online' : 'Offline')
    : `${conversation.memberCount || conversation.members || 0} thành viên`;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-tertiary)', overflow: 'hidden', height: '100%',
    }}>
      {/* ── Header ── */}
      <div style={{
        height: isMobile ? 56 : 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 8px 0 4px' : '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 10 }}>
          {/* Back button (mobile) */}
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

          {/* Avatar + status */}
          <div style={{ position: 'relative' }}>
            <Avatar name={conversation.name} avatar={conversation.avatar} size={isMobile ? 36 : 32} />
            {conversation.type === 'dm' && (
              <span style={{
                position: 'absolute', bottom: 0, right: 0,
                width: isMobile ? 11 : 10, height: isMobile ? 11 : 10,
                borderRadius: '50%',
                background: conversation.online ? '#3ba55c' : '#80848e',
                border: '2px solid var(--bg-secondary)',
              }} />
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {conversation.type === 'group' && <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>#</span>}
              {conversation.name}
            </div>
            <div style={{ fontSize: 11, color: conversation.online ? '#3ba55c' : 'var(--text-muted)', lineHeight: 1 }}>
              {onlineStatus}
            </div>
          </div>
        </div>

        {/* Header action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 2 }}>
          {isMobile ? (
            // Mobile: show only 3 most important buttons
            <>
              {[
                { icon: <Phone size={20} />, title: 'Gọi thoại' },
                { icon: <Video size={20} />, title: 'Gọi video' },
                { icon: <Users size={20} />, title: 'Thông tin', onClick: onToggleRight, active: showRight },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    background: btn.active ? 'var(--bg-hover)' : 'none',
                    border: 'none', cursor: 'pointer',
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
            // Desktop: all buttons
            <>
              {[
                { icon: <Phone size={16} />, title: 'Gọi thoại' },
                { icon: <Video size={16} />, title: 'Gọi video' },
                { icon: <Search size={16} />, title: 'Tìm kiếm' },
                { icon: <Users size={16} />, title: 'Thành viên', onClick: onToggleRight, active: showRight },
                { icon: <Pin size={16} />, title: 'Tin nhắn đã ghim' },
                { icon: <MoreHorizontal size={16} />, title: 'Thêm' },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    background: btn.active ? 'var(--bg-hover)' : 'none',
                    border: 'none', cursor: 'pointer',
                    color: btn.active ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '6px 8px', borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                    transition: 'background 0.12s, color 0.12s',
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

      {/* ── Message List ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Conversation intro */}
        <div style={{ padding: isMobile ? '24px 16px 16px' : '28px 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{
            width: isMobile ? 56 : 60, height: isMobile ? 56 : 60,
            borderRadius: '50%',
            background: getAvatarColor(conversation.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, color: '#fff', fontWeight: 800,
            fontSize: isMobile ? 22 : 26,
          }}>
            {getInitials(conversation.name)}
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: isMobile ? 20 : 22, margin: '0 0 6px' }}>
            {conversation.type === 'dm' ? conversation.name : `# ${conversation.name}`}
          </h2>
          <div style={{ marginBottom: 6 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '3px 8px',
              borderRadius: 999,
              background: 'var(--bg-hover)',
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

        {/* Messages */}
        {displayItems.map(item =>
          item.type === 'date'
            ? <DateDivider key={item.key} label={item.label} />
            : <MessageBubble key={item.key} msg={item.msg} isMine={item.isMine} showHeader={item.showHeader} isMobile={isMobile} />
        )}

        {typing && <TypingIndicator name={conversation.name} />}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Message Input ── */}
      <MessageInput
        onSend={onSendMessage}
        placeholder={`Nhắn tin tới ${conversation.type === 'group' ? '#' : ''}${conversation.name}...`}
        isMobile={isMobile}
      />

      <style>{`
        @keyframes bounce { 0%,60%,100% { transform:translateY(0);opacity:.5; } 30% { transform:translateY(-5px);opacity:1; } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
