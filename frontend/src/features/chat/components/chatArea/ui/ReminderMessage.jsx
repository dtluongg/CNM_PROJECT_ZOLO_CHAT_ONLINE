import React from 'react';
import { Bell, Calendar, Clock } from 'lucide-react';
import { useLanguage } from '../../../../../context/LanguageContext';

/**
 * ReminderMessage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A specialized card for displaying reminder messages in the chat bubble.
 * Features a high-contrast design to distinguish from regular text.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ReminderMessage = ({ message, isMine, isPinned }) => {
  const { t, language } = useLanguage();
  const payload = message.payload || {};
  const reminderContent = payload.content || message.content;
  const reminderTime = payload.reminderTime ? new Date(payload.reminderTime) : null;
  const isTriggered = payload.isTriggered || false;

  const formatDate = (date) => {
    if (!date) return t('chat.reminder_card.unknown_date');
    const localeStr = language === 'vi' ? 'vi-VN' : 'en-US';
    return date.toLocaleDateString(localeStr, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return '??:??';
    const localeStr = language === 'vi' ? 'vi-VN' : 'en-US';
    return date.toLocaleTimeString(localeStr, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Styles follow the premium aesthetics guideline - Unified Orange Theme
  const containerStyle = {
    background: 'rgba(255, 149, 0, 0.1)',
    borderRadius: '16px',
    padding: '12px 16px',
    minWidth: '240px',
    border: '1px solid rgba(255, 149, 0, 0.3)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  };

  const pinnedStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(255, 149, 0, 0.2)',
    opacity: 0.9,
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'rgb(255, 149, 0)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 700,
    color: 'rgb(255, 149, 0)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const contentStyle = {
    fontSize: '15px',
    lineHeight: '1.4',
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  };

  const footerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 149, 0, 0.1)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  };

  const timeBlockStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const badgeStyle = {
    background: isTriggered ? '#ed4245' : 'rgba(255, 149, 0, 0.15)',
    color: isTriggered ? '#fff' : 'rgb(255, 149, 0)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 800,
  };

  return (
    <div style={containerStyle}>
      {isPinned && (
        <div style={pinnedStyle}>
          <span>📌</span>
          <span>{t('chat.reminder_card.pinned')}</span>
        </div>
      )}

      <div style={headerStyle}>
        <Bell size={16} strokeWidth={3} />
        <span>{t('chat.reminder_card.label')}</span>
        <div style={{ flex: 1 }} />
        <span style={badgeStyle}>
          {isTriggered ? t('chat.reminder_card.triggered') : t('chat.reminder_card.upcoming')}
        </span>
      </div>

      <div style={contentStyle}>
        {reminderContent}
      </div>

      <div style={footerStyle}>
        <div style={timeBlockStyle}>
          <Calendar size={12} />
          <span>{formatDate(reminderTime)}</span>
        </div>
        <div style={timeBlockStyle}>
          <Clock size={12} />
          <span style={{ fontWeight: 700 }}>{formatTime(reminderTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default ReminderMessage;
