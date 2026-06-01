import { useEffect, useRef, useState } from 'react';
import {
  ThumbsUp, CornerUpRight, MoreHorizontal,
  Paperclip, Reply, Copy, Pin, Trash2, Quote, Globe, Languages, XCircle, Loader2,
  X, ZoomIn, ZoomOut, Download,
  FileText, FileSpreadsheet, FileArchive, Music, File
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import PollMessage from '../ui/PollMessage';
import ReminderMessage from '../ui/ReminderMessage';
import messageApi from '../../../api/messageApi';
import { useLanguage } from '../../../../../context/LanguageContext';
import LanguageSelectorModal from './LanguageSelectorModal';

// ── File type helpers ────────────────────────────────────────────────────────
const FILE_TYPES = {
  pdf:  { icon: FileText,       color: '#e74c3c', bg: '#fdecea', label: 'PDF' },
  doc:  { icon: FileText,       color: '#2980b9', bg: '#eaf4fb', label: 'Word' },
  docx: { icon: FileText,       color: '#2980b9', bg: '#eaf4fb', label: 'Word' },
  xls:  { icon: FileSpreadsheet,color: '#27ae60', bg: '#eafaf1', label: 'Excel' },
  xlsx: { icon: FileSpreadsheet,color: '#27ae60', bg: '#eafaf1', label: 'Excel' },
  ppt:  { icon: FileText,       color: '#e67e22', bg: '#fef9e7', label: 'PPT' },
  pptx: { icon: FileText,       color: '#e67e22', bg: '#fef9e7', label: 'PPT' },
  zip:  { icon: FileArchive,    color: '#f39c12', bg: '#fef9e7', label: 'ZIP' },
  rar:  { icon: FileArchive,    color: '#f39c12', bg: '#fef9e7', label: 'RAR' },
  '7z': { icon: FileArchive,    color: '#f39c12', bg: '#fef9e7', label: '7Z'  },
  mp3:  { icon: Music,          color: '#8e44ad', bg: '#f5eef8', label: 'MP3' },
  wav:  { icon: Music,          color: '#8e44ad', bg: '#f5eef8', label: 'WAV' },
  m4a:  { icon: Music,          color: '#8e44ad', bg: '#f5eef8', label: 'M4A' },
  ogg:  { icon: Music,          color: '#8e44ad', bg: '#f5eef8', label: 'OGG' },
};
const VIDEO_EXTS = /\.(mp4|mov|avi|mkv|webm|m4v)$/i;

function getFileType(fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return FILE_TYPES[ext] || { icon: File, color: '#636e72', bg: '#f0f0f0', label: ext.toUpperCase() || 'FILE' };
}

// ── MediaViewer lightbox ─────────────────────────────────────────────────────
function MediaViewer({ url, type, name, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos]     = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last     = useRef({ x: 0, y: 0 });

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Wheel zoom (image only)
  const onWheel = (e) => {
    if (type !== 'image') return;
    e.preventDefault();
    setScale(s => Math.min(5, Math.max(0.3, s - e.deltaY * 0.001)));
  };

  const onMouseDown = (e) => {
    if (type !== 'image') return;
    dragging.current = true;
    last.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - last.current.x, y: e.clientY - last.current.y });
  };
  const onMouseUp = () => { dragging.current = false; };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Controls */}
      <div
        style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 1 }}
        onClick={e => e.stopPropagation()}
      >
        {type === 'image' && (
          <>
            <IconBtn title="Phóng to" onClick={() => setScale(s => Math.min(5, s + 0.4))}><ZoomIn size={18} /></IconBtn>
            <IconBtn title="Thu nhỏ" onClick={() => setScale(s => Math.max(0.3, s - 0.4))}><ZoomOut size={18} /></IconBtn>
            <IconBtn title="Reset" onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}>1:1</IconBtn>
          </>
        )}
        <a href={url} download={name} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <IconBtn title="Tải xuống"><Download size={18} /></IconBtn>
        </a>
        <IconBtn title="Đóng" onClick={onClose}><X size={18} /></IconBtn>
      </div>

      {/* Media */}
      <div
        onClick={e => e.stopPropagation()}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ userSelect: 'none' }}
      >
        {type === 'image' ? (
          <img
            src={url}
            alt={name}
            draggable={false}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 8,
              transform: `translate(${pos.x}px,${pos.y}px) scale(${scale})`,
              transition: dragging.current ? 'none' : 'transform 0.15s ease',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              display: 'block',
            }}
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, display: 'block', outline: 'none' }}
          />
        )}
      </div>

      {/* Filename */}
      {name && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)', fontSize: 13, maxWidth: '80vw',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'rgba(255,255,255,0.15)',
        border: 'none', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 600,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
    >{children}</button>
  );
}

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
  onReply,
  replyingTargetId,
  onJumpToMessage,
  onRead,
  onShowReadDetails,
  onForward,
  conversationType,
  currentUserId,
  onAvatarClick,
  onPin,
  onUnpin,
  isPinned,
  onVote,
  groupMembers = [],
}) => {
  const { t } = useLanguage();
  const observerRef = useRef(null);
  const menuRef = useRef(null);
  const actionButtonRef = useRef(null);

  const [hover, setHover] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState('down');
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [targetLang, setTargetLang] = useState('English');
  const [mediaViewer, setMediaViewer] = useState(null); // { url, type, name }
  const longPressRef = useRef(null);

  const handleTranslate = async (lang = 'Auto') => {
    if (msg.revoked || msg.recalled || msg.type !== 'text') return;
    try {
      setIsTranslating(true);
      setTargetLang(lang);
      const res = await messageApi.translateMessage(msg.content, lang);
      setTranslatedText(res.data.translatedText);
      setOpenMenuId(null);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

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

  // ── Render context tin nhắn đang trả lời ─────────────────────────
  const renderRepliedContext = () => {
    if (!msg.replyToMessageId || msg.revoked || msg.recalled) return null;
    const repliedBy = msg.replyToMessageId.senderId?.displayName || t('chat.default_user');
    let repliedContent = '';
    if (msg.replyToMessageId.revoked) {
      repliedContent = t('chat.message_revoked');
    } else if (msg.replyToMessageId.type === 'text') {
      repliedContent = msg.replyToMessageId.content;
    } else if (msg.replyToMessageId.type === 'poll') {
      const pollTopic = msg.replyToMessageId.payload?.topic || msg.replyToMessageId.content || t('chat.poll', { defaultValue: 'Poll' });
      repliedContent = `${t('bubble.poll', { topic: pollTopic })}`;
    } else if (msg.replyToMessageId.type === 'reminder') {
      const reminderTopic = msg.replyToMessageId.payload?.content || msg.replyToMessageId.content || t('chat.reminder', { defaultValue: 'Reminder' });
      repliedContent = `${t('bubble.reminder', { topic: reminderTopic })}`;
    } else {
      repliedContent = `[${msg.replyToMessageId.type}]`;
    }

    const replyBg = isMine ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.05)';
    const replyBorderColor = isMine ? '#fff' : 'var(--accent)';
    const nameColor = isMine ? '#fff' : 'var(--accent)';
    const textColor = isMine ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)';

    return (
      <div
        onClick={(e) => { e.stopPropagation(); onJumpToMessage && onJumpToMessage(msg.replyToMessageId._id || msg.replyToMessageId.id); }}
        style={{
          background: replyBg,
          borderLeft: `4px solid ${replyBorderColor}`,
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 8,
          fontSize: 13,
          cursor: 'pointer',
          maxWidth: '100%',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isMine ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = replyBg;
        }}
      >
        <div style={{ fontWeight: 700, color: nameColor, marginBottom: 2, fontSize: 13 }}>{repliedBy}</div>
        <div style={{ color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, fontSize: 12 }}>
          {repliedContent}
        </div>
      </div>
    );
  };

  // ── Render Story Reply Context (Outside Bubble) ─────────────────────────
  const renderStoryContext = () => {
    if (msg.payload?.type !== 'story_reply' || msg.revoked || msg.recalled) return null;
    const isVideo = msg.payload.mediaType === 'video';
    const storyHeader = isMine ? t('bubble.you_replied') : t('bubble.replied_to', { name: msg.senderName });

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginBottom: 8,
        alignItems: isMine ? 'flex-end' : 'flex-start'
      }}>
        {/* Header row with reply icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 500
        }}>
          <Reply size={14} style={{ transform: 'scaleX(-1)' }} />
          <span>{storyHeader}</span>
        </div>

        {/* Story Preview Area */}
        <div style={{
          width: 120,
          height: 180,
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          background: '#1a1a1a',
        }}>
          {isVideo ? (
            <video src={msg.payload.mediaUrl} className="w-full h-full object-cover" muted loop />
          ) : (
            <img src={msg.payload.mediaUrl} className="w-full h-full object-cover" alt="Story preview" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </div>
    );
  };
  // ── Hàm render văn bản có kèm Tag (Đã sửa lỗi Click và Màu sắc tàng hình) ──
  // ── Hàm render văn bản có kèm Tag (Đã sửa lỗi Click và Màu sắc tàng hình) ──
  const renderContentWithMentions = (content, members, isMineMsg) => {
    if (!content) return null;

    // 1. Chuẩn hóa danh sách: Xử lý triệt để việc thiếu _id hoặc displayName
    const searchableUsers = [{ id: 'all', displayName: 'all' }, ...members].map(m => ({
      ...m,
      id: m._id || m.id, // Bắt chính xác ID dù API trả về dạng nào
      displayName: m.displayName || m.username || m.name || 'Người dùng'
    }));

    const usersInContent = searchableUsers.filter(user => {
      const tag = user.id === 'all' ? '@all' : `@${user.displayName}`;
      return content.includes(tag);
    });

    if (usersInContent.length === 0) {
      return <span>{content}</span>;
    }

    usersInContent.sort((a, b) => b.displayName.length - a.displayName.length);

    let parts = [{ text: content, isMention: false }];

    usersInContent.forEach(user => {
      const tag = user.id === 'all' ? '@all' : `@${user.displayName}`;
      const newParts = [];

      parts.forEach(part => {
        if (part.isMention) {
          newParts.push(part);
          return;
        }

        const splitText = part.text.split(tag);
        splitText.forEach((textChunk, index) => {
          newParts.push({ text: textChunk, isMention: false });
          if (index < splitText.length - 1) {
            newParts.push({ text: tag, isMention: true, user: user });
          }
        });
      });
      parts = newParts;
    });

    // 2. Xử lý UI: Tránh lỗi "Chữ Xanh trên nền Xanh"
    const tagColor = isMineMsg ? '#ffffff' : '#0084ff';
    const tagBg = isMineMsg ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 132, 255, 0.12)';

    return (
      <>
        {parts.map((part, i) =>
          part.isMention ? (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                // Sử dụng part.user.id đã được chuẩn hóa ở bước 1
                if (part.user.id !== 'all' && onAvatarClick) {
                  onAvatarClick(part.user.id);
                }
              }}
              style={{
                color: tagColor,
                fontWeight: '700',
                cursor: part.user.id === 'all' ? 'default' : 'pointer',
                background: tagBg,
                padding: '2px 5px',
                borderRadius: '6px',
                margin: '0 2px',
                textDecoration: isMineMsg ? 'underline' : 'none', // Thêm gạch chân cho dễ nhìn nếu là tin nhắn của mình
              }}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };
  // ── Render nội dung tin nhắn ───────────────────────────────
  const renderContent = () => {
    if (msg.revoked || msg.recalled) {
      return <span style={{ fontStyle: 'italic', opacity: 0.6 }}>{t('bubble.revoked')}</span>;
    }

    // ── Ảnh ──────────────────────────────────────────────────
    if (msg.type === 'image') {
      const url = msg.payload?.url || msg.content;
      const name = msg.payload?.fileName || 'image';
      return (
        <img
          src={url}
          alt="attachment"
          onClick={() => setMediaViewer({ url, type: 'image', name })}
          style={{
            maxWidth: isMobile ? 220 : 260, maxHeight: 260,
            borderRadius: 10, display: 'block',
            cursor: 'zoom-in', objectFit: 'cover',
          }}
        />
      );
    }

    // ── Voice ─────────────────────────────────────────────────
    if (msg.type === 'voice') {
      return (
        <audio
          controls
          src={msg.payload?.url || msg.content}
          style={{ maxWidth: isMobile ? 220 : 260, display: 'block', height: 36 }}
        />
      );
    }

    // ── Video ─────────────────────────────────────────────────
    if (msg.type === 'video') {
      const url = msg.payload?.url || msg.content;
      const name = msg.payload?.fileName || 'video';
      return (
        <div
          style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
          onClick={() => setMediaViewer({ url, type: 'video', name })}
        >
          <video
            src={url}
            style={{ maxWidth: isMobile ? 220 : 260, maxHeight: 200, borderRadius: 10, display: 'block', backgroundColor: '#000', pointerEvents: 'none' }}
          />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.28)', borderRadius: 10,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid #222', marginLeft: 4 }} />
            </div>
          </div>
        </div>
      );
    }

    // ── File ──────────────────────────────────────────────────
    if (msg.type === 'file') {
      const fileName = msg.payload?.fileName || msg.content || '';
      const fileUrl  = msg.payload?.url || msg.content;

      // Video file → preview player
      if (VIDEO_EXTS.test(fileName)) {
        return (
          <div
            style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
            onClick={() => setMediaViewer({ url: fileUrl, type: 'video', name: fileName })}
          >
            <video
              src={fileUrl}
              style={{ maxWidth: isMobile ? 220 : 260, maxHeight: 200, borderRadius: 10, display: 'block', backgroundColor: '#000', pointerEvents: 'none' }}
            />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.28)', borderRadius: 10,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid #222', marginLeft: 4 }} />
              </div>
            </div>
          </div>
        );
      }

      // Các loại file khác → card phân loại
      const ft = getFileType(fileName);
      const FIcon = ft.icon;
      const ext = (fileName.split('.').pop() || '').toUpperCase();
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      return (
        <a
          href={fileUrl}
          download={fileName}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', display: 'block' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: isMine ? 'rgba(255,255,255,0.12)' : ft.bg,
            border: `1px solid ${isMine ? 'rgba(255,255,255,0.18)' : ft.color + '33'}`,
            borderRadius: 12, padding: '10px 14px',
            minWidth: 200, maxWidth: isMobile ? 220 : 260,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {/* Icon box */}
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: isMine ? 'rgba(255,255,255,0.18)' : ft.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FIcon size={22} color={isMine ? '#fff' : ft.color} strokeWidth={1.7} />
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: isMine ? '#fff' : 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{baseName || fileName}</div>
              <div style={{
                fontSize: 11, marginTop: 2,
                color: isMine ? 'rgba(255,255,255,0.65)' : ft.color,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{ext}</div>
            </div>
            {/* Download arrow */}
            <Download size={16} color={isMine ? 'rgba(255,255,255,0.7)' : ft.color} style={{ flexShrink: 0 }} />
          </div>
        </a>
      );
    }

    if (msg.type === 'poll') {
      return (
        <PollMessage
          message={msg}
          currentUserId={currentUserId}
          onVote={(optionId) => onVote && onVote(msg._id || msg.id, optionId)}
          isPinned={isPinned}
        />
      );
    }
    if (msg.type === 'reminder') {
      return (
        <ReminderMessage
          message={msg}
          isMine={isMine}
          isPinned={isPinned}
        />
      );
    }

    if (msg.payload?.type === 'story_reply') {
      return (
        <div style={{ fontSize: 14, fontWeight: 500, padding: '2px 0' }}>
          {msg.content}
        </div>
      );
    }

    return (
      <>
        <div style={{ position: 'relative' }}>
          {renderContentWithMentions(msg.content, groupMembers, isMine)}
          {isTranslating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, opacity: 0.7, fontSize: 12 }}>
              <Loader2 size={14} className="animate-spin" />
              <span>{t('bubble.translating')}</span>
            </div>
          )}
        </div>

        {translatedText && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(var(--accent-rgb), 0.08)',
            borderRadius: 12,
            fontSize: isMobile ? 14 : 13,
            borderLeft: `3px solid ${isMine ? '#fff' : 'var(--accent)'}`,
            position: 'relative',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                <Languages size={12} />
                <span>{t('bubble.translation_title', { lang: targetLang })}</span>
              </div>
              <XCircle
                size={14}
                style={{ cursor: 'pointer', opacity: 0.6 }}
                onClick={() => setTranslatedText(null)}
              />
            </div>
            <div style={{ color: isMine ? '#fff' : 'var(--text-primary)', fontStyle: 'italic' }}>
              {translatedText}
            </div>
          </div>
        )}
        {msg.edited && (
          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 6, fontStyle: 'italic', fontWeight: 400 }}>
            {t('bubble.edited')}
          </span>
        )}
      </>
    );
  };

  const isBeingRepliedTo = replyingTargetId === (msg._id || msg.id);
  // Duplicate showMenu was here, removed.

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
        transition: 'all 0.3s ease',
        background: isBeingRepliedTo ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent',
        zIndex: showMenu ? 9999 : 1, // Final absolute priority fix
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

        {/* Render Story Context (Outside Bubble) */}
        {renderStoryContext()}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexDirection: isMine ? 'row-reverse' : 'row',
          marginTop: 0,
          zIndex: (msg.payload?.type === 'story_reply' && !msg.revoked && !msg.recalled) ? 2 : 1,
          position: 'relative'
        }}>
          {/* Bubble */}
          {(() => {
            const isMedia = msg.type === 'image' || msg.type === 'video'
              || (msg.type === 'file' && VIDEO_EXTS.test(msg.payload?.fileName || msg.content || ''));
            const isTransparent = msg.type === 'poll' || msg.type === 'reminder' || msg.type === 'file' || isMedia;
            return (
          <div style={{
            background: isTransparent ? 'transparent' : (isMine ? 'var(--bubble-self)' : 'var(--bubble-other)'),
            color: isMine ? '#fff' : 'var(--text-primary)',
            padding: isTransparent ? 0 : (isMobile ? '9px 14px' : '8px 14px'),
            borderRadius: isMedia ? 10 : (isTransparent ? 0 : 20),
            fontSize: isMobile ? 15 : 14, lineHeight: 1.5,
            wordBreak: 'break-word',
            boxShadow: isTransparent ? 'none' : (isBeingRepliedTo ? '0 0 0 2px var(--accent), 0 4px 12px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.12)'),
            maxWidth: '100%',
            transform: isBeingRepliedTo ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease-out',
            position: 'relative',
            marginLeft: (msg.payload?.type === 'story_reply' && !isMine) ? 8 : 0,
            marginRight: (msg.payload?.type === 'story_reply' && isMine) ? 8 : 0,
            marginTop: msg.payload?.type === 'story_reply' ? -25 : 0,
            zIndex: msg.payload?.type === 'story_reply' ? 10 : 1,
            overflow: isMedia ? 'hidden' : 'visible',
          }}>
            {isPinned && msg.type !== 'poll' && msg.type !== 'reminder' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: 4, paddingBottom: 4,
                borderBottom: `1px solid ${(msg.type === 'poll' || !isMine) ? 'var(--border)' : 'rgba(255,255,255,0.2)'}`,
                opacity: 0.9, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                color: (msg.type === 'poll' || msg.type === 'image' || msg.type === 'video' || !isMine) ? 'var(--accent)' : '#fff'
              }}>
                <span>📌</span>
                <span>{t('bubble.pin_title')}</span>
              </div>
            )}
            {renderRepliedContext()}
            {renderContent()}

            {/* Standalone Reaction Trigger (Web Hover) - Smart positioning like Zalo */}
            {hover && !isMobile && !(msg.revoked || msg.recalled || msg.type === 'poll' || msg.type === 'reminder') && (
              <div style={{
                position: 'absolute',
                bottom: -15,
                // Inner corner positioning
                ...(isMine ? { left: -10 } : { right: -10 }),
                display: 'block', // Use block to handle absolute children manually
                zIndex: 10001
              }}>
                <div
                  onClick={(e) => { e.stopPropagation(); setShowEmojiBar(p => !p); }}
                  style={{
                    width: 26, height: 26,
                    background: '#ffffff',
                    border: '1px solid #e1e4e8',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    color: '#8e9297',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#8e9297'; }}
                >
                  <ThumbsUp size={14} />
                </div>

                {/* Emoji bar (desktop hover) - Floating precisely above the button and expanding INWARD */}
                {showEmojiBar && (
                  <div style={{
                    position: 'absolute',
                    bottom: 32, // Floating gap
                    // If my message (right), align bar's right edge to button and expand LEFT
                    // If friend's message (left), align bar's left edge to button and expand RIGHT
                    ...(isMine ? { right: 0 } : { left: 0 }),
                    background: '#ffffff',
                    border: '1px solid #e1e4e8',
                    borderRadius: 30,
                    padding: '5px 14px',
                    display: 'flex',
                    gap: 14,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    animation: 'fadeInUp 0.1s ease',
                    whiteSpace: 'nowrap'
                  }}>
                    {(reactionTypes?.length > 0 ? reactionTypes : [
                      { emoji: '👍' }, { emoji: '❤️' }, { emoji: '😂' },
                      { emoji: '😮' }, { emoji: '😢' }, { emoji: '😡' },
                    ]).map(r => (
                      <span
                        key={r.emoji || r.code}
                        title={r.label}
                        style={{ fontSize: 20, cursor: 'pointer', transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        onClick={() => { onReact(msg, r.emoji); setShowEmojiBar(false); }}
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reactions summary - Synchronized and opposite to Trigger */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && msg.type !== 'poll' && msg.type !== 'reminder' && (
              <div
                onClick={(e) => { e.stopPropagation(); onShowDetails(msg); }}
                style={{
                  position: 'absolute',
                  bottom: -12,
                  // Place opposite to the Reaction Trigger to avoid overlap
                  ...(isMine ? { right: -10 } : { left: -10 }),
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#fff', border: '1px solid #e1e4e8', borderRadius: 12,
                  padding: '2px 8px', fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)', zIndex: 2, userSelect: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
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
          </div>
          );
          })()}

          {/* Desktop hover actions (Zalo Style) */}
          {hover && !isMobile && !showEmojiBar && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: '#ffffff', border: '1px solid #e1e4e8',
              borderRadius: 20, padding: '2px 4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              position: 'relative', zIndex: 10
            }}>
              {[
                ...(!(msg.revoked || msg.recalled) ? [
                  { content: <Quote size={13} />, title: t('bubble.reply'), onClick: () => onReply(msg) },
                  ...(msg.type !== 'poll' && msg.type !== 'reminder' ? [{ content: <CornerUpRight size={13} />, title: t('bubble.forward'), onClick: () => onForward(msg) }] : []),
                ] : []),
                {
                  content: <MoreHorizontal size={14} />, title: t('bubble.more'),
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
                right: isMine ? -10 : 'auto', left: isMine ? 'auto' : -10,
                background: '#fff', borderRadius: 10,
                boxShadow: menuPlacement === 'up' ? '0 -4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.15)',
                padding: '6px 0', zIndex: 10001, minWidth: 180, border: '1px solid #eee',
              }}
            >
              {isMine && msg.type !== 'poll' && msg.type !== 'reminder' && (
                <div onClick={() => { onRecall(msg); setOpenMenuId(null); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#ed4245', fontWeight: 600 }}>
                  ↩️ {t('bubble.recall')}
                </div>
              )}

              {msg.type !== 'poll' && msg.type !== 'reminder' && (
                <div onClick={() => { onDelete(msg); setOpenMenuId(null); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#ed4245' }}>
                  🗑️ {t('bubble.delete')}
                </div>
              )}
              {isMine && msg.type !== 'poll' && msg.type !== 'reminder' && (
                <div onClick={() => { onEdit(msg); setOpenMenuId(null); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#000' }}>
                  ✏️ {t('bubble.edit')}
                </div>
              )}
              {!(msg.revoked || msg.recalled) && (
                <div
                  onClick={() => { isPinned ? onUnpin(msg._id || msg.id) : onPin(msg._id || msg.id); setOpenMenuId(null); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#000',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}
                >
                   <span style={{ width: 18, textAlign: 'center' }}>📌</span>
                  <span>{isPinned ? t('bubble.unpin') : t('bubble.pin')}</span>
                </div>
              )}

              {msg.type === 'text' && !(msg.revoked || msg.recalled) && (
                <>
                  <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
                  <div onClick={() => handleTranslate('Auto')}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#000', display: 'flex', alignItems: 'center', gap: 10 }}>
                   <Globe size={16} style={{ color: 'var(--accent)' }} />
                    <span>{t('bubble.translate')}</span>
                  </div>
                  <div onClick={() => setShowLangModal(true)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Languages size={16} />
                    <span style={{ fontSize: 12 }}>{t('bubble.translate_more')}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>


        {/* Đã xem / Đã gửi */}
        {isMine && (
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            {msg.blocked ? (
             <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{t('bubble.blocked_by')}</span>
            ) : conversationType === 'dm' ? (
              msg.readBy && msg.readBy.length > 0
                ? <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{t('bubble.read')}</span>
                : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('bubble.sent')}</span>
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
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('bubble.sent')}</span>
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
            {msg.type !== 'poll' && (
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
            )}
            {[
              { icon: <Reply size={20} />, label: t('bubble.reply'), onClick: () => { onReply(msg); setShowActions(false); }, show: true },
              { icon: <CornerUpRight size={20} />, label: t('bubble.forward'), onClick: () => { onForward(msg); setShowActions(false); }, show: msg.type !== 'poll' },
              { icon: <Copy size={20} />, label: t('common.copy'), show: msg.type === 'text' },
              {
                icon: <Pin size={20} />,
                label: isPinned ? t('bubble.unpin') : t('bubble.pin'),
                onClick: () => { isPinned ? onUnpin(msg._id || msg.id) : onPin(msg._id || msg.id); setShowActions(false); },
                show: true
              },
              {
                icon: <Globe size={20} />,
                label: t('bubble.translate'),
                onClick: () => { handleTranslate('Auto'); setShowActions(false); },
                show: msg.type === 'text' && !(msg.revoked || msg.recalled)
              },
              {
                icon: <Languages size={20} />,
                label: t('bubble.translate_more'),
                onClick: () => { setShowLangModal(true); setShowActions(false); },
                show: msg.type === 'text' && !(msg.revoked || msg.recalled)
              },
              { icon: <Trash2 size={20} />, label: t('bubble.delete'), danger: true, onClick: () => { onDelete(msg); setShowActions(false); }, show: msg.type !== 'poll' },
            ].filter(a => a.show).map(action => (
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
      <LanguageSelectorModal
        isOpen={showLangModal}
        onClose={() => setShowLangModal(false)}
        onSelect={(lang) => handleTranslate(lang)}
      />

      {/* Media lightbox */}
      {mediaViewer && (
        <MediaViewer
          url={mediaViewer.url}
          type={mediaViewer.type}
          name={mediaViewer.name}
          onClose={() => setMediaViewer(null)}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MessageBubble;