import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  RefreshControl,
  Pressable,
} from 'react-native';
import { usePresence } from '../../../context/PresenceContext';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { supabase } from '../../../config/supabase';
import apiClient from '../../../services/apiClient';
import { THEME, STATUS_CONFIG } from '../../../theme';

import { useProfile } from '../hooks/useProfile';
import { getMyLiveStatus, COLOR_PALETTE, STATUS_OPTIONS } from '../utils/profileHelpers';
import ProfileAvatar from '../components/ProfileAvatar';
import SettingRow from '../components/SettingRow';
import TabButton from '../components/TabButton';
import { styles as s } from '../styles/profileStyles';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { isUserOnline, getPresenceStatus } = usePresence();
  const { t, language, changeLanguage } = useLanguage();

  const [langModal, setLangModal] = useState(false);

  const {
    profile,
    loading,
    refreshing,
    tab,
    editModal,
    colorModal,
    logoutModal,
    statusModal,
    saving,
    uploadingAvatar,
    uploadingBanner,
    copiedLink,
    displayName,
    bio,
    statusText,
    selStatus,
    setTab,
    setEditModal,
    setColorModal,
    setLogoutModal,
    setStatusModal,
    setDisplayName,
    setBio,
    setStatusText,
    setSelStatus,
    fetchProfile,
    handlePickAvatar,
    handlePickBanner,
    saveProfile,
    handleCopyLink,
  } = useProfile({ user, updateUser, navigation });

  const statusInfo = getMyLiveStatus({ profile, user, isUserOnline, getPresenceStatus });

  const handleLogout = async () => {
    setLogoutModal(false);
    try { await apiClient.post('/users/signout'); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    await logout();
  };

  const userId = profile?._id || user?._id;
  const profileLink = userId ? `chatapp://user/${userId}` : '';
  const d = profile;

  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
        <ActivityIndicator color={THEME.accent} size="large" />
        <Text style={s.loadingText}>{t('profile.loading')}</Text>
      </View>
    );
  }

  if (!d) {
    return (
      <View style={s.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
        <Text style={{ fontSize: 40, marginBottom: 12 }}>😕</Text>
        <Text style={s.loadingText}>{t('profile.load_error')}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => fetchProfile(false)}>
          <Text style={s.retryBtnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={s.header}>
        <Text style={s.headerTitle}>{t('profile.title')}</Text>
        <TouchableOpacity style={s.editIconBtn} onPress={() => setEditModal(true)}>
          <Text style={s.editIconText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        <TabButton tabKey="info" label={t('profile.tabs.info')} active={tab === 'info'} onPress={() => setTab('info')} />
        <TabButton tabKey="qr" label={t('profile.tabs.qr')} active={tab === 'qr'} onPress={() => setTab('qr')} />
      </View>

      {tab === 'info' ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProfile(true)}
              tintColor={THEME.accent}
              colors={[THEME.accent]}
            />
          }
        >
          <TouchableOpacity activeOpacity={0.88} onPress={handlePickBanner} style={s.bannerWrap}>
            {d.banner ? (
              <Image source={{ uri: d.banner }} style={s.bannerImg} />
            ) : (
              <View style={[s.bannerImg, { backgroundColor: d.usernameColor || THEME.accent }]} />
            )}
            <View style={s.bannerGradient} />
            <View style={s.bannerEditHint}>
              {uploadingBanner ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.bannerEditText}>✏️  {t('profile.change_banner')}</Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} style={s.avatarWrap}>
              {uploadingAvatar ? (
                <View
                  style={[
                    s.avatarRing,
                    {
                      borderColor: statusInfo.color,
                      backgroundColor: '#5865f2',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={[s.avatarRing, { borderColor: statusInfo.color }]}>
                  <ProfileAvatar
                    name={d.displayName}
                    avatar={d.avatar}
                    size={76}
                    status={statusInfo?.key || d?.status || 'online'}
                  />
                </View>
              )}
              <View style={s.cameraIcon}>
                <Text style={{ fontSize: 12 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={s.nameBlock}>
              <Text
                style={[s.displayName, { color: d.usernameColor || THEME.textPrimary }]}
                numberOfLines={1}
              >
                {d.displayName || t('profile.display_name_placeholder')}
              </Text>
              {d.username ? <Text style={s.handle}>@{d.username}</Text> : null}
              {d.statusText ? (
                <Text style={s.statusTextLine} numberOfLines={1}>{d.statusText}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[s.statusChip, { backgroundColor: statusInfo.color + '25' }]}
              onPress={() => setStatusModal(true)}
            >
              <View style={[s.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[s.statusChipText, { color: statusInfo.color }]}>{t(`chat.status.${statusInfo.key}`)}</Text>
              <Text style={[s.statusChipText, { color: statusInfo.color, fontSize: 10 }]}> ▾</Text>
            </TouchableOpacity>
          </View>

          {d.bio ? (
            <View style={s.bioCard}>
              <Text style={s.bioCardLabel}>{t('profile.bio_label')}</Text>
              <Text style={s.bioCardText}>{d.bio}</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.bioEmptyCard} onPress={() => setEditModal(true)}>
              <Text style={s.bioEmptyText}>+ {t('profile.add_bio')}</Text>
            </TouchableOpacity>
          )}

          <View style={s.infoCard}>
            <Text style={s.settingsCardLabel}>{t('profile.member_info')}</Text>
            <View style={s.infoRow}>
              <Text style={s.infoRowIcon}>📧</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.infoRowLabel}>Email</Text>
                <Text style={s.infoRowValue}>{d.email || '—'}</Text>
              </View>
            </View>

            {d.username && (
              <>
                <View style={s.infoSep} />
                <View style={s.infoRow}>
                  <Text style={s.infoRowIcon}>🏷️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoRowLabel}>{t('profile.username')}</Text>
                    <Text style={s.infoRowValue}>@{d.username}</Text>
                  </View>
                </View>
              </>
            )}

            {d.createdAt && (
              <>
                <View style={s.infoSep} />
                <View style={s.infoRow}>
                  <Text style={s.infoRowIcon}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoRowLabel}>{t('profile.joined_at')}</Text>
                    <Text style={s.infoRowValue}>
                      {new Date(d.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {d.phone && (
              <>
                <View style={s.infoSep} />
                <View style={s.infoRow}>
                  <Text style={s.infoRowIcon}>📱</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoRowLabel}>{t('profile.phone')}</Text>
                    <Text style={s.infoRowValue}>{d.phone}</Text>
                  </View>
                </View>
              </>
            )}

            {d.authProvider && (
              <>
                <View style={s.infoSep} />
                <View style={s.infoRow}>
                  <Text style={s.infoRowIcon}>🔐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoRowLabel}>{t('profile.account_type')}</Text>
                    <Text style={s.infoRowValue}>
                      {d.authProvider === 'local' ? t('profile.local_account') : `OAuth (${d.authProvider})`}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {(typeof d.isEmailVerified === 'boolean' || typeof d.isPhoneVerified === 'boolean') && (
              <>
                <View style={s.infoSep} />
                <View style={s.verifiedRow}>
                  {typeof d.isEmailVerified === 'boolean' && (
                    <Text style={s.verifiedText}>
                      Email: {d.isEmailVerified ? t('profile.verified') : t('profile.unverified')}
                    </Text>
                  )}
                  {typeof d.isPhoneVerified === 'boolean' && (
                    <Text style={s.verifiedText}>
                      {t('profile.phone')}: {d.isPhoneVerified ? t('profile.verified') : t('profile.unverified')}
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>

          <View style={s.settingsCard}>
            <Text style={s.settingsCardLabel}>{t('profile.personalization')}</Text>
            <SettingRow icon="✏️" label={t('profile.edit_profile')} sub={t('profile.edit_profile_sub')} onPress={() => setEditModal(true)} />
            <View style={s.sep} />
            <SettingRow icon="🖼️" label={t('profile.change_avatar')} onPress={handlePickAvatar} />
            <View style={s.sep} />
            <SettingRow icon="🎨" label={t('profile.username_color')} sub={d.usernameColor} accent={d.usernameColor} onPress={() => setColorModal(true)} />
            <View style={s.sep} />
            <SettingRow 
              icon="🌐" 
              label={t('profile.language')} 
              sub={language === 'vi' ? t('profile.vietnamese') : t('profile.english')} 
              onPress={() => setLangModal(true)} 
            />
            <View style={s.sep} />
            <SettingRow icon="🔲" label={t('profile.my_qr')} sub={t('profile.my_qr_sub')} onPress={() => setTab('qr')} />
            <View style={s.sep} />
            <SettingRow icon="🔒" label={t('profile.change_password')} sub={t('profile.change_password_sub')} onPress={() => navigation?.navigate('ChangePassword')} />
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={() => setLogoutModal(true)} activeOpacity={0.8}>
            <Text style={s.logoutBtnText}>🚪  {t('profile.logout')}</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.qrScroll}>
          <View style={s.qrCard}>
            <View style={[s.qrBand, { backgroundColor: d.usernameColor || THEME.accent }]}>
              <ProfileAvatar name={d.displayName} avatar={d.avatar} size={64} status={statusInfo.key || d.status} />
            </View>
            <View style={s.qrBody}>
              <Text style={[s.qrName, { color: d.usernameColor || THEME.textPrimary }]}>{d.displayName}</Text>
              {d.username ? <Text style={s.qrHandle}>@{d.username}</Text> : null}

              {profileLink ? (
                <View style={s.qrCodeWrap}>
                  <QRCode value={profileLink} size={196} backgroundColor="#ffffff" color="#1a1a2e" />
                </View>
              ) : (
                <View style={[s.qrCodeWrap, { justifyContent: 'center', alignItems: 'center', height: 228 }]}>
                  <ActivityIndicator color={THEME.accent} />
                </View>
              )}

              <Text style={s.qrCaption}>{t('profile.qr_caption', { name: d.displayName })}</Text>

              <TouchableOpacity
                style={[s.copyLinkBtn, copiedLink && { backgroundColor: THEME.statusOnline }]}
                onPress={() => handleCopyLink(profileLink)}
                activeOpacity={0.8}
              >
                <Text style={s.copyLinkText}>
                  {copiedLink ? `✓  ${t('common.copied')}` : `🔗  ${t('profile.copy_link')}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <Pressable style={s.overlay} onPress={() => setEditModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t('profile.edit_modal_title')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setEditModal(false)}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* Content continues below... */}
            <Text style={s.fieldLabel}>{t('profile.display_name_label')}</Text>
            <TextInput
              style={s.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile.display_name_placeholder')}
              placeholderTextColor={THEME.textMuted}
              selectionColor={THEME.accent}
            />

            <Text style={s.fieldLabel}>{t('profile.bio_label')}</Text>
            <TextInput
              style={[s.fieldInput, { height: 88, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder={t('profile.bio_placeholder')}
              placeholderTextColor={THEME.textMuted}
              multiline
              selectionColor={THEME.accent}
            />

            <Text style={s.fieldLabel}>{t('profile.custom_status_label')}</Text>
            <TextInput
              style={s.fieldInput}
              value={statusText}
              onChangeText={setStatusText}
              placeholder={t('profile.custom_status_placeholder')}
              placeholderTextColor={THEME.textMuted}
              maxLength={128}
              selectionColor={THEME.accent}
            />

            <View style={s.sheetBtns}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: 'transparent' }]} onPress={() => setEditModal(false)}>
                <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.65 }]}
                disabled={saving}
                onPress={() => saveProfile({ displayName: displayName.trim(), bio: bio.trim(), statusText: statusText.trim() })}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.saveBtnText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={statusModal} animationType="slide" transparent onRequestClose={() => setStatusModal(false)}>
        <Pressable style={s.overlay} onPress={() => setStatusModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t('profile.select_status')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setStatusModal(false)}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {STATUS_OPTIONS.map((st) => {
              const info = STATUS_CONFIG[st];
              const active = selStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.statusOption, active && { backgroundColor: info.color + '18', borderColor: info.color }]}
                  onPress={() => {
                    setSelStatus(st);
                    saveProfile({ status: st });
                  }}
                >
                  <View
                    style={[
                      s.statusDot,
                      { backgroundColor: info.color, width: 12, height: 12, borderRadius: 6 },
                    ]}
                  />
                  <Text
                    style={[
                      s.statusOptionText,
                      active && { color: info.color, fontWeight: '700' },
                    ]}
                  >
                    {t(`chat.status.${st}`)}
                  </Text>
                  {active && <Text style={{ color: info.color, flex: 1, textAlign: 'right' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={colorModal} animationType="slide" transparent onRequestClose={() => setColorModal(false)}>
        <Pressable style={s.overlay} onPress={() => setColorModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t('profile.username_color')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setColorModal(false)}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: d.usernameColor || THEME.accent,
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {d.displayName}
            </Text>

            <View style={s.colorGrid}>
              {COLOR_PALETTE.map((color) => {
                const active = d.usernameColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[s.colorSwatch, { backgroundColor: color }, active && s.colorSwatchActive]}
                    onPress={() => saveProfile({ usernameColor: color })}
                    disabled={saving}
                  >
                    {active && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {saving && <ActivityIndicator color={THEME.accent} style={{ marginBottom: 8 }} />}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={logoutModal} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: 28 }]}>
            <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 8 }}>👋</Text>
            <Text style={s.sheetTitle}>{t('profile.logout_confirm_title')}</Text>
            <Text
              style={{
                color: THEME.textMuted,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              {t('profile.logout_confirm_desc')}            </Text>

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setLogoutModal(false)}>
                <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: THEME.danger || '#ed4245' }]}
                onPress={handleLogout}
              >
                <Text style={s.saveBtnText}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={langModal} animationType="slide" transparent onRequestClose={() => setLangModal(false)}>
        <Pressable style={s.overlay} onPress={() => setLangModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t('profile.select_language')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setLangModal(false)}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.statusOption, language === 'vi' && { backgroundColor: THEME.accent + '18', borderColor: THEME.accent }]}
              onPress={() => {
                changeLanguage('vi');
                setLangModal(false);
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>🇻🇳</Text>
              <Text style={[s.statusOptionText, language === 'vi' && { color: THEME.accent, fontWeight: '700' }]}>
                {t('profile.vietnamese')}
              </Text>
              {language === 'vi' && <Text style={{ color: THEME.accent, flex: 1, textAlign: 'right' }}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.statusOption, language === 'en' && { backgroundColor: THEME.accent + '18', borderColor: THEME.accent }]}
              onPress={() => {
                changeLanguage('en');
                setLangModal(false);
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>🇺🇸</Text>
              <Text style={[s.statusOptionText, language === 'en' && { color: THEME.accent, fontWeight: '700' }]}>
                {t('profile.english')}
              </Text>
              {language === 'en' && <Text style={{ color: THEME.accent, flex: 1, textAlign: 'right' }}>✓</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}