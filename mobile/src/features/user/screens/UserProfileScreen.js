import React from 'react';
import {
  View, Text, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { THEME, formatLastSeen } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { usePresence } from '../../../context/PresenceContext';

import { useUserProfile } from '../hooks/useUserProfile';
import { getLiveStatusInfo } from '../utils/statusHelpers';
import Avatar from '../components/Avatar';
import ActionButton from '../components/ActionButton';
import InfoRow from '../components/InfoRow';
import StatusBubble from '../components/StatusBubble';
import { styles as s } from '../styles/userProfileStyles';

export default function UserProfileScreen({ route, navigation }) {
  const { user: authUser } = useAuth();
  const { isUserOnline, getPresenceStatus, getLastSeen, getStatusText } = usePresence();

  const {
    profile,
    loading,
    messaging,
    friendStatus,
    friendRequestId,
    friendBusy,
    handleSendRequest,
    handleCancelRequest,
    handleAcceptRequest,
    handleRejectRequest,
    handleUnfriend,
    handleMessage,
  } = useUserProfile({
    route,
    navigation,
    authUser,
    isUserOnline,
    getPresenceStatus,
    getLastSeen,
    getStatusText,
    getLiveStatusInfo: (user) => getLiveStatusInfo(user, isUserOnline, getPresenceStatus),
  });

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

  const si = getLiveStatusInfo(profile, isUserOnline, getPresenceStatus);
  const ls = getLastSeen(profile._id);
  const isOwn = authUser?._id === profile._id;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{profile.displayName}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {profile.banner
          ? <Image source={{ uri: profile.banner }} style={s.banner} />
          : <View style={[s.banner, { backgroundColor: profile.usernameColor || THEME.accent }]} />
        }
        <View style={s.bannerGradient} />

        <View style={s.avatarFloatRow}>
          <View style={[s.avatarRing, { borderColor: si.color }]}>
            <Avatar name={profile.displayName} avatar={profile.avatar} size={80} />
          </View>
          <View style={{ alignItems: 'flex-start' }}>
            <StatusBubble color={si.color} label={si.label} />
            {si.statusKey === 'offline' && !isOwn && ls ? (
              <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>
                Hoạt động {formatLastSeen(ls)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={s.nameBlock}>
          <Text style={[s.displayName, { color: profile.usernameColor || THEME.textPrimary }]}>
            {profile.displayName}
          </Text>
          {profile.username ? <Text style={s.handle}>@{profile.username}</Text> : null}
          {(() => {
            const cst = getStatusText(profile._id) || profile.statusText;
            return cst ? (
              <Text style={s.statusTextLine} numberOfLines={2}>{cst}</Text>
            ) : null;
          })()}
        </View>

        {!isOwn ? (
          <View style={s.actionRow}>
            <ActionButton
              icon={messaging ? '⏳' : '💬'}
              label={messaging ? 'Đang mở...' : 'Nhắn tin'}
              onPress={handleMessage}
              primary
            />

            {friendStatus === null && (
              <ActionButton icon="⏳" label="Đang tải..." onPress={() => {}} />
            )}
            {friendStatus === 'none' && (
              <ActionButton
                icon={friendBusy ? '⏳' : '🤝'}
                label={friendBusy ? 'Đang gửi...' : 'Kết bạn'}
                onPress={handleSendRequest}
              />
            )}
            {friendStatus === 'sent' && (
              <ActionButton
                icon={friendBusy ? '⏳' : '✉️'}
                label={friendBusy ? 'Đang hủy...' : 'Đã gửi lời mời'}
                onPress={handleCancelRequest}
              />
            )}
            {friendStatus === 'friends' && (
              <ActionButton
                icon={friendBusy ? '⏳' : '👥'}
                label={friendBusy ? 'Đang hủy...' : 'Hủy kết bạn'}
                onPress={handleUnfriend}
              />
            )}

            <ActionButton icon="📞" label="Gọi điện" onPress={() => Alert.alert('Gọi điện', 'Tính năng sẽ sớm ra mắt!')} />
          </View>
        ) : (
          <View style={s.ownActionRow}>
            <TouchableOpacity style={s.ownActionBtn} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.78}>
              <Text style={s.ownActionBtnIcon}>🔒</Text>
              <Text style={s.ownActionBtnText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {profile.statusText ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>TRẠNG THÁI TÙY CHỈNH</Text>
            <View style={s.bioCard}>
              <Text style={s.bioText}>{profile.statusText}</Text>
            </View>
          </View>
        ) : null}

        {profile.bio ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>GIỚI THIỆU</Text>
            <View style={s.bioCard}>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

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