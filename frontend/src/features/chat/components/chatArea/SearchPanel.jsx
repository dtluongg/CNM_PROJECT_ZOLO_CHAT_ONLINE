import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * SearchPanel — text-based message search within the loaded message list.
 * Highlights matches and lets user jump to each result.
 */
export default function SearchPanel({ messages = [], onJumpToMessage, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setCursor(0); return; }
    const matched = messages
      .filter(m => m.type !== 'system' && typeof m.content === 'string' && m.content.toLowerCase().includes(q))
      .map(m => ({ id: m._id || m.id, content: m.content, senderName: m.senderName || m.sender?.displayName || '', time: m.time || '' }))
      .reverse(); // newest last → natural reading order
    setResults(matched);
    setCursor(0);
  }, [query, messages]);

  const jumpTo = useCallback((idx) => {
    if (!results[idx]) return;
    setCursor(idx);
    onJumpToMessage(results[idx].id);
  }, [results, onJumpToMessage]);

  useEffect(() => {
    if (results.length > 0) jumpTo(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const handleKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      jumpTo((cursor + 1) % results.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      jumpTo((cursor - 1 + results.length) % results.length);
    }
  };

  const highlight = (text, q) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#fbbf24', color: '#000', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 320, zIndex: 200,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
      animation: 'slideInRight 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Tìm kiếm tin nhắn</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập từ khóa..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 32px 8px 32px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 8, outline: 'none',
              color: 'var(--text-primary)', fontSize: 13,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Nav controls */}
        {results.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {cursor + 1} / {results.length} kết quả
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => jumpTo((cursor - 1 + results.length) % results.length)}
                title="Trước (↑)"
                style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 5, padding: '3px 7px', display: 'flex' }}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => jumpTo((cursor + 1) % results.length)}
                title="Tiếp (↓)"
                style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 5, padding: '3px 7px', display: 'flex' }}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results list */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {query && results.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Không tìm thấy tin nhắn nào
          </div>
        )}
        {!query && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nhập từ khóa để tìm kiếm trong đoạn hội thoại này
          </div>
        )}
        {results.map((r, idx) => (
          <div
            key={r.id}
            onClick={() => jumpTo(idx)}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              background: idx === cursor ? 'var(--bg-hover)' : 'transparent',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (idx !== cursor) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (idx !== cursor) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{r.senderName}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.time?.split(' ')[1] || r.time}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {highlight(r.content, query.trim())}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}