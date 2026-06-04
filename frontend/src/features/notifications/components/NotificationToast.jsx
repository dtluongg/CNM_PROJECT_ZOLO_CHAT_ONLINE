import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';

export default function NotificationToast() {
  const { toast, dismissToast, markRead } = useNotifications();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const notification = toast?.notification || null;

  const handleClick = async () => {
    if (notification?._id) {
      await markRead(notification._id);
    }

    if (notification?.type === 'friend_request' || notification?.type === 'friend_accepted') {
      navigate('/friends', { state: { activeTab: 'friend_requests' } });
      dismissToast();
      return;
    }

    if ((notification?.type === 'message' || notification?.type?.startsWith('call_')) && notification?.conversationId) {
      navigate('/chat', {
        state: {
          openConversationId: notification.conversationId,
          notificationId: notification._id,
        },
      });
      dismissToast();
      return;
    }

    dismissToast();
  };

  if (!notification) return null;

  return (
    <button
      onClick={handleClick}
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>{notification.title || t('notification_center.default_title')}</span>
      </div>
      {notification.body ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {notification.body}
        </div>
      ) : null}
    </button>
  );
}
