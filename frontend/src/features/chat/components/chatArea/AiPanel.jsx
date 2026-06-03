/**
 * AiPanel.jsx — AI Trợ lý thông minh
 *
 * Tích hợp 3 tính năng trong 1 panel slide-in:
 *   1. Phân tích hội thoại  — summary + tone + keyPoints + tasks + reminders
 *   2. Gợi ý trả lời        — cá nhân hóa theo văn phong người dùng
 *   3. Tìm kiếm ngữ nghĩa   — tìm theo ý nghĩa, không cần từ khóa chính xác
 *
 * Cache per-conversationId trong memory để tránh gọi AI lặp lại.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Brain, MessageSquareReply, Search,
  Loader2, AlertCircle, RefreshCw, CheckSquare, Bell,
  Zap, AlertTriangle, Info, ChevronRight, Clock, Smile,
  SlidersHorizontal, User, Hash, MessageCircle,
} from 'lucide-react';
import messageApi from '../../api/messageApi';
import AiLogo from './ui/AiLogo';

// ─── Lưu lịch sử AI panel (localStorage, per-conversation) ──────────────────────
const AI_HISTORY_PREFIX = 'ai_panel_history:';
const AI_HISTORY_TTL    = 24 * 60 * 60 * 1000; // 24 giờ

function loadAiHistory(conversationId) {
  if (!conversationId) return {};
  try {
    const raw = localStorage.getItem(AI_HISTORY_PREFIX + conversationId);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.savedAt && Date.now() - parsed.savedAt > AI_HISTORY_TTL) {
      localStorage.removeItem(AI_HISTORY_PREFIX + conversationId);
      return {};
    }
    return parsed.cache || {};
  } catch {
    return {};
  }
}

function saveAiHistory(conversationId, cache) {
  if (!conversationId) return;
  try {
    if (!cache || Object.keys(cache).length === 0) {
      localStorage.removeItem(AI_HISTORY_PREFIX + conversationId);
      return;
    }
    localStorage.setItem(AI_HISTORY_PREFIX + conversationId, JSON.stringify({ savedAt: Date.now(), cache }));
  } catch {
    /* bỏ qua nếu vượt quota */
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TONE_CFG = {
  normal:    { label: 'Bình thường',  color: '#57a9fb', bg: 'rgba(87,169,251,0.1)',   icon: <Info size={12} /> },
  casual:    { label: 'Thân mật',     color: '#3ba55c', bg: 'rgba(59,165,92,0.1)',    icon: <Smile size={12} /> },
  important: { label: 'Quan trọng',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: <Bell size={12} /> },
  urgent:    { label: 'Khẩn cấp',     color: '#faa61a', bg: 'rgba(250,166,26,0.1)',   icon: <Zap size={12} /> },
  conflict:  { label: 'Căng thẳng',   color: '#ed4245', bg: 'rgba(237,66,69,0.1)',    icon: <AlertTriangle size={12} /> },
};

const REPLY_TYPE_LABEL = {
  direct:   { label: 'Thẳng thắn', color: '#57a9fb' },
  question: { label: 'Hỏi lại',    color: '#faa61a' },
  soft:     { label: 'Lịch sự',    color: '#3ba55c' },
};

const STYLE_LABEL = {
  casual:   'Thân mật',
  formal:   'Trang trọng',
  friendly: 'Vui vẻ',
};

const MSG_COUNT_OPTIONS = [10, 20, 30];

// ─── Reusable small components ────────────────────────────────────────────────
function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: '7px 4px', border: 'none', borderRadius: 7, cursor: 'pointer',
      fontSize: 12, fontWeight: 600, position: 'relative',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'var(--text-muted)',
      transition: 'background 0.15s, color 0.15s',
    }}>
      {icon}{label}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 3, right: 3,
          width: 14, height: 14, borderRadius: '50%', fontSize: 9, fontWeight: 800,
          background: '#ed4245', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

function Spinner({ text = 'AI đang xử lý…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0', color: 'var(--text-muted)' }}>
      <div style={{ position: 'relative' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa' }} />
      </div>
      <span style={{ fontSize: 12, fontStyle: 'italic' }}>{text}</span>
    </div>
  );
}

function ErrBox({ msg, onRetry, waitSeconds }) {
  const [countdown, setCountdown] = useState(waitSeconds || 0);
  useEffect(() => {
    if (!countdown) return;
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [waitSeconds]);

  return (
    <div style={{
      margin: '10px 0', padding: '10px 14px', borderRadius: 8,
      background: 'rgba(237,66,69,0.07)', border: '1px solid rgba(237,66,69,0.2)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <AlertCircle size={14} color="#ed4245" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, color: '#ed4245' }}>{msg}</span>
        {countdown > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>Thử lại sau {countdown}s</span>}
      </div>
      {onRetry && countdown === 0 && (
        <button onClick={onRetry} style={{
          background: 'none', border: '1px solid rgba(237,66,69,0.4)', borderRadius: 5,
          padding: '3px 8px', cursor: 'pointer', color: '#ed4245', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          Thử lại
        </button>
      )}
    </div>
  );
}

function Section({ title, icon, children, badge }) {
  return (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 9, padding: '10px 12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {icon}{title}
        </div>
        {badge && <span style={{ fontSize: 10, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Tab 1: Phân tích ─────────────────────────────────────────────────────────
function AnalyzeTab({ conversationId, conversationName, conversationType, cache, setCache, onCreateReminder }) {
  const cacheKey = conversationId;
  const cached   = cache[cacheKey];

  const [status, setStatus]       = useState(cached ? 'done' : 'idle');
  const [data, setData]           = useState(cached || null);
  const [errMsg, setErrMsg]       = useState('');
  const [waitSec, setWaitSec]     = useState(0);
  const [msgCount, setMsgCount]   = useState(20);
  const [created, setCreated]     = useState(new Set());

  const run = useCallback(async (count = msgCount) => {
    setStatus('loading');
    setErrMsg('');
    setWaitSec(0);
    try {
      const res = await messageApi.analyzeChat(conversationId, conversationName, conversationType, count);
      const d = res.data;
      setData(d);
      setCache(prev => ({ ...prev, [cacheKey]: d }));
      setStatus('done');
    } catch (err) {
      const d = err.response?.data;
      setErrMsg(d?.message || 'Không thể phân tích, vui lòng thử lại');
      setWaitSec(d?.waitSeconds || 0);
      setStatus('error');
    }
  }, [conversationId, conversationName, conversationType, msgCount, cacheKey, setCache]);

  const handleCreate = async (rem, i) => {
    try {
      await onCreateReminder(rem);
      setCreated(prev => new Set([...prev, i]));
    } catch { /* ignore */ }
  };

  const tone = data?.tone ? (TONE_CFG[data.tone] || TONE_CFG.normal) : null;

  if (status === 'loading') return <Spinner text="Đang phân tích hội thoại…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
          <SlidersHorizontal size={12} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phân tích</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {MSG_COUNT_OPTIONS.map(n => (
              <button key={n} onClick={() => setMsgCount(n)} style={{
                padding: '2px 7px', borderRadius: 5, border: '1px solid',
                borderColor: msgCount === n ? 'var(--accent)' : 'var(--border)',
                background: msgCount === n ? 'var(--accent)' : 'transparent',
                color: msgCount === n ? '#fff' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{n}</button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>tin</span>
        </div>
        <button onClick={() => run(msgCount)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff',
          border: 'none', borderRadius: 7, padding: '6px 12px',
          cursor: 'pointer', fontSize: 12, fontWeight: 700,
        }}>
          {status === 'done' ? <><RefreshCw size={12} />Làm mới</> : <><AiLogo size={13} />Phân tích</>}
        </button>
      </div>

      {status === 'error' && <ErrBox msg={errMsg} waitSeconds={waitSec} onRetry={() => run(msgCount)} />}

      {status === 'done' && data && (
        <>
          {/* Tone */}
          {tone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: tone.bg,
              }}>
                <span style={{ color: tone.color, display: 'flex' }}>{tone.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: tone.color }}>{tone.label}</span>
              </div>
              {data.toneReason && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {data.toneReason}
                </span>
              )}
              {data.messageCount && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {data.messageCount} tin
                </span>
              )}
            </div>
          )}

          {/* Summary */}
          <Section title="Tóm tắt" icon={<Brain size={12} />}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
              {data.summary}
            </p>
          </Section>

          {/* Key Points */}
          {data.keyPoints?.length > 0 && (
            <Section title="Điểm chính" icon={<Hash size={12} />} badge={data.keyPoints.length}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.keyPoints.map((pt, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>·</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Tasks */}
          {data.tasks?.length > 0 && (
            <Section title="Việc cần làm" icon={<CheckSquare size={12} />} badge={data.tasks.length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.tasks.map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <ChevronRight size={13} style={{ color: '#57a9fb', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.content}</span>
                      {task.assignee && (
                        <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 5 }}>@{task.assignee}</span>
                      )}
                      {task.deadline && (
                        <span style={{ fontSize: 11, color: '#faa61a', marginLeft: 5 }}>⏰ {task.deadline}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Reminders */}
          {data.reminders?.length > 0 && (
            <Section title="Nhắc hẹn phát hiện" icon={<Bell size={12} />} badge={data.reminders.length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.reminders.map((rem, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', borderRadius: 7,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <Clock size={13} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{rem.title}</div>
                      {rem.datetimeHint && (
                        <div style={{ fontSize: 11, color: '#faa61a', marginTop: 1 }}>🕐 {rem.datetimeHint}</div>
                      )}
                      {rem.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{rem.description}</div>
                      )}
                    </div>
                    {created.has(i) ? (
                      <span style={{ fontSize: 11, color: '#3ba55c', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>✓ Đã tạo</span>
                    ) : (
                      <button onClick={() => handleCreate(rem, i)} style={{
                        background: 'var(--accent)', color: '#fff',
                        border: 'none', borderRadius: 5,
                        padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        Tạo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Empty state */}
          {!data.tasks?.length && !data.reminders?.length && !data.keyPoints?.length && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0, padding: '4px 0' }}>
              Không phát hiện tasks hay nhắc hẹn cụ thể.
            </p>
          )}
        </>
      )}

      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Chọn số tin nhắn muốn phân tích rồi nhấn <strong>Phân tích</strong>.
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Gợi ý trả lời ────────────────────────────────────────────────────
function SmartReplyTab({ conversationId, currentUser, cache, setCache, onSelectReply }) {
  const cacheKey = `reply:${conversationId}`;
  const cached   = cache[cacheKey];

  const [status, setStatus]   = useState(cached ? 'done' : 'idle');
  const [data, setData]       = useState(cached || null);
  const [errMsg, setErrMsg]   = useState('');
  const [waitSec, setWaitSec] = useState(0);

  const run = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    setWaitSec(0);
    try {
      const res = await messageApi.getSmartReplies(conversationId, currentUser?.displayName || '');
      const d = res.data;
      setData(d);
      setCache(prev => ({ ...prev, [cacheKey]: d }));
      setStatus('done');
    } catch (err) {
      const d = err.response?.data;
      setErrMsg(d?.message || 'Không thể gợi ý, vui lòng thử lại');
      setWaitSec(d?.waitSeconds || 0);
      setStatus('error');
    }
  }, [conversationId, currentUser, cacheKey, setCache]);

  const styleProfile = data?.styleProfile || {};
  const replies      = data?.replies || [];
  const lastFromMe   = !!data?.lastFromMe;

  if (status === 'loading') return <Spinner text="Đang phân tích văn phong của bạn…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <User size={12} />
          <span>AI học theo văn phong của <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.displayName || 'bạn'}</strong></span>
        </div>
        <button onClick={run} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff',
          border: 'none', borderRadius: 7, padding: '6px 12px',
          cursor: 'pointer', fontSize: 12, fontWeight: 700,
        }}>
          {status === 'done' ? <><RefreshCw size={12} />Làm mới</> : <><MessageSquareReply size={12} />Gợi ý</>}
        </button>
      </div>

      {status === 'error' && <ErrBox msg={errMsg} waitSeconds={waitSec} onRetry={run} />}

      {/* Cảnh báo: tin nhắn cuối là của chính bạn → đây là gợi ý trả lời cho tin gần nhất của đối phương */}
      {status === 'done' && lastFromMe && replies.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 7,
          padding: '7px 10px', borderRadius: 7,
          background: 'rgba(250,166,26,0.08)', border: '1px solid rgba(250,166,26,0.25)',
        }}>
          <Info size={13} color="#faa61a" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Bạn là người nhắn cuối. Đây là gợi ý trả lời cho tin nhắn <strong>gần nhất của đối phương</strong>.
          </span>
        </div>
      )}

      {/* Style profile badge */}
      {status === 'done' && styleProfile.tone && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {styleProfile.tone && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontWeight: 600 }}>
              {STYLE_LABEL[styleProfile.tone] || styleProfile.tone}
            </span>
          )}
          {styleProfile.avgLength && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(87,169,251,0.1)', color: '#57a9fb', fontWeight: 600 }}>
              {styleProfile.avgLength === 'short' ? 'Ngắn gọn' : styleProfile.avgLength === 'long' ? 'Chi tiết' : 'Vừa phải'}
            </span>
          )}
          {styleProfile.usesEmoji && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(59,165,92,0.1)', color: '#3ba55c', fontWeight: 600 }}>
              😄 Hay dùng emoji
            </span>
          )}
        </div>
      )}

      {/* Reply suggestions */}
      {status === 'done' && replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Nhấn để điền vào ô chat:</p>
          {replies.map((r, i) => {
            const typeInfo = REPLY_TYPE_LABEL[r.type] || REPLY_TYPE_LABEL.direct;
            return (
              <button key={i} onClick={() => onSelectReply(r.text || r)} style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', cursor: 'pointer',
                transition: 'background 0.12s, border-color 0.12s',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.07)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 13, lineHeight: 1.55 }}>{r.text || r}</span>
                  {r.type && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, flexShrink: 0,
                      background: `${typeInfo.color}18`, color: typeInfo.color,
                    }}>
                      {typeInfo.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {status === 'done' && replies.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
          Không có gợi ý phù hợp cho ngữ cảnh này.
        </p>
      )}

      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
          AI sẽ phân tích văn phong của bạn trong cuộc trò chuyện này và gợi ý 3 câu trả lời phù hợp nhất.
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Tìm kiếm ngữ nghĩa ───────────────────────────────────────────────
function SemanticSearchTab({ conversationId, onJumpToMessage }) {
  const [query, setQuery]     = useState('');
  const [status, setStatus]   = useState('idle');
  const [results, setResults] = useState([]);
  const [errMsg, setErrMsg]   = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const run = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setStatus('loading');
    setResults([]);
    setErrMsg('');
    setLastQuery(q);
    try {
      const res = await messageApi.semanticSearch(conversationId, q);
      setResults(res.data?.matched || []);
      setStatus('done');
    } catch (err) {
      setErrMsg(err.response?.data?.message || 'Không thể tìm kiếm, vui lòng thử lại');
      setStatus('error');
    }
  }, [conversationId, query]);

  const suggestions = [
    'thảo luận về deadline',
    'ai cần làm gì',
    'hẹn gặp/meeting',
    'vấn đề cần giải quyết',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Tìm theo ý nghĩa — không cần nhớ từ chính xác.
      </p>

      {/* Search input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="Ví dụ: bàn về kế hoạch tuần tới…"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 13,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#a78bfa'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <button onClick={run}
          disabled={status === 'loading' || query.trim().length < 2}
          style={{
            padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: query.trim().length >= 2 ? 'var(--accent)' : 'var(--bg-hover)',
            color: query.trim().length >= 2 ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', transition: 'background 0.15s',
          }}>
          {status === 'loading'
            ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <Search size={14} />
          }
        </button>
      </div>

      {/* Quick suggestions */}
      {status === 'idle' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setQuery(s); }} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 20,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'pointer',
              transition: 'border-color 0.12s, color 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.color = '#a78bfa'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {status === 'loading' && <Spinner text="AI đang tìm kiếm…" />}
      {status === 'error' && <ErrBox msg={errMsg} onRetry={run} />}

      {status === 'done' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {results.length > 0
              ? `${results.length} kết quả cho "${lastQuery}"`
              : `Không tìm thấy kết quả cho "${lastQuery}"`
            }
          </div>
          {results.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              Thử diễn đạt bằng cách khác.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map(msg => (
              <button key={msg._id} onClick={() => onJumpToMessage?.(msg._id)} style={{
                textAlign: 'left', padding: '9px 12px', borderRadius: 8,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', cursor: 'pointer',
                transition: 'background 0.12s',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{msg.senderName}</span>
                  {msg.createdAt && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(msg.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {msg.content}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main AiPanel ─────────────────────────────────────────────────────────────
export default function AiPanel({
  conversationId, conversationName, conversationType = 'dm',
  currentUser, onClose, onSelectReply, onCreateReminder, onJumpToMessage,
}) {
  const [tab, setTab]     = useState('analyze');
  // Cache per conversationId — nạp lịch sử đã lưu từ localStorage (lưu qua reload & đổi chat)
  const [cache, setCache] = useState(() => loadAiHistory(conversationId));

  // Nạp lại lịch sử khi đổi conversation
  const prevConvId = useRef(conversationId);
  useEffect(() => {
    if (prevConvId.current !== conversationId) {
      prevConvId.current = conversationId;
      setCache(loadAiHistory(conversationId));
    }
  }, [conversationId]);

  // Lưu lịch sử mỗi khi cache thay đổi
  useEffect(() => {
    saveAiHistory(conversationId, cache);
  }, [conversationId, cache]);

  const [historyVersion, setHistoryVersion] = useState(0);
  const hasHistory = Object.keys(cache).length > 0;
  const clearHistory = useCallback(() => {
    setCache({});
    saveAiHistory(conversationId, {});
    setHistoryVersion(v => v + 1); // buộc các tab remount để reset hiển thị
  }, [conversationId]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // Badge: số tasks/reminders trong cache analyze
  const analyzeCached = cache[conversationId];
  const badge = useMemo(() => {
    if (!analyzeCached) return 0;
    return (analyzeCached.tasks?.length || 0) + (analyzeCached.reminders?.length || 0);
  }, [analyzeCached]);

  const tabs = [
    { id: 'analyze', label: 'Phân tích', icon: <Brain size={13} />, badge },
    { id: 'reply',   label: 'Gợi ý',     icon: <MessageSquareReply size={13} /> },
    { id: 'search',  label: 'Tìm kiếm',  icon: <Search size={13} /> },
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes aiPanelIn { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 330, zIndex: 200,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 24px rgba(0,0,0,0.18)',
        animation: 'aiPanelIn 0.18s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '11px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(167,139,250,0.03))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AiLogo size={28} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>AI Trợ lý</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>
                {conversationName ? `"${conversationName}"` : 'Cuộc trò chuyện này'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 5, borderRadius: 6,
            display: 'flex', transition: 'color 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '7px 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-tertiary)', flexShrink: 0,
        }}>
          {tabs.map(t => (
            <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}
              icon={t.icon} label={t.label} badge={t.badge} />
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {tab === 'analyze' && (
            <AnalyzeTab
              key={`analyze-${conversationId}-${historyVersion}`}
              conversationId={conversationId}
              conversationName={conversationName}
              conversationType={conversationType}
              cache={cache}
              setCache={setCache}
              onCreateReminder={onCreateReminder}
            />
          )}
          {tab === 'reply' && (
            <SmartReplyTab
              key={`reply-${conversationId}-${historyVersion}`}
              conversationId={conversationId}
              currentUser={currentUser}
              cache={cache}
              setCache={setCache}
              onSelectReply={onSelectReply}
            />
          )}
          {tab === 'search' && (
            <SemanticSearchTab
              conversationId={conversationId}
              onJumpToMessage={onJumpToMessage}
            />
          )}
        </div>

        {/* Footer note */}
        <div style={{
          padding: '6px 14px', borderTop: '1px solid var(--border)',
          fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>{hasHistory ? 'Đã lưu lịch sử cho chat này' : 'Lịch sử lưu tự động · Gemma 3n'}</span>
          {hasHistory && (
            <button onClick={clearHistory} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 3, padding: '2px 4px', borderRadius: 4,
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#ed4245'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={11} /> Xóa lịch sử
            </button>
          )}
        </div>
      </div>
    </>
  );
}