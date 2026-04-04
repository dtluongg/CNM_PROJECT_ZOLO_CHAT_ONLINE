/**
 * UserProfileScreen – view another user's public profile
 * Stack screen navigated to from SearchScreen or ChatsTab.
 * Params: { user: {...} } or { userId: '...' }
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import apiClient from '../services/apiClient';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';
import { useAuth } from '../context/AuthContext';

const Avatar = ({ name, avatar, size = 80 }) => {
  const bg = getAvatarColor(name);
  return avatar
    ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{getInitials(name)}</Text>
      </View>
    );
};

export default function UserProfileScreen({ route, navigation }) {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(route.params?.user || null);
  const [loading, setLoading] = useState(!route.params?.user);
  const [friendLoading, setFriendLoading] = useState(false);

  const userId = route.params?.userId || route.params?.user?._id;

  useEffect(() => {
    if (!profile && userId) {
      loadProfile();
    }
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/auth/users/${userId}/profile`);
      setProfile(res.data.user || res.data);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ người dùng.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    const conversation = {
      id: profile._id,
      name: profile.displayName || profile.username || 'Người dùng',
      avatar: profile.avatar,
      type: 'dm',
      status: profile.status,
      online: profile.status === 'online',
      otherUserId: profile._id,
      usernameColor: profile.usernameColor,
      lastMessage: '',
      time: '',
      unread: 0,
    };
    navigation.navigate('Message', { conversation });
  };

  const handleAddFriend = () => {
    Alert.alert('Kết bạn', `Gửi lời mời kết bạn đến ${profile?.displayName}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gửi lời mời', onPress: async () => {
          setFriendLoading(true);
          try {
            // Future: await apiClient.post(`/friends/request`, { targetId: profile._id });
            Alert.alert('Thành công', 'Đã gửi lời mời kết bạn!');
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn.');
          } finally {
            setFriendLoading(false);
          }
        },
      },
    ]);
  };

  const handleCall = () => {
    Alert.alert('Gọi điện', 'Tính năng gọi điện sẽ sớm ra mắt!');
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: THEME.bgTertiary }]}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
        <ActivityIndicator color={THEME.accent} size="large" />
      </View>
    );
  }

  if (!profile) return null;

  const statusInfo = STATUS_CONFIG[profile.status || 'offline'] || STATUS_CONFIG.offline;
  const isOwnProfile = authUser?._id === profile._id;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {profile.displayName || 'Hồ sơ'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        {profile.banner
          ? <Image source={{ uri: profile.banner }} style={s.banner} />
          : <View style={[s.banner, { backgroundColor: profile.usernameColor || THEME.accent }]} />
        }

        {/* Avatar */}
        <View style={s.avatarRow}>
          <View style={{ position: 'relative' }}>
            <Avatar name={profile.displayName} avatar={profile.avatar} size={84} />
            <View style={[s.statusRing, {
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: statusInfo.color,
              bottom: 2, right: 2,
            }]} />
          </View>
        </View>

        {/* Name & status */}
        <View style={s.nameBlock}>
          <Text style={[s.displayName, { color: profile.usernameColor || THEME.textPrimary }]}>
            {profile.displayName || 'Người dùng'}
          </Text>
          {profile.username && (
            <Text style={s.handle}>@{profile.username}</Text>
          )}
          <View style={[s.statusPill, { backgroundColor: statusInfo.color + '22', borderColor: statusInfo.color + '55' }]}>
            <View style={[s.statusDotInline, { backgroundColor: statusInfo.color }]} />
            <Text style={[s.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Action buttons (only for other users' profiles) */}
        {!isOwnProfile && (
          <View style={s.actionRow}>
            <ActionBtn icon="💬" label="Nhắn tin" onPress={handleMessage} primary />
            <ActionBtn
              icon="🤝"
              label="Kết bạn"
              onPress={handleAddFriend}
              loading={friendLoading}
            />
            <ActionBtn icon="📞" label="Gọi điện" onPress={handleCall} />
          </View>
        )}

        {/* Bio */}
        {profile.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>GIỚI THIỆU</Text>
            <View style={s.bioBox}>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {/* Info fields */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>THÔNG TIN</Text>
          <View style={s.infoCard}>
            {profile.email && (
              <InfoRow label="Email" value={profile.email} />
            )}
            {profile.username && (
              <InfoRow label="Tên người dùng" value={`@${profile.username}`} />
            )}
            {profile.createdAt && (
              <InfoRow
                label="Tham gia từ"
                value={new Date(profile.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
                last
              />
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────
function ActionBtn({ icon, label, onPress, primary, loading }) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, primary && s.actionBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={primary ? '#fff' : THEME.textPrimary} size="small" />
        : <Text style={s.actionBtnIcon}>{icon}</Text>
      }
      <Text style={[s.actionBtnLabel, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 32, color: THEME.textPrimary, fontWeight: '300', lineHeight: 36 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: THEME.textPrimary, textAlign: 'center' },

  banner: { width: '100%', height: 110 },

  avatarRow: {
    paddingHorizontal: 16, marginTop: -42,
  },
  statusRing: {
    position: 'absolute',
    borderWidth: 3, borderColor: THEME.bgTertiary,
  },

  nameBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  displayName: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  handle: { fontSize: 14, color: THEME.textMuted, marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, gap: 6,
  },
  statusDotInline: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600' },

  // Action row
  actionRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, marginBottom: 16,
  },
  actionBtn: {
    flex: 1, backgroundColor: THEME.bgSecondary,
    borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: THEME.border,
  },
  actionBtnPrimary: { backgroundColor: THEME.accent, borderColor: THEME.accent },
  actionBtnIcon: { fontSize: 20 },
  actionBtnLabel: { color: THEME.textPrimary, fontSize: 12, fontWeight: '600' },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: THEME.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },

  bioBox: { backgroundColor: THEME.bgSecondary, borderRadius: 10, padding: 12 },
  bioText: { color: THEME.textSecondary, fontSize: 14, lineHeight: 20 },

  infoCard: { backgroundColor: THEME.bgSecondary, borderRadius: 10, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  infoLabel: { fontSize: 13, color: THEME.textMuted },
  infoValue: { fontSize: 13, color: THEME.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
});
