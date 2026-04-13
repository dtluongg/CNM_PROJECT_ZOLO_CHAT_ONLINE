import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';

export default function NotificationToast() {
  const { toast, dismissToast } = useNotifications();

  if (!toast) return null;

  return (
    <button
      onClick={dismissToast}
      style={{
        position: 'fixed',
        top: 18,
        right: 18,
        zIndex: 100001,
        maxWidth: 360,
        minWidth: 260,
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
        padding: '10px 12px',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Bell size={15} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{toast.title}</span>
      </div>
      {toast.body ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {toast.body}
        </div>
      ) : null}
    </button>
  );
}
