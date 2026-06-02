import React from 'react';
import { createPortal } from 'react-dom';
import { X, Settings } from 'lucide-react';
import { useLanguage } from '../../../../../context/LanguageContext';

export default function PollDetailsModal({ isOpen, onClose, topic, options }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', width: '100%', maxWidth: '480px',
        borderRadius: '8px',
        display: 'flex', flexDirection: 'column', maxHeight: '80vh',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)', overflow: 'hidden',
        border: '1px solid var(--border)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          height: '56px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <h2 style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {t('chat.poll_card.details_title')}
          </h2>

          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {Array.isArray(options) && options.map((opt) => {
            const voters = Array.isArray(opt.voterIds) ? opt.voterIds : [];
            if (voters.length === 0) return null;

            return (
              <div key={opt.id} style={{ marginBottom: '24px' }}>
                <div style={{ 
                  fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', 
                  marginBottom: '12px', opacity: 0.9 
                }}>
                  {opt.text} ({voters.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {voters.map((voter, idx) => {
                    const isObject = typeof voter === 'object' && voter !== null;
                    const displayName = isObject ? (voter.displayName || t('chat.poll_card.default_user')) : t('chat.poll_card.loading');
                    const avatar = isObject ? voter.avatar : null;

                    return (
                      <div key={isObject ? (voter._id || voter.id) : idx} style={{
                        display: 'flex', alignItems: 'center', gap: '12px'
                      }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--border)'
                        }}>
                          {avatar ? (
                            <img src={avatar} alt="v" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              {displayName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {displayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
