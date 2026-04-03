import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, Send } from 'lucide-react';

const EMOJIS = [
  '😀', '😂', '😍', '🥺', '😭', '😊', '😎', '🤔',
  '😅', '🥰', '😢', '😡', '😴', '🤗', '😏', '🙄',
  '❤️', '🔥', '✨', '🎉', '👍', '👏', '🙏', '💯',
  '🤣', '😘', '🥳', '😇', '🤩', '😤', '😬', '🫡',
];

export default function MessageInput({ onSend, placeholder }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmoji) return;
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
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
      setText((prev) => prev + emoji);
    }
    setShowEmoji(false);
  };

  const canSend = text.trim().length > 0;

  return (
    <div style={{ padding: '0 16px 14px', flexShrink: 0, position: 'relative' }}>
      {/* Emoji Picker */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% - 4px)',
            left: 16,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 3,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            width: 288,
          }}
        >
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: 6,
            paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Biểu tượng cảm xúc
          </div>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                padding: '5px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                transition: 'background 0.1s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          background: 'var(--input-bg)',
          borderRadius: 10,
          padding: '8px 10px',
          border: `1.5px solid ${focused ? 'var(--accent)' : 'transparent'}`,
          transition: 'border-color 0.15s',
        }}
      >
        {/* Attach */}
        <button
          title="Đính kèm file"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '2px 4px',
            borderRadius: 6,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s',
            marginBottom: 3,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Paperclip size={18} />
        </button>

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
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 15,
            resize: 'none',
            lineHeight: 1.5,
            maxHeight: 128,
            overflow: 'auto',
            fontFamily: 'inherit',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--bg-hover) transparent',
          }}
        />

        {/* Emoji */}
        <button
          onClick={() => setShowEmoji((v) => !v)}
          title="Biểu tượng cảm xúc"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
            padding: '2px 4px',
            borderRadius: 6,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s',
            marginBottom: 3,
          }}
          onMouseEnter={(e) => {
            if (!showEmoji) e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            if (!showEmoji) e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Smile size={18} />
        </button>

        {/* Voice (no text) or Send (has text) */}
        {!canSend ? (
          <button
            title="Ghi âm"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '2px 4px',
              borderRadius: 6,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              marginBottom: 3,
              transition: 'color 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Mic size={18} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            title="Gửi (Enter)"
            style={{
              background: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              borderRadius: 8,
              padding: '7px 12px',
              flexShrink: 0,
              transition: 'background 0.12s, transform 0.1s',
              marginBottom: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
