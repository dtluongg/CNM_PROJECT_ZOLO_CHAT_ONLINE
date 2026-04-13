import React, { useMemo } from 'react';
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

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [items]
  );

  if (!open) return null;

  return (
    <div
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
            onClick={() => !item.isRead && markRead(item._id)}
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
