import React from 'react';
import { X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useLanguage } from '../../../../../context/LanguageContext';

export const ReactionListModal = ({ messageId, reactionDetails, onClose, isMobile }) => {
  const { t } = useLanguage();
  if (!messageId) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isMobile ? '85%' : 400, maxHeight: '60vh',
          background: 'var(--bg-secondary)', borderRadius: 12,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('chat.reactions.title')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {reactionDetails.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{t('chat.reactions.no_reactions')}</div>
          ) : (
            reactionDetails.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <Avatar name={r.userId?.displayName} avatar={r.userId?.avatar} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{r.userId?.displayName}</div>
                </div>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const ReadListModal = ({ readBy, onClose, isMobile }) => {
  const { t, language } = useLanguage();
  if (!readBy) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isMobile ? '85%' : 400, maxHeight: '60vh',
          background: 'var(--bg-secondary)', borderRadius: 12,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('chat.read_by.title')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {readBy.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{t('chat.read_by.no_readers')}</div>
          ) : (
            readBy.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <Avatar name={r.displayName} avatar={r.avatar} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{r.displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {t('chat.read_by.read_at', { 
                      time: new Date(r.readAt).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: language !== 'vi'
                      }) 
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};