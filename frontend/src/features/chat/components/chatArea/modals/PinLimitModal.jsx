import React, { useState } from 'react';
import { X, MessageSquare, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../../../context/LanguageContext';

const PinLimitModal = ({ isOpen, onClose, pinnedMessages, onConfirm }) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedIndex);
    onClose();
  };

  const getPreviewText = (msg) => {
    if (!msg) return '';
    if (msg.revoked) return t('pinned_bar.revoked');
    if (msg.type === 'image') return t('pinned_bar.image');
    if (msg.type === 'file') return `${t('pinned_bar.file')} ${msg.payload?.fileName || ''}`;
    if (msg.type === 'voice') return t('pinned_bar.voice');
    return msg.content || '';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '450px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('chat.pin_limit_modal.title')}
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('chat.pin_limit_modal.desc')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pinnedMessages.map((pin, idx) => {
              const msg = pin.messageId;
              const isSelected = selectedIndex === idx;

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: isSelected ? 'var(--bg-hover)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isSelected ? 'var(--accent)' : 'var(--text-muted)'
                  }}>
                    <MessageSquare size={16} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t('chat.pin_limit_modal.item_type')}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                          {t('chat.pin_limit_modal.replace_action')}
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '12px', color: 'var(--text-muted)', 
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2
                    }}>
                      {msg.senderId?.displayName || t('chat.default_user')}: {getPreviewText(msg)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
          borderTop: '1px solid var(--border)'
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 24px', borderRadius: '6px',
              border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)',
              fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {t('chat.pin_limit_modal.cancel')}
          </button>
          <button 
            onClick={handleConfirm}
            style={{
              padding: '8px 24px', borderRadius: '6px',
              border: 'none', backgroundColor: 'var(--accent)',
              fontSize: '14px', fontWeight: 600, color: '#fff',
              cursor: 'pointer'
            }}
          >
            {t('chat.pin_limit_modal.update_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinLimitModal;
