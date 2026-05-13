import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function NotificationCenter({ open, onClose }) {
  const {
    items,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    soundEnabled,
    setSoundEnabled,
    bannerEnabled,
    setBannerEnabled,
  } = useNotifications();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [items]
  );
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Nếu bảng thông báo đang mở, VÀ cái click đó KHÔNG nằm trong modalRef -> Đóng!
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    // Chỉ bật lắng nghe khi bảng thông báo đang mở (open === true)
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Dọn dẹp sự kiện khi component bị hủy hoặc khi bảng thông báo đóng lại
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);
  const openNotification = useCallback(async (item) => {
    if (!item?._id) return;
    await markRead(item._id);

    if (item.type === 'friend_request' || item.type === 'friend_accepted') {
      navigate('/friends', { state: { activeTab: 'friend_requests' } });
      onClose?.();
      return;
    }

    if (item.type === 'message' || item.type === 'call_incoming' || item.type === 'call_rejected' || item.type === 'call_missed') {
      if (item.conversationId) {
        navigate('/chat', {
          state: {
            openConversationId: item.conversationId,
            notificationId: item._id,
          },
        });
      } else {
        navigate('/chat');
      }
      onClose?.();
      return;
    }

    onClose?.();
  }, [markRead, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: 'absolute',
        left: 72,
        top: 88,
        width: 360,
        maxHeight: 520,
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-secondary)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Thông báo</span>
          <span style={{
            fontSize: 11,
            color: '#fff',
            background: '#ed4245',
            borderRadius: 10,
            padding: '1px 7px',
            fontWeight: 700,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={markAllRead}
            style={{
              border: 'none',
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
              borderRadius: 7,
              padding: '4px 8px',
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <CheckCheck size={12} />
            Đọc hết
          </button>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
              borderRadius: 7,
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 14,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
          Âm thanh
        </label>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={bannerEnabled} onChange={(e) => setBannerEnabled(e.target.checked)} />
          Thông báo nổi
        </label>
      </div>

      <div style={{ overflowY: 'auto', padding: 8 }}>
        {loading && sorted.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Đang tải thông báo...</div>
        ) : null}

        {!loading && sorted.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Chưa có thông báo nào.</div>
        ) : null}

        {sorted.map((item) => (
          <button
            key={item._id}
            onClick={() => openNotification(item)}
            style={{
              width: '100%',
              textAlign: 'left',
              border: item.isRead ? '1px solid var(--border)' : '1px solid rgba(88,101,242,0.35)',
              background: item.isRead ? 'var(--bg-tertiary)' : 'rgba(88,101,242,0.12)',
              color: 'var(--text-primary)',
              borderRadius: 10,
              padding: '9px 10px',
              marginBottom: 8,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{item.title || 'Thông báo mới'}</span>
              {!item.isRead ? (
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>Mới</span>
              ) : null}
            </div>
            {item.body ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.35 }}>
                {item.body}
              </div>
            ) : null}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {formatTime(item.createdAt)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
