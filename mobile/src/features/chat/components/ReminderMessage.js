import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * ReminderMessage.js (Mobile)
 * ─────────────────────────────────────────────────────────────────────────────
 * A specialized card for displaying reminder messages in the mobile chat.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ReminderMessage = ({ message, isMine, THEME = {}, isPinned }) => {
  const { t } = useLanguage();
  const payload = message.payload || {};
  const reminderContent = payload.content || message.content;
  const reminderTime = payload.reminderTime ? new Date(payload.reminderTime) : null;
  const isTriggered = payload.isTriggered || false;

  const colors = {
    bg: 'rgba(255,149,0,0.08)',
    text: THEME.textPrimary || '#333',
    muted: THEME.textMuted || '#666',
    border: 'rgba(255,149,0,0.25)',
    accent: '#FF9500'
  };

  const formatDate = (date) => {
    if (!date) return '??/??';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}`;
  };

  const formatTime = (date) => {
    if (!date) return '??:??';
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${min}`;
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: colors.bg,
        borderColor: colors.border,
        width: 220,
        borderWidth: 1,
      }
    ]}>
      {isPinned && (
        <View style={styles.pinnedHeader}>
          <Text style={{ fontSize: 10 }}>📌</Text>
          <Text style={styles.pinnedText}>{t('chat.pinned_messages')}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="bell" size={14} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.title, { color: colors.accent }]}>{t('reminder.header')}</Text>
        </View>
        <View style={[
          styles.badge, 
          { backgroundColor: isTriggered ? '#ed4245' : 'rgba(255,149,0,0.15)' }
        ]}>
          <Text style={[styles.badgeText, { color: isTriggered ? '#fff' : colors.accent }]}>
            {isTriggered ? t('reminder.triggered') : t('reminder.upcoming')}
          </Text>
        </View>
      </View>

      <Text style={[styles.content, { color: colors.text }]} numberOfLines={3}>
        {reminderContent}
      </Text>

      <View style={[styles.footer, { borderTopColor: 'rgba(255,149,0,0.15)' }]}>
        <View style={styles.footerItem}>
          <Feather name="calendar" size={12} color={colors.muted} />
          <Text style={[styles.footerText, { color: colors.muted }]}>{formatDate(reminderTime)}</Text>
        </View>
        <View style={styles.footerItem}>
          <Feather name="clock" size={12} color={colors.muted} />
          <Text style={[styles.footerText, { color: colors.text, fontWeight: 'bold' }]}>{formatTime(reminderTime)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,149,0,0.15)',
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#FF9500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    marginLeft: 4,
  },
});

export default ReminderMessage;
