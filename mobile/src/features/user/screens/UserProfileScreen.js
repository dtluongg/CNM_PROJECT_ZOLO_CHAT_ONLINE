import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import apiClient from '../../../services/apiClient';
import conversationApi from '../../chat/api/conversationApi';
import friendApi from '../../friends/api/friendApi';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { usePresence, formatLastSeen } from '../../../context/PresenceContext';

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
  const { isUserOnline, getPresenceStatus, getLastSeen } = usePresence();

  const [profile, setProfile]         = useState(route.params?.user || null);
  const [loading, setLoading]         = useState(!route.params?.user);
  const [messaging, setMessaging]     = useState(false);

  // Friend state: null (loading), 'none', 'friends', 'sent', 'received'
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendBusy, setFriendBusy]     = useState(false);

  const userId = route.params?.userId || route.params?.user?._id;

  // Live status info — trả về { color, label, statusKey }
  const getLiveStatusInfo = (user) => {
    const online = isUserOnline(user._id);
    const presStatus = getPresenceStatus(user._id);
    if (online && presStatus) {
      const cfg = STATUS_CONFIG[presStatus] || STATUS_CONFIG.online;
      return { ...cfg, statusKey: presStatus };
    }
    return { ...STATUS_CONFIG.offline, statusKey: 'offline' };
  };

  useEffect(() => {
    if (!profile && userId) loadProfile();
  }, [userId]);

  // Load friend status once profile is known and it's not own profile
  useEffect(() => {
    if (profile && authUser && profile._id !== authUser._id) {
      loadFriendStatus(profile._id);
    }
  }, [profile?._id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/users/${userId}/profile`);
      setProfile(res.data.user || res.data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ người dùng.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadFriendStatus = async (targetId) => {
    try {
      const [friendsRes, outgoingRes, incomingRes] = await Promise.all([
        friendApi.getFriendList(),
        friendApi.getOutgoingRequests(),
        friendApi.getIncomingRequests(),
      ]);

      const friends  = friendsRes.data?.data  || [];
      const outgoing = outgoingRes.data?.data  || [];
      const incoming = incomingRes.data?.data  || [];

      const isFriend = friends.some(f => f.friendId?.toString() === targetId?.toString());
      if (isFriend) {
        setFriendStatus('friends');
        return;
      }

      const sent = outgoing.find(r => r.toUserId?._id?.toString() === targetId?.toString());
      if (sent) {
        setFriendStatus('sent');
        setFriendRequestId(sent._id);
        return;
      }

      const received = incoming.find(r => r.fromUserId?._id?.toString() === targetId?.toString());
      if (received) {
        setFriendStatus('received');
        setFriendRequestId(received._id);
        return;
      }

      setFriendStatus('none');
    } catch {
      setFriendStatus('none');
    }
  };

  const handleSendRequest = async () => {
    if (friendBusy) return;
    setFriendBusy(true);
    try {
      const res = await friendApi.sendRequest(profile._id);
      setFriendRequestId(res.data?.data?._id || null);
      setFriendStatus('sent');
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi lời mời kết bạn.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    if (friendBusy || !friendRequestId) return;
    setFriendBusy(true);
    try {
      await friendApi.cancelRequest(friendRequestId);
      setFriendStatus('none');
      setFriendRequestId(null);
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể thu hồi lời mời.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (friendBusy || !friendRequestId) return;
    setFriendBusy(true);
    try {
      await friendApi.acceptRequest(friendRequestId);
      setFriendStatus('friends');
      setFriendRequestId(null);
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể chấp nhận lời mời.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleRejectRequest = async () => {
    if (friendBusy || !friendRequestId) return;
    setFriendBusy(true);
    try {
      await friendApi.rejectRequest(friendRequestId);
      setFriendStatus('none');
      setFriendRequestId(null);
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể từ chối lời mời.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleUnfriend = async () => {
    Alert.alert(
      'Hủy kết bạn',
      `Bạn có chắc muốn hủy kết bạn với ${profile.displayName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận', style: 'destructive',
          onPress: async () => {
            if (friendBusy) return;
            setFriendBusy(true);
            try {
              await friendApi.unfriend(profile._id);
              setFriendStatus('none');
            } catch (err) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hủy kết bạn.');
            } finally {
              setFriendBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleMessage = async () => {
    if (!profile || messaging) return;
    setMessaging(true);
    try {
      const res  = await conversationApi.createDm(profile._id);
      const conv = res.data.data;
      const si   = getLiveStatusInfo(profile);
      navigation.push('Message', {
        conversation: {
          id:           conv._id?.toString(),
          name:         profile.displayName || profile.username || 'Người dùng',
          avatar:       profile.avatar,
          type:         'dm',
          status:       si.statusKey || 'offline',
          online:       isUserOnline(profile._id),
          otherUserId:  profile._id?.toString(),
          usernameColor: profile.usernameColor,
          lastMessage: '', time: '', unread: 0,
        },
      });
    } catch (err) {
      console.error('handleMessage error:', err);
      Alert.alert('Lỗi', 'Không thể mở cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      setMessaging(false);
    }
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

  const si = getLiveStatusInfo(profile);
  const ls = getLastSeen(profile._id);
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
        <View style={s.bannerGradient} />

        {/* Avatar + status */}
        <View style={s.avatarFloatRow}>
          <View style={[s.avatarRing, { borderColor: si.color }]}>
            <Avatar name={profile.displayName} avatar={profile.avatar} size={80} />
          </View>
          <View style={{ alignItems: 'flex-start' }}>
            <View style={[s.statusBubble, { backgroundColor: si.color + '20', borderColor: si.color + '60' }]}>
              <View style={[s.statusDot, { backgroundColor: si.color }]} />
              <Text style={[s.statusBubbleText, { color: si.color }]} numberOfLines={1}>
                {si.label}
              </Text>
            </View>
            {si.statusKey === 'offline' && !isOwn && ls ? (
              <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>
                Hoạt động {formatLastSeen(ls)}
              </Text>
            ) : null}
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
        {!isOwn ? (
          <View style={s.actionRow}>
            {/* Message button */}
            <ActionBtn
              icon={messaging ? '⏳' : '💬'}
              label={messaging ? 'Đang mở...' : 'Nhắn tin'}
              onPress={handleMessage}
              primary
            />

            {/* Friend button based on relationship status */}
            {friendStatus === null && (
              <ActionBtn icon="⏳" label="Đang tải..." onPress={() => {}} />
            )}
            {friendStatus === 'none' && (
              <ActionBtn
                icon={friendBusy ? '⏳' : '🤝'}
                label={friendBusy ? 'Đang gửi...' : 'Kết bạn'}
                onPress={handleSendRequest}
              />
            )}
            {friendStatus === 'sent' && (
              <ActionBtn
                icon={friendBusy ? '⏳' : '✉️'}
                label={friendBusy ? 'Đang hủy...' : 'Đã gửi lời mời'}
                onPress={handleCancelRequest}
              />
            )}
            {friendStatus === 'friends' && (
              <ActionBtn
                icon={friendBusy ? '⏳' : '👥'}
                label={friendBusy ? 'Đang hủy...' : 'Hủy kết bạn'}
                onPress={handleUnfriend}
              />
            )}

            {/* Call button */}
            <ActionBtn icon="📞" label="Gọi điện" onPress={() => Alert.alert('Gọi điện', 'Tính năng sẽ sớm ra mắt!')} />
          </View>
        ) : (
          <View style={s.ownActionRow}>
            <TouchableOpacity style={s.ownActionBtn} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.78}>
              <Text style={s.ownActionBtnIcon}>🔒</Text>
              <Text style={s.ownActionBtnText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Incoming request row (accept / reject) */}
        {!isOwn && friendStatus === 'received' && (
          <View style={[s.actionRow, { marginTop: -8 }]}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnPrimary, { flex: 1 }]}
              onPress={handleAcceptRequest}
              activeOpacity={0.78}
              disabled={friendBusy}
            >
              <Text style={s.actionBtnIcon}>✅</Text>
              <Text style={[s.actionBtnLabel, { color: '#fff' }]}>{friendBusy ? 'Đang xử lý...' : 'Chấp nhận'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { flex: 1 }]}
              onPress={handleRejectRequest}
              activeOpacity={0.78}
              disabled={friendBusy}
            >
              <Text style={s.actionBtnIcon}>❌</Text>
              <Text style={s.actionBtnLabel}>{friendBusy ? 'Đang xử lý...' : 'Từ chối'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status text */}
        {profile.statusText ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>TRẠNG THÁI TÙY CHỈNH</Text>
            <View style={s.bioCard}>
              <Text style={s.bioText}>{profile.statusText}</Text>
            </View>
          </View>
        ) : null}

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
            {profile.phone && <InfoRow icon="📱" label="Số điện thoại" value={profile.phone} sep />}
            {profile.authProvider && (
              <InfoRow
                icon="🔐"
                label="Loại tài khoản"
                value={profile.authProvider === 'local' ? 'Tài khoản local' : `OAuth (${profile.authProvider})`}
                sep
              />
            )}
            {(typeof profile.isEmailVerified === 'boolean' || typeof profile.isPhoneVerified === 'boolean') && (
              <View style={s.verifyBox}>
                {typeof profile.isEmailVerified === 'boolean' && (
                  <Text style={s.verifyText}>Email: {profile.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</Text>
                )}
                {typeof profile.isPhoneVerified === 'boolean' && (
                  <Text style={s.verifyText}>SĐT: {profile.isPhoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}</Text>
                )}
              </View>
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
  ownActionRow: { paddingHorizontal: 16, marginBottom: 16 },
  ownActionBtn: {
    backgroundColor: 'rgba(237,66,69,0.12)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(237,66,69,0.35)',
    flexDirection: 'row',
    gap: 8,
  },
  ownActionBtnIcon: { fontSize: 18 },
  ownActionBtnText: { color: '#ed4245', fontSize: 13, fontWeight: '700' },

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
  verifyBox: { gap: 6, marginTop: 2 },
  verifyText: { fontSize: 12, color: THEME.textSecondary, fontWeight: '600' },
});
