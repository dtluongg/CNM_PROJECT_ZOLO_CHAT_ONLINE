import React from 'react';
import { X } from 'lucide-react';

const UnpinConfirmModal = ({ isOpen, onClose, onConfirm }) => {
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
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            Bỏ ghim
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: 1.5 }}>
            Bạn có chắc muốn bỏ ghim nội dung này không?
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
              border: 'none', backgroundColor: '#e2e8f0',
              fontSize: '14px', fontWeight: 600, color: '#1e293b',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#d1d5db'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
          >
            Không
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
            Bỏ ghim
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnpinConfirmModal;
