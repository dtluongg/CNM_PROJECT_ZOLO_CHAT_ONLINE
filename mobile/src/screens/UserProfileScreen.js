/**
 * UserProfileScreen – view another user's public profile (modern UI)
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

  const userId = route.params?.userId || route.params?.user?._id;

  useEffect(() => {
    if (!profile && userId) loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/auth/users/${userId}/profile`);
      setProfile(res.data.user || res.data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ người dùng.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    navigation.navigate('Message', {
      conversation: {
        id: profile._id,
        name: profile.displayName || profile.username || 'Người dùng',
        avatar: profile.avatar,
        type: 'dm',
        status: profile.status,
        online: profile.status === 'online',
        otherUserId: profile._id,
        usernameColor: profile.usernameColor,
        lastMessage: '', time: '', unread: 0,
      },
    });
  };

  if (loading) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
        <ActivityIndicator color={THEME.accent} size="large" />
        <Text style={{ color: THEME.textMuted, marginTop: 10 }}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  if (!profile) return null;

  const si = STATUS_CONFIG[profile.status || 'offline'] || STATUS_CONFIG.offline;
  const isOwn = authUser?._id === profile._id;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{profile.displayName}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        {profile.banner
          ? <Image source={{ uri: profile.banner }} style={s.banner} />
          : <View style={[s.banner, { backgroundColor: profile.usernameColor || THEME.accent }]} />
        }
        {/* Banner gradient */}
        <View style={s.bannerGradient} />

        {/* Avatar over banner */}
        <View style={s.avatarFloatRow}>
          <View style={[s.avatarRing, { borderColor: si.color }]}>
            <Avatar name={profile.displayName} avatar={profile.avatar} size={80} />
          </View>
          {/* Status indicator */}
          <View style={[s.statusBubble, { backgroundColor: si.color + '20', borderColor: si.color + '60' }]}>
            <View style={[s.statusDot, { backgroundColor: si.color }]} />
            <Text style={[s.statusBubbleText, { color: si.color }]}>{si.label}</Text>
          </View>
        </View>

        {/* Name block */}
        <View style={s.nameBlock}>
          <Text style={[s.displayName, { color: profile.usernameColor || THEME.textPrimary }]}>
            {profile.displayName}
          </Text>
          {profile.username && <Text style={s.handle}>@{profile.username}</Text>}
        </View>

        {/* Action buttons */}
        {!isOwn && (
          <View style={s.actionRow}>
            <ActionBtn icon="💬" label="Nhắn tin" onPress={handleMessage} primary />
            <ActionBtn icon="🤝" label="Kết bạn" onPress={() => Alert.alert('Kết bạn', `Đã gửi lời mời đến ${profile.displayName}!`)} />
            <ActionBtn icon="📞" label="Gọi điện" onPress={() => Alert.alert('Gọi điện', 'Tính năng sẽ sớm ra mắt!')} />
          </View>
        )}

        {/* Bio */}
        {profile.bio && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>GIỚI THIỆU</Text>
            <View style={s.bioCard}>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>THÔNG TIN THÀNH VIÊN</Text>
          <View style={s.infoCard}>
            {profile.email && <InfoRow icon="📧" label="Email" value={profile.email} />}
            {profile.username && <InfoRow icon="🏷️" label="Username" value={`@${profile.username}`} sep />}
            {profile.createdAt && (
              <InfoRow
                icon="📅"
                label="Tham gia"
                value={new Date(profile.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}
                sep
              />
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, primary }) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, primary && s.actionBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <Text style={s.actionBtnIcon}>{icon}</Text>
      <Text style={[s.actionBtnLabel, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ icon, label, value, sep }) {
  return (
    <>
      {sep && <View style={s.infoSep} />}
      <View style={s.infoRow}>
        <Text style={s.infoRowIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgPrimary },

  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 4,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
    zIndex: 10,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 32, color: THEME.textPrimary, lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: THEME.textPrimary, textAlign: 'center' },

  banner: { width: '100%', height: 120 },
  bannerGradient: {
    position: 'absolute', top: 48 + 56, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },

  avatarFloatRow: {
    paddingHorizontal: 16, marginTop: -46,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarRing: {
    borderRadius: 50, borderWidth: 4,
    backgroundColor: THEME.bgSecondary, padding: 2,
  },
  statusBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    marginBottom: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBubbleText: { fontSize: 12, fontWeight: '700' },

  nameBlock: { paddingHorizontal: 16, marginBottom: 16 },
  displayName: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2, marginBottom: 2 },
  handle: { fontSize: 13, color: THEME.textMuted },

  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  actionBtn: {
    flex: 1, backgroundColor: THEME.bgSecondary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: THEME.border,
  },
  actionBtnPrimary: { backgroundColor: THEME.accent, borderColor: THEME.accent },
  actionBtnIcon: { fontSize: 20 },
  actionBtnLabel: { color: THEME.textSecondary, fontSize: 12, fontWeight: '600' },

  section: { paddingHorizontal: 12, marginBottom: 12 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: THEME.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  bioCard: { backgroundColor: THEME.bgSecondary, borderRadius: 12, padding: 14 },
  bioText: { color: THEME.textSecondary, fontSize: 14, lineHeight: 21 },

  infoCard: { backgroundColor: THEME.bgSecondary, borderRadius: 12, overflow: 'hidden', padding: 14 },
  infoSep: { height: 1, backgroundColor: THEME.border, marginVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoRowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoLabel: { fontSize: 11, color: THEME.textMuted, marginBottom: 1 },
  infoValue: { fontSize: 14, color: THEME.textPrimary, fontWeight: '600' },
});
