import React, { useState } from 'react';
import { X, MessageSquare, AlertCircle } from 'lucide-react';

const PinLimitModal = ({ isOpen, onClose, pinnedMessages, onConfirm }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedIndex);
    onClose();
  };

  const getPreviewText = (msg) => {
    if (!msg) return '';
    if (msg.revoked) return 'Tin nhắn đã được thu hồi';
    if (msg.type === 'image') return '[Hình ảnh]';
    if (msg.type === 'file') return `[File] ${msg.payload?.fileName || ''}`;
    if (msg.type === 'voice') return '[Tin nhắn thoại]';
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
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
            Cập nhật danh sách ghim
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>
            Đã đạt giới hạn 3 ghim. Ghim cũ dưới đây sẽ được bỏ để cập nhật nội dung mới.
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
                    border: `2px solid ${isSelected ? 'var(--accent)' : '#f3f4f6'}`,
                    backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.05)' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#fff', border: '1px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isSelected ? 'var(--accent)' : '#9ca3af'
                  }}>
                    <MessageSquare size={16} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        Tin nhắn
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                          Thay đổi
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '12px', color: '#6b7280', 
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2
                    }}>
                      {msg.senderId?.displayName}: {getPreviewText(msg)}
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
          backgroundColor: '#f9fafb',
          display: 'flex', justifyContent: 'flex-end', gap: 12
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 24px', borderRadius: '6px',
              border: '1px solid #d1d5db', backgroundColor: '#fff',
              fontSize: '14px', fontWeight: 600, color: '#374151',
              cursor: 'pointer'
            }}
          >
            Hủy
          </button>
          <button 
            onClick={handleConfirm}
            style={{
              padding: '8px 24px', borderRadius: '6px',
              border: 'none', backgroundColor: '#3b82f6',
              fontSize: '14px', fontWeight: 600, color: '#fff',
              cursor: 'pointer'
            }}
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinLimitModal;
