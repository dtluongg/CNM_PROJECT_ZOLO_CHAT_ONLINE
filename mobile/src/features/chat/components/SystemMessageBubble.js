import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAvatarColor, getInitials } from '../../../theme';
import { useLanguage } from '../../../context/LanguageContext';

const getGroupTypeLabels = (t) => ({
  study:   t('chat.group_types.study'),
  gaming:  t('chat.group_types.gaming'),
  general: t('chat.group_types.general'),
  project: t('chat.group_types.project'),
  other:   t('chat.group_types.other'),
});

const MiniAvatar = ({ name, avatar, size = 22 }) => {
  const [imgError, setImgError] = useState(false);
  const bg = getAvatarColor(name);
  const initials = getInitials(name);
  return avatar && !imgError ? (
    <Image
      source={{ uri: avatar }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setImgError(true)}
    />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.38, color: '#fff', fontWeight: '700' }}>
        {initials}
      </Text>
    </View>
  );
};

const SystemMessageBubble = ({ msg }) => {
  const { t } = useLanguage();
  const GROUP_TYPE_LABELS = getGroupTypeLabels(t);
  const event = msg.payload?.event;

  // ── Tham gia nhóm ─────────────────────────────────────────────────────────
  if (event === 'member_join') {
    const actorName    = msg.payload?.actorName    || '?';
    const actorAvatar  = msg.payload?.actorAvatar  || null;
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    return (
      <View style={{ alignItems: 'center', marginVertical: 10, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'column', alignItems: 'center',
          backgroundColor: '#5865f210', borderWidth: 1, borderColor: '#5865f230',
          borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, minWidth: 220,
        }}>
          <Text style={{ fontSize: 24, marginBottom: 8 }}>🎉</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MiniAvatar name={targetName} avatar={targetAvatar} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#5865f2' }}>
              {t('system.member_join', { name: targetName })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Feather name="user-plus" size={10} color="#888" />
            <Text style={{ fontSize: 11, color: '#888' }}>
              {t('system.invited_by', { name: actorName })}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: '#888', opacity: 0.7 }}>{msg.time}</Text>
        </View>
      </View>
    );
  }

  // ── Rời nhóm ──────────────────────────────────────────────────────────────
  if (event === 'member_leave') {
    const actorName   = msg.payload?.actorName   || '?';
    const actorAvatar = msg.payload?.actorAvatar || null;
    return (
      <View style={{ alignItems: 'center', marginVertical: 6, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#f0f0f5', borderWidth: 1, borderColor: '#e0e0e8',
          borderRadius: 30, paddingVertical: 7, paddingHorizontal: 14,
        }}>
          <MiniAvatar name={actorName} avatar={actorAvatar} />
          <Feather name="log-out" size={12} color="#888" />
          <Text style={{ fontSize: 12, color: '#666' }}>{t('system.member_leave', { name: actorName })}</Text>
          <Text style={{ fontSize: 10, color: '#888', opacity: 0.6 }}>{msg.time}</Text>
        </View>
      </View>
    );
  }

  // ── Bị kick ───────────────────────────────────────────────────────────────
  if (event === 'member_kick') {
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    const reason       = msg.payload?.reason       || null;
    return (
      <View style={{ alignItems: 'center', marginVertical: 6, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#ed424512', borderWidth: 1, borderColor: '#ed424540',
          borderRadius: 30, paddingVertical: 7, paddingHorizontal: 14,
        }}>
          <MiniAvatar name={targetName} avatar={targetAvatar} />
          <Feather name="user-x" size={12} color="#ed4245" />
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#ed4245' }}>
              {t('system.member_kick', { name: targetName })}
            </Text>
            {reason && (
              <Text style={{ fontSize: 10, color: '#ed4245', opacity: 0.75 }}>
                {t('system.kick_reason', { reason })}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 10, color: '#ed4245', opacity: 0.6 }}>{msg.time}</Text>
        </View>
      </View>
    );
  }

  // ── Thay đổi chức vụ ─────────────────────────────────────────────────────
  if (event === 'member_role_updated') {
    const actorName    = msg.payload?.actorName    || '?';
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    const newRole      = msg.payload?.newRole;
    const isAdminRole  = newRole === 'admin';
    return (
      <View style={{ alignItems: 'center', marginVertical: 6, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: isAdminRole ? '#f0b13212' : '#f0f0f5',
          borderWidth: 1, borderColor: isAdminRole ? '#f0b13240' : '#e0e0e8',
          borderRadius: 30, paddingVertical: 7, paddingHorizontal: 14,
        }}>
          <MiniAvatar name={targetName} avatar={targetAvatar} />
          <Feather name="shield" size={12} color={isAdminRole ? '#f0b132' : '#888'} />
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isAdminRole ? '#f0b132' : '#666' }}>
              {t('system.role_updated', { 
                name: targetName, 
                role: isAdminRole ? t('system.role_admin') : t('system.role_member') 
              })}
            </Text>
            <Text style={{ fontSize: 10, color: '#888' }}>{t('system.role_updated_by', { name: actorName })}</Text>
          </View>
          <Text style={{ fontSize: 10, color: '#888', opacity: 0.6 }}>{msg.time}</Text>
        </View>
      </View>
    );
  }

  // ── Chuyển quyền chủ nhóm ─────────────────────────────────────────────────
  if (event === 'member_owner_transferred') {
    const actorName    = msg.payload?.actorName    || '?';
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    return (
      <View style={{ alignItems: 'center', marginVertical: 10, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'column', alignItems: 'center',
          backgroundColor: '#ffd70012', borderWidth: 1, borderColor: '#ffd70040',
          borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, minWidth: 220,
        }}>
          <Text style={{ fontSize: 24, marginBottom: 8 }}>👑</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MiniAvatar name={targetName} avatar={targetAvatar} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#f0b132' }}>
              {t('system.owner_transferred', { name: targetName })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Feather name="award" size={10} color="#888" />
            <Text style={{ fontSize: 11, color: '#888' }}>
              {t('system.transferred_from', { name: actorName })}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: '#888', opacity: 0.7 }}>{msg.time}</Text>
        </View>
      </View>
    );
  }

  // ── Cập nhật thông tin nhóm ───────────────────────────────────────────────
  if (event === 'group_info_updated') {
    const actorName   = msg.payload?.actorName   || '?';
    const actorAvatar = msg.payload?.actorAvatar || null;
    const changes     = msg.payload?.changes || {};

    const changeRows = [];
    if (changes.name) {
      changeRows.push(
        <View key="name" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="edit-3" size={10} color="#666" />
          <Text style={{ fontSize: 11, color: '#555' }}>
            {t('system.field_name')}: <Text style={{ fontWeight: '700' }}>{changes.name.newValue}</Text>
          </Text>
        </View>
      );
    }
    if (changes.avatar) {
      changeRows.push(
        <View key="avatar" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="image" size={10} color="#666" />
          <Text style={{ fontSize: 11, color: '#555' }}>{t('system.field_avatar')}</Text>
          {changes.avatar.newValue && (
            <Image
              source={{ uri: changes.avatar.newValue }}
              style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' }}
            />
          )}
        </View>
      );
    }
    if (changes.description) {
      changeRows.push(
        <View key="desc" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="info" size={10} color="#666" />
          <Text style={{ fontSize: 11, color: '#555' }}>
            {t('system.field_description')}: <Text style={{ fontStyle: 'italic' }}>{changes.description.newValue || t('system.field_description_empty')}</Text>
          </Text>
        </View>
      );
    }
    if (changes.groupType) {
      changeRows.push(
        <View key="type" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="tag" size={10} color="#666" />
          <Text style={{ fontSize: 11, color: '#555' }}>
            {t('system.field_group_type')}: <Text style={{ fontWeight: '700' }}>
              {GROUP_TYPE_LABELS[changes.groupType.newValue] || changes.groupType.newValue}
            </Text>
          </Text>
        </View>
      );
    }

    return (
      <View style={{ alignItems: 'center', marginVertical: 6, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'column', alignItems: 'flex-start', gap: 6,
          backgroundColor: 'rgba(88,101,242,0.07)', borderWidth: 1, borderColor: 'rgba(88,101,242,0.2)',
          borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, maxWidth: 300,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
            <MiniAvatar name={actorName} avatar={actorAvatar} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#5865f2', flex: 1 }}>
              {t('system.info_updated', { name: actorName })}
            </Text>
            <Text style={{ fontSize: 10, color: '#888', opacity: 0.7 }}>{msg.time}</Text>
          </View>
          {changeRows.length > 0 && (
            <View style={{ flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
              {changeRows}
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Nhắc hẹn ─────────────────────────────────────────────────────────────
  if (event === 'reminder_triggered') {
    const reminderContent = msg.payload?.reminderContent || msg.content || t('chat.reminder_triggered_default');
    const actorName    = msg.senderName || msg.payload?.actorName || t('common.someone');
    const actorAvatar  = msg.avatar     || msg.payload?.actorAvatar || null;

    const convType      = msg.payload?.convType || 'dm';
    const targetName    = msg.payload?.targetName || msg.payload?.convName || 'Zolo';
    const targetAvatar  = msg.payload?.targetAvatar || msg.payload?.convAvatar || null;

    return (
      <View style={{ alignItems: 'center', marginVertical: 12, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: '#fff', borderWidth: 1, borderColor: '#fbbf24',
          borderRadius: 40, paddingVertical: 6, paddingHorizontal: 14,
          elevation: 2, shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
        }}>
          {/* Avatar Người đặt nhắc hẹn */}
          <MiniAvatar name={actorName} avatar={actorAvatar} />
          
          <View style={{ flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="bell" size={13} color="#f97316" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#f97316' }}>
                {t('system.reminder_triggered', { content: reminderContent })}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: '#9a3412', opacity: 0.7 }}>{msg.time}</Text>
          </View>

          {/* Avatar Đối phương (DM) hoặc Avatar Nhóm (Group) */}
          <MiniAvatar name={targetName} avatar={targetAvatar} />
        </View>
      </View>
    );
  }

  // ── Cuộc gọi ──────────────────────────────────────────────────────────────
  const isVideo    = msg.payload?.callType === 'video';
  const status     = msg.payload?.status;
  const isMissed   = status === 'missed';
  const isRejected = status === 'rejected';
  const isBad      = isMissed || isRejected;

  const callerName   = msg.callerName   || msg.payload?.callerName   || '?';
  const callerAvatar = msg.callerAvatar || msg.payload?.callerAvatar || null;
  const calleeName   = msg.calleeName   || msg.payload?.calleeName   || '?';
  const calleeAvatar = msg.calleeAvatar || msg.payload?.calleeAvatar || null;

  let label;
  if (status === 'ended') {
    const dur = msg.payload?.duration || 0;
    const m = Math.floor(dur / 60), s = dur % 60;
    const typeLabel = isVideo ? t('system.call_video') : t('system.call_voice');
    const durLabel = m > 0 ? t('system.call_duration', { m, s }) : t('system.call_duration_sec', { s });
    label = `${typeLabel} · ${durLabel}`;
  } else if (isMissed) {
    label = t('system.call_missed');
  } else if (isRejected) {
    label = t('system.call_rejected');
  } else {
    label = msg.content;
  }

  const color  = isBad ? '#ed4245' : '#888';
  const bgCall = isBad ? '#ed424512' : '#f0f0f5';
  const borderCall = isBad ? '#ed424540' : '#e0e0e8';

  return (
    <View style={{ alignItems: 'center', marginVertical: 6, marginHorizontal: 16 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: bgCall, borderWidth: 1, borderColor: borderCall,
        borderRadius: 30, paddingVertical: 8, paddingHorizontal: 14,
      }}>
        <MiniAvatar name={callerName} avatar={callerAvatar} />
        <View style={{ flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name={isVideo ? 'video' : 'phone'} size={12} color={color} />
            <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
          </View>
          <Text style={{ fontSize: 10, color: '#888', opacity: 0.7 }}>{msg.time}</Text>
        </View>
        <MiniAvatar name={calleeName} avatar={calleeAvatar} />
      </View>
    </View>
  );
};

export default SystemMessageBubble;
