import { useEffect, useRef, useState } from 'react';
import {
  ThumbsUp, CornerUpRight, MoreHorizontal,
  Paperclip, Reply, Copy, Pin, Trash2,
} from 'lucide-react';
import Avatar from '../ui/Avatar';

const SENDER_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#faa61a', '#ed4245'];

const MessageBubble = ({
  msg,
  isMine,
  showHeader,
  isMobile,
  onReact,
  onShowDetails,
  onRecall,
  onDelete,
  openMenuId,
  setOpenMenuId,
  reactionTypes,
  onEdit,
  onRead,
  onShowReadDetails,
  onForward,
  conversationType,
  currentUserId,
  onAvatarClick,
}) => {
  const observerRef    = useRef(null);
  const menuRef        = useRef(null);
  const actionButtonRef = useRef(null);

  const [hover, setHover]             = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState('down');
  const longPressRef = useRef(null);

  const showMenu = openMenuId === (msg.id || msg._id);
  const maxWidth = isMobile ? '82%' : '68%';
  const senderColor = isMine
    ? 'var(--accent)'
    : SENDER_COLORS[msg.senderName?.charCodeAt(0) % SENDER_COLORS.length] || 'var(--accent)';

  // ── Long press (mobile) ────────────────────────────────────
  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);

  // ── Close menu on outside click ────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    if (showMenu) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu, setOpenMenuId]);

  // ── Menu placement (up / down) ─────────────────────────────
  useEffect(() => {
    if (showMenu && actionButtonRef.current) {
      const rect = actionButtonRef.current.getBoundingClientRect();
      setMenuPlacement(window.innerHeight - rect.bottom < 200 ? 'up' : 'down');
    }
  }, [showMenu]);

  // ── IntersectionObserver → mark as read ───────────────────
  useEffect(() => {
    if (isMine || msg.revoked || !onRead) return;
    if (msg.readBy?.some(r => r.userId === currentUserId)) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onRead(msg); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [msg, isMine, onRead, currentUserId]);

  // ── Render nội dung tin nhắn ───────────────────────────────
  const renderContent = () => {
    if (msg.revoked || msg.recalled) {
      return <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Tin nhắn đã được thu hồi</span>;
    }
    if (msg.type === 'image') {
      return (
        <img
          src={msg.payload?.url || msg.content}
          alt="attachment"
          style={{ maxWidth: isMobile ? 220 : 260, maxHeight: 260, borderRadius: 8, display: 'block' }}
        />
      );
    }
    if (msg.type === 'voice') {
      return (
        <audio
          controls
          src={msg.payload?.url || msg.content}
          style={{ maxWidth: isMobile ? 220 : 260, display: 'block', height: 36 }}
        />
      );
    }
    if (msg.type === 'video') {
      return (
        <video
          src={msg.payload?.url || msg.content}
          controls
          style={{ maxWidth: isMobile ? 220 : 260, maxHeight: 200, borderRadius: 8, display: 'block', backgroundColor: '#000' }}
        />
      );
    }
    if (msg.type === 'file') {
      const fileName = msg.payload?.fileName || msg.content || '';
      const fileUrl  = msg.payload?.url || msg.content;
      const isVideo  = /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(fileName);
      if (isVideo) {
        return (
          <video
            src={fileUrl}
            controls
            style={{ maxWidth: isMobile ? 220 : 260, maxHeight: 200, borderRadius: 8, display: 'block', backgroundColor: '#000' }}
          />
        );
      }
      return (
        <a href={fileUrl} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
          <Paperclip size={18} />
          <span style={{ fontSize: 13, textDecoration: 'underline' }}>{fileName}</span>
        </a>
      );
    }
    return (
      <>
        {msg.content}
        {msg.edited && (
          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 6, fontStyle: 'italic', fontWeight: 400 }}>
            (đã chỉnh sửa)
          </span>
        )}
      </>
    );
  };

  return (
    <div
      ref={observerRef}
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
      onMouseEnter={() => { if (!isMobile) setHover(true); }}
      onMouseLeave={() => { if (!isMobile) { setHover(false); setShowEmojiBar(false); } }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Avatar */}
      <div style={{ width: isMobile ? 34 : 36, flexShrink: 0, marginTop: showHeader ? 2 : 0 }}>
        {showHeader && !isMine && (
          <div
            onClick={() => onAvatarClick?.(msg.senderId)}
            style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
          >
            <Avatar name={msg.senderName} avatar={msg.avatar} size={isMobile ? 34 : 36} />
          </div>
        )}
      </div>

      <div style={{
        maxWidth, display: 'flex', flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start', position: 'relative',
      }}>
        {/* Header (tên + giờ) */}
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

        {/* Emoji bar (desktop hover) */}
        {showEmojiBar && !isMobile && !(msg.revoked || msg.recalled) && (
          <div style={{
            position: 'absolute', top: -45, [isMine ? 'right' : 'left']: 0,
            background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 24,
            padding: '6px 12px', display: 'flex', gap: 12,
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)', zIndex: 2000,
          }}>
            {(reactionTypes?.length > 0 ? reactionTypes : [
              { emoji: '👍' }, { emoji: '❤️' }, { emoji: '😂' },
              { emoji: '😮' }, { emoji: '😢' }, { emoji: '😡' },
            ]).map(r => (
              <span
                key={r.emoji || r.code}
                title={r.label}
                style={{ fontSize: 18, cursor: 'pointer', transition: 'transform 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => { onReact(msg, r.emoji); setShowEmojiBar(false); }}
              >
                {r.emoji}
              </span>
            ))}
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
            fontSize: isMobile ? 15 : 14, lineHeight: 1.5,
            wordBreak: 'break-word',
            boxShadow: '0 1px 2px rgba(0,0,0,0.12)', maxWidth: '100%',
          }}>
            {renderContent()}
          </div>

          {/* Desktop hover actions */}
          {hover && !isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: '#ffffff', border: '1px solid #e1e4e8',
              borderRadius: 20, padding: '2px 6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              {[
                ...(!(msg.revoked || msg.recalled) ? [
                  { content: <ThumbsUp size={13} />, title: 'Thả cảm xúc', onClick: () => setShowEmojiBar(p => !p) },
                  { content: <CornerUpRight size={13} />, title: 'Chuyển tiếp', onClick: () => onForward(msg) },
                ] : []),
                {
                  content: <MoreHorizontal size={14} />, title: 'Thêm',
                  ref: actionButtonRef,
                  onClick: (e) => {
                    e.stopPropagation();
                    setOpenMenuId(prev => prev === (msg.id || msg._id) ? null : (msg.id || msg._id));
                  },
                },
              ].map((btn, i) => (
                <div
                  key={i}
                  ref={btn.ref || null}
                  title={btn.title}
                  onClick={btn.onClick}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', cursor: 'pointer', color: '#5f6368', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5f6368'; }}
                >
                  {btn.content}
                </div>
              ))}
            </div>
          )}

          {/* Context menu */}
          {showMenu && (
            <div
              ref={menuRef}
              style={{
                position: 'absolute',
                ...(menuPlacement === 'up' ? { bottom: '110%', marginBottom: 6 } : { top: '110%', marginTop: 6 }),
                right: isMine ? 0 : 'auto', left: isMine ? 'auto' : 0,
                background: '#fff', borderRadius: 10,
                boxShadow: menuPlacement === 'up' ? '0 -4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.15)',
                padding: '6px 0', zIndex: 999, minWidth: 180, border: '1px solid #eee',
              }}
            >
              {isMine && (
                <div onClick={() => { onRecall(msg); setOpenMenuId(null); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#ed4245', fontWeight: 600 }}>
                  ↩️ Thu hồi
                </div>
              )}
              <div onClick={() => { onDelete(msg); setOpenMenuId(null); }}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#ed4245' }}>
                🗑️ Xóa
              </div>
              {isMine && (
                <div onClick={() => { onEdit(msg); setOpenMenuId(null); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#000' }}>
                  ✏️ Chỉnh sửa tin nhắn
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reactions summary */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div
            onClick={() => onShowDetails(msg)}
            style={{
              position: 'absolute', bottom: -10, [isMine ? 'left' : 'right']: 12,
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#fff', border: '1px solid #e1e4e8', borderRadius: 12,
              padding: '2px 8px', fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)', zIndex: 2, userSelect: 'none',
            }}
          >
            {Object.entries(msg.reactions).map(([emoji, count], idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 2, borderRadius: 4, padding: '0 2px' }}>
                <span>{emoji}</span>
                {count > 1 && <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Đã xem / Đã gửi */}
        {isMine && (
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            {msg.blocked ? (
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Bị chặn bởi người dùng này</span>
            ) : conversationType === 'dm' ? (
              msg.readBy && msg.readBy.length > 0
                ? <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Đã xem</span>
                : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã gửi</span>
            ) : (
              msg.readBy && msg.readBy.length > 0 ? (
                <div
                  onClick={() => onShowReadDetails(msg.readBy)}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', marginLeft: 4 }}>
                    {msg.readBy.slice(0, 5).map((reader, idx) => (
                      <div key={reader.userId} style={{ marginLeft: idx === 0 ? 0 : -6, border: '2px solid var(--bg-tertiary)', borderRadius: '50%' }}>
                        <Avatar name={reader.displayName} avatar={reader.avatar} size={14} />
                      </div>
                    ))}
                  </div>
                  {msg.readBy.length > 5 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{msg.readBy.length - 5}</span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã gửi</span>
              )
            )}
          </div>
        )}
      </div>

      {/* Mobile long-press sheet */}
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '0 16px 16px', borderBottom: '1px solid var(--border)' }}>
              {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onReact(msg, emoji); setShowActions(false); }}
                  style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 10, transition: 'transform 0.1s' }}
                  onTouchStart={e => e.currentTarget.style.transform = 'scale(1.3)'}
                  onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {[
              { icon: <Reply size={20} />, label: 'Trả lời' },
              { icon: <CornerUpRight size={20} />, label: 'Chuyển tiếp', onClick: () => { onForward(msg); setShowActions(false); } },
              { icon: <Copy size={20} />, label: 'Sao chép' },
              { icon: <Pin size={20} />, label: 'Ghim tin nhắn' },
              { icon: <Trash2 size={20} />, label: 'Xóa tin nhắn', danger: true },
            ].map(action => (
              <button
                key={action.label}
                onClick={action.onClick || (() => setShowActions(false))}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '14px 20px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 14,
                  fontSize: 16, color: action.danger ? '#ed4245' : 'var(--text-primary)',
                  fontWeight: action.danger ? 600 : 400, transition: 'background 0.1s',
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

export default MessageBubble;