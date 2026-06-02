import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import messageApi from '../../../api/messageApi';
import { useLanguage } from '../../../../../context/LanguageContext';

// ── DividerLine khai báo NGOÀI component để tránh "Cannot create during render" ──
function DividerLine({ onClick, clickable, t }) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        margin:     '8px 16px',
        cursor:     clickable ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700,
        color: '#a78bfa',
        letterSpacing: '0.4px', whiteSpace: 'nowrap',
        padding: '2px 6px', borderRadius: 4,
        border: clickable ? '1px solid rgba(167,139,250,0.3)' : 'none',
        transition: 'background 0.12s',
      }}>
        <Sparkles size={12} style={{ color: '#a78bfa' }} />
        {clickable ? t('ai_summary.btn_summarize') : t('ai_summary.title')}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

/**
 * AiSummaryCard — Dòng "Tóm tắt bằng AI" ở cuối khối tin chưa đọc.
 *
 * Props:
 *   conversationId    — ID conversation để gọi API
 *   initialSummary    — { summary, ... } từ DB (nếu đã tóm tắt trước) → hiện ngay
 *   snapshotLastReadId — lastReadMessageId lúc mở chat (trước markAsRead)
 *
 * Trạng thái:
 *   idle    → hiện dòng ngang có thể click
 *   loading → spinner đang chờ AI
 *   done    → hiện text tóm tắt + nút "Làm mới"
 *   error   → thông báo lỗi + nút "Thử lại"
 */
export default function AiSummaryCard({ conversationId, initialSummary, snapshotLastReadId }) {
  const { t } = useLanguage();
  const startState   = initialSummary?.summary ? 'done' : 'idle';
  const startSummary = initialSummary?.summary || '';

  const [status, setStatus]   = useState(startState);
  const [summary, setSummary] = useState(startSummary);
  const [errMsg, setErrMsg]   = useState('');

  const handleSummarize = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setSummary('');
    setErrMsg('');
    try {
      const res  = await messageApi.getAiSummary(conversationId, snapshotLastReadId || null);
      const data = res.data;
      if (data.reason === 'no_unread') {
        setSummary(t('ai_summary.no_unread'));
      } else {
        setSummary(data.summary || '');
      }
      setStatus('done');
    } catch (err) {
      const msg = err.response?.data?.message || t('ai_summary.error_default');
      setErrMsg(msg);
      setStatus('error');
    }
  };

  // ── idle ──────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return <DividerLine onClick={handleSummarize} clickable t={t} />;
  }

  // ── loading ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <>
        <DividerLine clickable={false} t={t} />
        <div style={{
          margin: '0 16px 12px', padding: '8px 12px', borderRadius: 8,
          background: 'rgba(167,139,250,0.07)',
          border: '1px solid rgba(167,139,250,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid rgba(167,139,250,0.3)',
            borderTopColor: '#a78bfa',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {t('ai_summary.loading')}
          </span>
        </div>
      </>
    );
  }

  // ── error ──────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <>
        <DividerLine clickable={false} t={t} />
        <div style={{
          margin: '0 16px 12px', padding: '8px 12px', borderRadius: 8,
          background: 'rgba(237,66,69,0.06)',
          border: '1px solid rgba(237,66,69,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: '#ed4245' }}>{errMsg}</span>
          <button
            onClick={handleSummarize}
            style={{
              fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'none',
              border: '1px solid rgba(167,139,250,0.35)', borderRadius: 5,
              padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
            }}
          >
            {t('ai_summary.btn_retry')}
          </button>
        </div>
      </>
    );
  }

  // ── done ────────────────────────────────────────────────────────────────
  return (
    <>
      <DividerLine clickable={false} t={t} />
      <div style={{
        margin: '0 16px 12px', padding: '10px 14px', borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(108,99,255,0.07), rgba(167,139,250,0.04))',
        border: '1px solid rgba(167,139,250,0.2)',
      }}>
        <p style={{
          margin: 0, fontSize: 13, color: 'var(--text-muted)',
          fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
          {summary}
        </p>
        <div style={{
          marginTop: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleSummarize}
            style={{
              fontSize: 11, fontWeight: 600, color: '#a78bfa', background: 'none',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 5, padding: '2px 8px', cursor: 'pointer',
            }}
          >
            {t('ai_summary.btn_refresh')}
          </button>
        </div>
      </div>
    </>
  );
}
