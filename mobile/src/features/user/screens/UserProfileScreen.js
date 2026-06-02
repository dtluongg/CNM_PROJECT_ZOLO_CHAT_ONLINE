import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { formatLastSeen } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { usePresence } from '../../../context/PresenceContext';
import { useLanguage } from '../../../context/LanguageContext';

import { useUserProfile } from '../hooks/useUserProfile';
import { getLiveStatusInfo } from '../utils/statusHelpers';
import Avatar from '../components/Avatar';
import ActionButton from '../components/ActionButton';
import InfoRow from '../components/InfoRow';
import StatusBubble from '../components/StatusBubble';
import { makeStyles } from '../styles/userProfileStyles';

export default function UserProfileScreen({ route, navigation }) {
  const { user: authUser } = useAuth();
  const { t, language } = useLanguage();
  const { theme: THEME } = useTheme();
  const s = useMemo(() => makeStyles(THEME), [THEME]);
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
        <Text style={{ color: THEME.textMuted, marginTop: 10 }}>{t('common.loading_profile')}</Text>
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
            <StatusBubble color={si.color} label={t(`chat.status.${si.statusKey}`)} styles={s} />
            {si.statusKey === 'offline' && !isOwn && ls ? (
              <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>
                {t('chat.status.active_time', { time: formatLastSeen(ls) })}
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
              label={messaging ? t('common.opening') : t('friends.send_message')}
              onPress={handleMessage}
              primary
              styles={s}
            />

            {friendStatus === null && (
              <ActionButton icon="⏳" label={t('common.loading')} onPress={() => {}} styles={s} />
            )}
            {friendStatus === 'none' && (
              <ActionButton
                icon={friendBusy ? '⏳' : '🤝'}
                label={friendBusy ? t('common.sending') : t('friends.add_friend')}
                onPress={handleSendRequest}
                styles={s}
              />
            )}
            {friendStatus === 'sent' && (
              <ActionButton
                icon={friendBusy ? '⏳' : '✉️'}
                label={friendBusy ? t('common.cancelling') : t('friends.request_sent_label')}
                onPress={handleCancelRequest}
                styles={s}
              />
            )}
            {friendStatus === 'friends' && (
              <ActionButton
                icon={friendBusy ? '⏳' : '👥'}
                label={friendBusy ? t('common.cancelling') : t('friends.unfriend')}
                onPress={handleUnfriend}
                styles={s}
              />
            )}

            <ActionButton icon="📞" label={t('chat.voice_call')} onPress={() => Alert.alert(t('chat.voice_call'), t('common.feature_coming_soon'))} styles={s} />
          </View>
        ) : (
          <View style={s.ownActionRow}>
            <TouchableOpacity style={s.ownActionBtn} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.78}>
              <Text style={s.ownActionBtnIcon}>🔒</Text>
              <Text style={s.ownActionBtnText}>{t('user.change_password')}</Text>
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
              <Text style={[s.actionBtnLabel, { color: '#fff' }]}>{friendBusy ? t('common.processing') : t('friends.accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { flex: 1 }]}
              onPress={handleRejectRequest}
              activeOpacity={0.78}
              disabled={friendBusy}
            >
              <Text style={s.actionBtnIcon}>❌</Text>
              <Text style={s.actionBtnLabel}>{friendBusy ? t('common.processing') : t('friends.reject')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {profile.statusText ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('user.custom_status_title')}</Text>
            <View style={s.bioCard}>
              <Text style={s.bioText}>{profile.statusText}</Text>
            </View>
          </View>
        ) : null}

        {profile.bio ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('user.bio_title')}</Text>
            <View style={s.bioCard}>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('user.member_info_title')}</Text>
          <View style={s.infoCard}>
            {profile.email && <InfoRow icon="📧" label="Email" value={profile.email} styles={s} />}
            {profile.username && <InfoRow icon="🏷️" label={t('user.username')} value={`@${profile.username}`} sep styles={s} />}
            {profile.createdAt && (
              <InfoRow
                icon="📅"
                label={t('user.joined_date')}
                value={new Date(profile.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long' })}
                sep
                styles={s}
              />
            )}
            {profile.phone && <InfoRow icon="📱" label={t('user.phone')} value={profile.phone} sep styles={s} />}
            {profile.authProvider && (
              <InfoRow
                icon="🔐"
                label={t('user.account_type')}
                value={profile.authProvider === 'local' ? t('user.local_account') : `OAuth (${profile.authProvider})`}
                sep
                styles={s}
              />
            )}
            {(typeof profile.isEmailVerified === 'boolean' || typeof profile.isPhoneVerified === 'boolean') && (
              <View style={s.verifyBox}>
                {typeof profile.isEmailVerified === 'boolean' && (
                  <Text style={s.verifyText}>Email: {profile.isEmailVerified ? t('user.verified') : t('user.unverified')}</Text>
                )}
                {typeof profile.isPhoneVerified === 'boolean' && (
                  <Text style={s.verifyText}>{t('user.phone')}: {profile.isPhoneVerified ? t('user.verified') : t('user.unverified')}</Text>
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