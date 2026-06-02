import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAvatarColor, getInitials } from '../../../theme';

const GROUP_TYPE_LABELS = {
  study:   '📚 Học tập',
  gaming:  '🎮 Gaming',
  general: '💬 Chung',
  project: '💼 Dự án',
  other:   '✨ Khác',
};

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
              {targetName} đã tham gia nhóm!
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Feather name="user-plus" size={10} color="#888" />
            <Text style={{ fontSize: 11, color: '#888' }}>
              Được mời bởi <Text style={{ fontWeight: '700' }}>{actorName}</Text>
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
          <Text style={{ fontSize: 12, color: '#666' }}>{actorName} đã rời khỏi nhóm</Text>
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
              {targetName} đã bị xóa khỏi nhóm
            </Text>
            {reason && (
              <Text style={{ fontSize: 10, color: '#ed4245', opacity: 0.75 }}>
                Lý do: {reason}
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
              {targetName} được đặt làm {isAdminRole ? 'Quản trị viên' : 'Thành viên'}
            </Text>
            <Text style={{ fontSize: 10, color: '#888' }}>bởi {actorName}</Text>
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
              {targetName} là chủ nhóm mới!
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Feather name="award" size={10} color="#888" />
            <Text style={{ fontSize: 11, color: '#888' }}>
              Chuyển từ <Text style={{ fontWeight: '700' }}>{actorName}</Text>
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
            Tên nhóm: <Text style={{ fontWeight: '700' }}>{changes.name.newValue}</Text>
          </Text>
        </View>
      );
    }
    if (changes.avatar) {
      changeRows.push(
        <View key="avatar" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="image" size={10} color="#666" />
          <Text style={{ fontSize: 11, color: '#555' }}>Đã cập nhật ảnh nhóm</Text>
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
            Mô tả: <Text style={{ fontStyle: 'italic' }}>{changes.description.newValue || '(trống)'}</Text>
          </Text>
        </View>
      );
    }
    if (changes.groupType) {
      changeRows.push(
        <View key="type" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="tag" size={10} color="#666" />
          <Text style={{ fontSize: 11, color: '#555' }}>
            Loại nhóm: <Text style={{ fontWeight: '700' }}>
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
              {actorName} đã cập nhật nhóm
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

  // ── Cuộc gọi NHÓM kết thúc ───────────────────────────────────────────────
  if (event === 'group_call_ended') {
    const isVideo  = msg.payload?.callType === 'video';
    const isMissed = msg.payload?.status === 'missed';
    const dur      = msg.payload?.duration || 0;
    const parts    = msg.payload?.participants || [];
    const shown    = parts.slice(0, 4);
    const extra    = parts.length - shown.length;
    const m = Math.floor(dur / 60), s = dur % 60;
    const label = isMissed
      ? `Cuộc gọi ${isVideo ? 'video' : 'thoại'} nhóm nhỡ`
      : `Cuộc gọi ${isVideo ? 'video' : 'thoại'} nhóm · ${m > 0 ? `${m} phút ${s} giây` : `${s} giây`}`;
    const color  = isMissed ? '#ed4245' : '#5865f2';
    const bg     = isMissed ? '#ed424510' : 'rgba(88,101,242,0.08)';
    const border = isMissed ? '#ed424530' : 'rgba(88,101,242,0.2)';
    return (
      <View style={{ alignItems: 'center', marginVertical: 6, marginHorizontal: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: bg, borderWidth: 1, borderColor: border,
          borderRadius: 30, paddingVertical: 8, paddingHorizontal: 14,
        }}>
          <Feather name={isVideo ? 'video' : 'phone'} size={14} color={color} />
          <View style={{ flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
            <Text style={{ fontSize: 10, color: '#888', opacity: 0.7 }}>{msg.time}</Text>
          </View>
          {shown.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {shown.map((p, i) => (
                <View key={p._id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
                  <MiniAvatar name={p.displayName} avatar={p.avatar} size={24} />
                </View>
              ))}
              {extra > 0 && (
                <View style={{
                  marginLeft: -8, width: 24, height: 24, borderRadius: 12,
                  backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#555' }}>+{extra}</Text>
                </View>
              )}
            </View>
          )}
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
    label = `Cuộc gọi ${isVideo ? 'video' : 'thoại'} · ${m > 0 ? `${m} phút ${s} giây` : `${s} giây`}`;
  } else if (isMissed) {
    label = 'Cuộc gọi nhỡ';
  } else if (isRejected) {
    label = 'Cuộc gọi bị từ chối';
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