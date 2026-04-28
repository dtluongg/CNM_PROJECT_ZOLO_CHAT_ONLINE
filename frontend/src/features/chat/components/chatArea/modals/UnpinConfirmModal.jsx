import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../../../../context/LanguageContext';

const UnpinConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(2px)',
      animation: 'modalFadeIn 0.2s ease-out'
    }}>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        width: '400px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('chat.unpin_confirm.title')}
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('chat.unpin_confirm.desc')}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px 20px',
          display: 'flex', justifyContent: 'flex-end', gap: 12
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: '4px',
              border: 'none', backgroundColor: 'var(--bg-hover)',
              fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
          >
            {t('chat.unpin_confirm.no')}
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: '8px 20px', borderRadius: '4px',
              border: 'none', backgroundColor: '#c52828',
              fontSize: '14px', fontWeight: 600, color: '#fff',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#a02020'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#c52828'}
          >
            {t('chat.unpin_confirm.yes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnpinConfirmModal;
