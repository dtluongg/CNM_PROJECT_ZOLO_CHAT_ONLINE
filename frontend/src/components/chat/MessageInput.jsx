import React, { useState, useRef } from 'react';

const EMOJIS = ['😀','😂','❤️','👍','🔥','😍','🥺','😭','✨','🎉','😊','🙏','💯','😎','🤔','😅','🥰','😢','😡','👏'];

export default function MessageInput({ onSend, placeholder }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ padding: '0 16px 16px', position: 'relative' }}>
      {/* Emoji picker */}
      {showEmoji && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 16,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 8, display: 'flex', flexWrap: 'wrap',
          gap: 4, width: 240, zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 20, padding: 4, borderRadius: 4,
              }}
              onMouseEnter={ev => ev.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={ev => ev.target.style.background = 'none'}
            >{e}</button>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--input-bg)', borderRadius: 8,
        padding: '8px 12px', border: '1px solid transparent',
        transition: 'border-color 0.15s',
      }}
        onFocus={() => {}}
      >
        {/* Attach */}
        <button
          title="Đính kèm file"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: 2, flexShrink: 0 }}
        >📎</button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Nhắn tin...'}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 15, resize: 'none',
            lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            fontFamily: 'inherit',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />

        {/* Emoji */}
        <button
          onClick={() => setShowEmoji(v => !v)}
          title="Emoji"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: 20, padding: 2, flexShrink: 0,
          }}
        >😊</button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          title="Gửi"
          style={{
            background: text.trim() ? 'var(--accent)' : 'var(--bg-hover)',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            color: text.trim() ? '#fff' : 'var(--text-muted)',
            borderRadius: 6, padding: '6px 10px', fontSize: 16,
            transition: 'background 0.15s, color 0.15s', flexShrink: 0,
          }}
        >➤</button>
      </div>
    </div>
  );
}
