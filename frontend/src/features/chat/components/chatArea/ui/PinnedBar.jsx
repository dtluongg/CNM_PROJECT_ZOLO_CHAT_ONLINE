import React, { useState, useEffect } from 'react';
import { Pin, X, ChevronLeft, ChevronRight, CornerRightUp } from 'lucide-react';

const PinnedBar = ({ pinnedMessages = [], onJump, onUnpin }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Tự động điều chỉnh currentIndex khi danh sách ghim thay đổi
  useEffect(() => {
    if (pinnedMessages.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= pinnedMessages.length) {
      setCurrentIndex(pinnedMessages.length - 1);
    }
  }, [pinnedMessages.length, currentIndex]);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  // Lấy tin nhắn ghim đang hiển thị
  const currentPin = pinnedMessages[currentIndex];
  const message = currentPin?.messageId;

  if (!message) return null;

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  const getPreviewText = () => {
    if (message.revoked) return 'Tin nhắn đã được thu hồi';
    if (message.type === 'image') return '[Hình ảnh]';
    if (message.type === 'file') return `[File] ${message.payload?.fileName || ''}`;
    if (message.type === 'voice') return '[Tin nhắn thoại]';
    return message.content;
  };

  return (
    <div 
      onClick={() => onJump((message._id || message.id)?.toString())}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.2s',
        position: 'relative',
        zIndex: 10,
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
    >
      <div style={{ color: 'var(--accent)', marginRight: 12, display: 'flex', alignItems: 'center' }}>
        <Pin size={16} fill="currentColor" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
            Tin nhắn đã ghim {pinnedMessages.length > 1 && `(${currentIndex + 1}/${pinnedMessages.length})`}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {message.senderId?.displayName || 'Thành viên'}
          </span>
        </div>
        <div style={{ 
          fontSize: 13, 
          color: 'var(--text-muted)', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          maxHeight: '1.2em'
        }}>
          {getPreviewText()}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }} onClick={e => e.stopPropagation()}>
        {pinnedMessages.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNext}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onUnpin((message._id || message.id)?.toString());
          }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#ed4245'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          title="Bỏ ghim"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PinnedBar;
