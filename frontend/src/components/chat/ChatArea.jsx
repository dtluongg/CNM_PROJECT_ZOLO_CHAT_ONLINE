import React, { useEffect, useRef, useState } from 'react';
import MessageInput from './MessageInput';

const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#fee75c', '#ed4245', '#9b59b6', '#e67e22',
];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Avatar = ({ name, avatar, size = 36 }) => (
  avatar ? (
    <img
      src={avatar}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: getAvatarColor(name),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.38,
      userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  )
);

const DateDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 16px 8px', pointerEvents: 'none' }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    <span style={{
      fontSize: 11,
      color: 'var(--text-muted)',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      padding: '0 8px',
    }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
);

const MessageBubble = ({ msg, isMine, showHeader }) => {
  const [hover, setHover] = useState(false);
  const SENDER_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#faa61a', '#ed4245'];
  const senderColor = isMine
    ? 'var(--accent)'
    : SENDER_COLORS[msg.senderName?.charCodeAt(0) % SENDER_COLORS.length] || 'var(--accent)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        gap: 10,
        padding: showHeader ? '8px 16px 2px' : '2px 16px',
        alignItems: 'flex-start',
        position: 'relative',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar placeholder — always takes space for alignment */}
      <div style={{ width: 36, flexShrink: 0, marginTop: showHeader ? 2 : 0 }}>
        {showHeader && !isMine && <Avatar name={msg.senderName} avatar={msg.avatar} size={36} />}
      </div>

      <div style={{
        maxWidth: '68%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
      }}>
        {showHeader && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
            {!isMine && (
              <span style={{ fontSize: 14, fontWeight: 700, color: senderColor }}>
                {msg.senderName}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{msg.time}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexDirection: isMine ? 'row-reverse' : 'row',
        }}>
          {/* Bubble */}
          <div style={{
            background: isMine ? 'var(--bubble-self)' : 'var(--bubble-other)',
            color: isMine ? '#ffffff' : 'var(--text-primary)',
            padding: '8px 13px',
            borderRadius: isMine
              ? (showHeader ? '16px 4px 16px 16px' : '16px 4px 4px 16px')
              : (showHeader ? '4px 16px 16px 16px' : '4px 16px 16px 4px'),
            fontSize: 14,
            lineHeight: 1.55,
            wordBreak: 'break-word',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            maxWidth: '100%',
          }}>
            {msg.type === 'image' ? (
              <img
                src={msg.content}
                alt="attachment"
                style={{ maxWidth: 260, maxHeight: 260, borderRadius: 8, display: 'block' }}
              />
            ) : msg.type === 'file' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>📎</span>
                <span style={{ fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
                  {msg.content}
                </span>
              </div>
            ) : (
              msg.content
            )}
          </div>

          {/* Hover actions */}
          {hover && (
            <div style={{
              display: 'flex',
              gap: 2,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '3px 6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}>
              {['👍', '↩️', '⋯'].map((icon) => (
                <button
                  key={icon}
                  title={icon === '👍' ? 'Thả cảm xúc' : icon === '↩️' ? 'Trả lời' : 'Thêm'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '3px 5px',
                    borderRadius: 4,
                    color: 'var(--text-secondary)',
                    transition: 'background 0.1s',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp for non-header messages on hover */}
        {!showHeader && hover && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            marginTop: 2,
            paddingLeft: isMine ? 0 : 4,
          }}>
            {msg.time}
          </span>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = ({ name }) => (
  <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{
      background: 'var(--bubble-other)',
      padding: '10px 14px',
      borderRadius: '4px 16px 16px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 3,
    }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            display: 'inline-block',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {name} đang nhập...
    </span>
  </div>
);

export default function ChatArea({
  conversation,
  messages,
  onSendMessage,
  onToggleRight,
  showRight,
  onToggleMobileSidebar,
  isMobile,
}) {
  const bottomRef = useRef(null);
  const [typing] = useState(false);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--bg-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          marginBottom: 8,
        }}>
          💬
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>
          Chào mừng đến ZoloChat
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 280 }}>
          Chọn một cuộc trò chuyện từ thanh bên trái để bắt đầu nhắn tin
        </p>
        {isMobile && (
          <button
            onClick={onToggleMobileSidebar}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            Xem danh sách trò chuyện
          </button>
        )}
      </div>
    );
  }

  // Build display items with date grouping and message grouping
  const displayItems = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];

    // Date divider logic (for messages that have a different "date" prefix in time)
    const msgDatePart = msg.time?.split(' ')[0];
    const prevDatePart = prev?.time?.split(' ')[0];
    if (i === 0 || (msgDatePart && prevDatePart && msgDatePart !== prevDatePart && msg.time?.includes(' '))) {
      const dateLabel = msg.time?.includes(' ') ? msgDatePart : null;
      if (dateLabel) {
        displayItems.push({ type: 'date', label: dateLabel, key: `date-${i}` });
      }
    }

    // Group messages: show header if first in group or sender changed
    const sameGroup =
      prev &&
      prev.senderId === msg.senderId &&
      !prev.time?.includes(' ') &&
      !msg.time?.includes(' ');

    displayItems.push({
      type: 'msg',
      msg,
      isMine: msg.senderId === 'me',
      showHeader: !sameGroup,
      key: msg.id,
    });
  });

  const onlineStatus =
    conversation.type === 'dm'
      ? conversation.online
        ? '🟢 Online'
        : '⚫ Offline'
      : `👥 ${conversation.members || ''} thành viên`;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-tertiary)',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* ── Header ── */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-tertiary)',
        flexShrink: 0,
        zIndex: 10,
        boxShadow: '0 1px 0 var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={onToggleMobileSidebar}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 20,
                padding: '4px 6px',
                borderRadius: 4,
                marginRight: 4,
              }}
            >
              ☰
            </button>
          )}

          {/* Conversation avatar + status dot */}
          <div style={{ position: 'relative' }}>
            <Avatar name={conversation.name} avatar={conversation.avatar} size={32} />
            {conversation.type === 'dm' && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: conversation.online ? '#3ba55c' : '#80848e',
                border: '2px solid var(--bg-tertiary)',
              }} />
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {conversation.type === 'group' && (
                <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>#</span>
              )}
              {conversation.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>
              {onlineStatus}
            </div>
          </div>
        </div>

        {/* Header action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[
            { icon: '🔍', title: 'Tìm kiếm trong cuộc trò chuyện' },
            { icon: '👥', title: 'Thành viên', onClick: onToggleRight, active: showRight },
            { icon: '📌', title: 'Tin nhắn đã ghim' },
            { icon: '⋯', title: 'Thêm tuỳ chọn' },
          ].map((btn) => (
            <button
              key={btn.icon}
              onClick={btn.onClick}
              title={btn.title}
              style={{
                background: btn.active ? 'var(--bg-hover)' : 'none',
                border: 'none',
                cursor: 'pointer',
                color: btn.active ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 18,
                padding: '6px 8px',
                borderRadius: 6,
                transition: 'background 0.12s, color 0.12s',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = btn.active ? 'var(--bg-hover)' : 'none';
                e.currentTarget.style.color = btn.active ? 'var(--text-primary)' : 'var(--text-muted)';
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message List ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--bg-hover) transparent',
      }}>
        {/* Conversation intro banner */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: getAvatarColor(conversation.name),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            marginBottom: 14,
            color: '#fff',
            fontWeight: 800,
            fontSize: 26,
          }}>
            {getInitials(conversation.name)}
          </div>
          <h2 style={{
            color: 'var(--text-primary)',
            fontWeight: 800,
            fontSize: 22,
            margin: '0 0 6px',
          }}>
            {conversation.type === 'dm'
              ? conversation.name
              : `# ${conversation.name}`}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            {conversation.type === 'dm'
              ? `Đây là nơi bắt đầu cuộc trò chuyện giữa bạn và ${conversation.name}.`
              : `Đây là kênh đầu tiên của nhóm ${conversation.name}.`}
          </p>
        </div>

        {/* Messages */}
        {displayItems.map((item) =>
          item.type === 'date' ? (
            <DateDivider key={item.key} label={item.label} />
          ) : (
            <MessageBubble
              key={item.key}
              msg={item.msg}
              isMine={item.isMine}
              showHeader={item.showHeader}
            />
          )
        )}

        {/* Typing indicator */}
        {typing && <TypingIndicator name={conversation.name} />}

        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Message Input ── */}
      <MessageInput
        onSend={onSendMessage}
        placeholder={`Nhắn tin tới ${conversation.type === 'group' ? '#' : ''}${conversation.name}...`}
      />

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
