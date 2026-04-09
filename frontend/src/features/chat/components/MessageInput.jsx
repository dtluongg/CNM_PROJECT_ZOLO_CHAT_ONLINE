import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, Send, Image } from 'lucide-react';

const EMOJIS = [
  '😀','😂','😍','🥺','😭','😊','😎','🤔',
  '😅','🥰','😢','😡','😴','🤗','😏','🙄',
  '❤️','🔥','✨','🎉','👍','👏','🙏','💯',
  '🤣','😘','🥳','😇','🤩','😤','😬','🫡',
];

export default function MessageInput({ onSend, placeholder, isMobile }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    if (!showEmoji) return;
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showEmoji]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmoji(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, isMobile ? 100 : 128) + 'px';
  };

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(prev => prev + emoji);
    }
    setShowEmoji(false);
  };

  const canSend = text.trim().length > 0;

  return (
    <div style={{
      padding: isMobile ? '8px 10px' : '0 16px 14px',
      paddingBottom: isMobile
        ? 'calc(8px + env(safe-area-inset-bottom, 0px))'
        : '14px',
      flexShrink: 0, position: 'relative',
      background: isMobile ? 'var(--bg-secondary)' : 'transparent',
      borderTop: isMobile ? '1px solid var(--border)' : 'none',
    }}>
      {/* Emoji Picker */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: isMobile ? 10 : 16,
            right: isMobile ? 10 : 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 12,
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(8, 1fr)' : 'repeat(8, 1fr)',
            gap: isMobile ? 4 : 3,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            width: isMobile ? 'auto' : 288,
            animation: 'fadeInUp 0.15s ease',
          }}
        >
          <div style={{
            gridColumn: '1 / -1', fontSize: 11, fontWeight: 700,
            color: 'var(--text-muted)', marginBottom: 6, paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Biểu tượng cảm xúc
          </div>
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => insertEmoji(emoji)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 22 : 20, padding: isMobile ? '6px' : '5px',
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, transition: 'transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(1.25)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: isMobile ? 4 : 6,
        background: 'var(--input-bg)',
        borderRadius: isMobile ? 24 : 10,
        padding: isMobile ? '6px 6px 6px 14px' : '8px 10px',
        border: `1.5px solid ${focused ? 'var(--accent)' : 'transparent'}`,
        transition: 'border-color 0.15s',
        boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
      }}>
        {/* Attach - desktop only or mobile compact */}
        {!isMobile && (
          <button title="Đính kèm file"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.12s', marginBottom: 3 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Paperclip size={18} />
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || 'Nhắn tin...'}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: isMobile ? 16 : 15,
            resize: 'none', lineHeight: 1.5,
            maxHeight: isMobile ? 100 : 128,
            overflow: 'auto', fontFamily: 'inherit',
            scrollbarWidth: 'thin',
            padding: isMobile ? '4px 0' : 0,
          }}
        />

        {/* Emoji */}
        <button onClick={() => setShowEmoji(v => !v)} title="Biểu tượng cảm xúc"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
            padding: '2px 4px', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center',
            transition: 'color 0.12s', marginBottom: isMobile ? 0 : 3,
            minWidth: 32, minHeight: 32, justifyContent: 'center',
          }}
        >
          <Smile size={isMobile ? 20 : 18} />
        </button>

        {/* Mobile attach */}
        {isMobile && !canSend && (
          <button title="Đính kèm ảnh"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6,
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 32, minHeight: 32,
            }}
          >
            <Image size={20} />
          </button>
        )}

        {/* Send / Mic */}
        {!canSend ? (
          !isMobile && (
            <button title="Ghi âm"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', marginBottom: 3, transition: 'color 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Mic size={18} />
            </button>
          )
        ) : (
          <button onClick={handleSend} title="Gửi"
            style={{
              background: 'var(--accent)', border: 'none', cursor: 'pointer',
              color: '#fff',
              borderRadius: isMobile ? '50%' : 8,
              width: isMobile ? 36 : 'auto',
              height: isMobile ? 36 : 'auto',
              padding: isMobile ? 0 : '7px 12px',
              flexShrink: 0, transition: 'background 0.12s, transform 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Send size={isMobile ? 17 : 15} />
          </button>
        )}
      </div>
    </div>
  );
}
