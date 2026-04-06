import React, { useState, useCallback } from 'react';
import { usePresence } from '../context/PresenceContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../services/apiClient';
import { uploadImageToSupabase } from '../services/storageUpload';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';

const COLOR_PALETTE = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#faa61a', '#ed4245', '#9b59b6', '#e67e22',
  '#1abc9c', '#3498db', '#e91e63', '#ff5722',
];

const STATUS_OPTIONS = ['online', 'idle', 'dnd', 'invisible'];

const Avatar = ({ name, avatar, size = 48, status }) => {
  const bg = getAvatarColor(name);
  const dotSize = Math.round(size * 0.3);
  const sc = STATUS_CONFIG[status]?.color || THEME.statusOffline || '#666';

  return (
    <View style={{ width: size, height: size }}>
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {status && (
        <View
          style={{
            position: 'absolute',
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: sc,
            bottom: 0,
            right: 0,
            borderWidth: 2.5,
            borderColor: THEME.bgSecondary,
          }}
        />
      )}
    </View>
  );
};

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { updateMyStatus, isUserOnline, getPresenceStatus, presenceMap } = usePresence();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('info');
  const [editModal, setEditModal] = useState(false);
  const [colorModal, setColorModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selStatus, setSelStatus] = useState('online');

  // ==================== LẤY STATUS REALTIME ====================
  // ==================== LIVE STATUS (SỬA LẠI) ====================
  const getMyLiveStatus = useCallback(() => {
    const myId = profile?._id || user?._id;
    if (!myId) {
      return STATUS_CONFIG.online; // fallback an toàn
    }

    const online = isUserOnline(myId);
    const presStatus = getPresenceStatus(myId);

    let statusKey = 'offline';

    if (online && presStatus) {
      statusKey = presStatus;
    } else if (profile?.status && profile.status !== 'invisible') {
      statusKey = profile.status;
    } else {
      statusKey = 'offline';
    }

    return STATUS_CONFIG[statusKey] || STATUS_CONFIG.online;
  }, [profile, user, isUserOnline, getPresenceStatus]);

  // Sử dụng
  const statusInfo = getMyLiveStatus();

  useFocusEffect(
    useCallback(() => {
      fetchProfile(false);
    }, [])
  );

  const fetchProfile = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.get('/auth/authme');
      const u = res.data.user;

      setProfile(u);
      setDisplayName(u.displayName || '');
      setBio(u.bio || '');
      setSelStatus(u.status || 'online');
      await updateUser(u);
    } catch (e) {
      console.error('[ProfileScreen] fetchProfile error:', e.message);
      if (!profile && user) {
        setProfile(user);
        setDisplayName(user.displayName || '');
        setBio(user.bio || '');
        setSelStatus(user.status || 'online');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAvatar(true);
    try {
      const uid = profile?._id || user?._id || 'unknown';
      const url = await uploadImageToSupabase(result.assets[0].uri, 'avatars', uid);
      await saveProfile({ avatar: url });
    } catch (e) {
      console.error('[avatar upload]', e);
      Alert.alert('Lỗi', e.message || 'Không thể tải ảnh đại diện.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingBanner(true);
    try {
      const uid = profile?._id || user?._id || 'unknown';
      const url = await uploadImageToSupabase(result.assets[0].uri, 'banners', uid);
      await saveProfile({ banner: url });
    } catch (e) {
      console.error('[banner upload]', e);
      Alert.alert('Lỗi', e.message || 'Không thể tải ảnh bìa.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveProfile = async (data) => {
    const previousProfile = profile ? { ...profile } : null;
    setSaving(true);

    try {
      const res = await apiClient.patch('/auth/update-profile', data);
      const u = res.data.user;

      setProfile(u);
      setDisplayName(u.displayName || '');
      setBio(u.bio || '');
      setSelStatus(u.status || 'online');
      await updateUser(u);

      if (data.status) {
        await updateMyStatus(data.status);
      }

      setEditModal(false);
      setColorModal(false);
      setStatusModal(false);
    } catch (e) {
      if (previousProfile) setProfile(previousProfile);
      Alert.alert('Lỗi', e.response?.data?.message || 'Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutModal(false);
    try { await apiClient.post('/users/signout'); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    await logout();
  };

  const userId = profile?._id || user?._id;
  const profileLink = userId ? `chatapp://user/${userId}` : '';

  const handleCopyLink = async () => {
    if (!profileLink) return;
    await Clipboard.setStringAsync(profileLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const d = profile;

  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
        <ActivityIndicator color={THEME.accent} size="large" />
        <Text style={s.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  if (!d) {
    return (
      <View style={s.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
        <Text style={{ fontSize: 40, marginBottom: 12 }}>😕</Text>
        <Text style={s.loadingText}>Không thể tải hồ sơ</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => fetchProfile(false)}>
          <Text style={s.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={s.header}>
        <Text style={s.headerTitle}>Hồ sơ của tôi</Text>
        <TouchableOpacity style={s.editIconBtn} onPress={() => setEditModal(true)}>
          <Text style={s.editIconText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {[
          { key: 'info', label: 'Thông tin' },
          { key: 'qr', label: 'Mã QR' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
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
          {/* Banner */}
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
                <Text style={s.bannerEditText}>✏️  Đổi ảnh bìa</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Avatar + Name + Status */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} style={s.avatarWrap}>
              {uploadingAvatar ? (
                <View
                  style={[
                    s.avatarRing,
                    {
                      borderColor: statusInfo.color,
                      backgroundColor: getAvatarColor(d.displayName),
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={[s.avatarRing, { borderColor: statusInfo.color }]}>
                  <Avatar
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
                {d.displayName || 'Tên hiển thị'}
              </Text>
              {d.username && <Text style={s.handle}>@{d.username}</Text>}
            </View>

            <TouchableOpacity
              style={[s.statusChip, { backgroundColor: statusInfo.color + '25' }]}
              onPress={() => setStatusModal(true)}
            >
              <View style={[s.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[s.statusChipText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              <Text style={[s.statusChipText, { color: statusInfo.color, fontSize: 10 }]}> ▾</Text>
            </TouchableOpacity>
          </View>

          {/* Bio */}
          {d.bio ? (
            <View style={s.bioCard}>
              <Text style={s.bioCardLabel}>GIỚI THIỆU</Text>
              <Text style={s.bioCardText}>{d.bio}</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.bioEmptyCard} onPress={() => setEditModal(true)}>
              <Text style={s.bioEmptyText}>+ Thêm giới thiệu bản thân</Text>
            </TouchableOpacity>
          )}

          {/* Thông tin thành viên */}
          <View style={s.infoCard}>
            <Text style={s.infoCardLabel}>THÔNG TIN THÀNH VIÊN</Text>
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
                    <Text style={s.infoRowLabel}>Tên người dùng</Text>
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
                    <Text style={s.infoRowLabel}>Tham gia từ</Text>
                    <Text style={s.infoRowValue}>
                      {new Date(d.createdAt).toLocaleDateString('vi-VN', {
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
                    <Text style={s.infoRowLabel}>Số điện thoại</Text>
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
                    <Text style={s.infoRowLabel}>Loại tài khoản</Text>
                    <Text style={s.infoRowValue}>
                      {d.authProvider === 'local' ? 'Tài khoản local' : `OAuth (${d.authProvider})`}
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
                      Email: {d.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                    </Text>
                  )}
                  {typeof d.isPhoneVerified === 'boolean' && (
                    <Text style={s.verifiedText}>
                      SĐT: {d.isPhoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Cài đặt */}
          <View style={s.settingsCard}>
            <Text style={s.settingsCardLabel}>CÁ NHÂN HÓA</Text>
            <SettingRow icon="✏️" label="Chỉnh sửa hồ sơ" sub="Tên, bio, trạng thái" onPress={() => setEditModal(true)} />
            <View style={s.sep} />
            <SettingRow icon="🖼️" label="Đổi ảnh đại diện" onPress={handlePickAvatar} />
            <View style={s.sep} />
            <SettingRow icon="🎨" label="Màu tên hiển thị" sub={d.usernameColor} accent={d.usernameColor} onPress={() => setColorModal(true)} />
            <View style={s.sep} />
            <SettingRow icon="🔲" label="Mã QR của tôi" sub="Chia sẻ hồ sơ qua QR" onPress={() => setTab('qr')} />
            <View style={s.sep} />
            <SettingRow icon="🔒" label="Đổi mật khẩu" sub="Cập nhật mật khẩu đăng nhập" onPress={() => navigation?.navigate('ChangePassword')} />
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={() => setLogoutModal(true)} activeOpacity={0.8}>
            <Text style={s.logoutBtnText}>🚪  Đăng xuất</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.qrScroll}>
          <View style={s.qrCard}>
            <View style={[s.qrBand, { backgroundColor: d.usernameColor || THEME.accent }]}>
              <Avatar name={d.displayName} avatar={d.avatar} size={64} status={statusInfo.key || d.status} />
            </View>
            <View style={s.qrBody}>
              <Text style={[s.qrName, { color: d.usernameColor || THEME.textPrimary }]}>{d.displayName}</Text>
              {d.username && <Text style={s.qrHandle}>@{d.username}</Text>}

              {profileLink ? (
                <View style={s.qrCodeWrap}>
                  <QRCode value={profileLink} size={196} backgroundColor="#ffffff" color="#1a1a2e" />
                </View>
              ) : (
                <View style={[s.qrCodeWrap, { justifyContent: 'center', alignItems: 'center', height: 228 }]}>
                  <ActivityIndicator color={THEME.accent} />
                </View>
              )}

              <Text style={s.qrCaption}>Quét mã này để xem hồ sơ của {d.displayName}</Text>

              <TouchableOpacity
                style={[s.copyLinkBtn, copiedLink && { backgroundColor: THEME.statusOnline }]}
                onPress={handleCopyLink}
                activeOpacity={0.8}
              >
                <Text style={s.copyLinkText}>
                  {copiedLink ? '✓  Đã sao chép!' : '🔗  Sao chép link hồ sơ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Chỉnh sửa hồ sơ</Text>

            <Text style={s.fieldLabel}>TÊN HIỂN THỊ</Text>
            <TextInput
              style={s.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tên của bạn"
              placeholderTextColor={THEME.textMuted}
              selectionColor={THEME.accent}
            />

            <Text style={s.fieldLabel}>GIỚI THIỆU BẢN THÂN</Text>
            <TextInput
              style={[s.fieldInput, { height: 88, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Nói gì đó về bạn..."
              placeholderTextColor={THEME.textMuted}
              multiline
              selectionColor={THEME.accent}
            />

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={s.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.65 }]}
                disabled={saving}
                onPress={() => saveProfile({ displayName: displayName.trim(), bio: bio.trim() })}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.saveBtnText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={statusModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Chọn trạng thái</Text>

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
                    {info.label}
                  </Text>
                  {active && <Text style={{ color: info.color, flex: 1, textAlign: 'right' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={[s.cancelBtn, { marginTop: 8 }]} onPress={() => setStatusModal(false)}>
              <Text style={s.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color Modal */}
      <Modal visible={colorModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Màu tên hiển thị</Text>
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

            <TouchableOpacity style={s.cancelBtn} onPress={() => setColorModal(false)}>
              <Text style={s.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={logoutModal} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: 28 }]}>
            <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 8 }}>👋</Text>
            <Text style={s.sheetTitle}>Đăng xuất?</Text>
            <Text
              style={{
                color: THEME.textMuted,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ZoloChat.
            </Text>

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setLogoutModal(false)}>
                <Text style={s.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: THEME.danger }]}
                onPress={handleLogout}
              >
                <Text style={s.saveBtnText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingRow({ icon, label, sub, accent, onPress }) {
  return (
    <TouchableOpacity style={s.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.settingIconWrap}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        {sub && <Text style={[s.settingSub, accent && { color: accent }]} numberOfLines={1}>{sub}</Text>}
      </View>
      <Text style={s.settingArrow}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgPrimary, gap: 12 },
  loadingText: { color: THEME.textMuted, fontSize: 14 },
  retryBtn: { marginTop: 8, backgroundColor: THEME.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  header: {
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: THEME.textPrimary },
  editIconBtn: { padding: 6 },
  editIconText: { fontSize: 20 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: THEME.accent },
  tabBtnText: { color: THEME.textMuted, fontWeight: '600', fontSize: 13 },
  tabBtnTextActive: { color: THEME.accent },

  bannerWrap: { width: '100%', height: 116, position: 'relative' },
  bannerImg: { width: '100%', height: 116 },
  bannerGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  bannerEditHint: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bannerEditText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  avatarSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: THEME.bgSecondary,
    marginBottom: 12,
  },
  avatarWrap: { marginTop: -44, marginBottom: 10, position: 'relative', alignSelf: 'flex-start' },
  avatarRing: {
    borderRadius: 48,
    borderWidth: 4,
    borderColor: THEME.statusOnline,
    backgroundColor: THEME.bgSecondary,
    padding: 2,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: THEME.bgInput,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.bgSecondary,
  },

  nameBlock: { marginBottom: 8 },
  displayName: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  handle: { fontSize: 13, color: THEME.textMuted, marginTop: 1 },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 12, fontWeight: '700' },

  bioCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: THEME.bgSecondary,
    borderRadius: 12,
    padding: 14,
  },
  bioCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  bioCardText: { color: THEME.textSecondary, fontSize: 14, lineHeight: 21 },

  bioEmptyCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
  },
  bioEmptyText: { color: THEME.textMuted, fontSize: 14 },

  infoCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: THEME.bgSecondary,
    borderRadius: 12,
    padding: 14,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoSep: { height: 1, backgroundColor: THEME.border, marginVertical: 10 },
  infoRowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoRowLabel: { fontSize: 11, color: THEME.textMuted, marginBottom: 1 },
  infoRowValue: { fontSize: 14, color: THEME.textPrimary, fontWeight: '600' },
  verifiedRow: { gap: 6 },
  verifiedText: { color: THEME.textSecondary, fontSize: 12, fontWeight: '600' },

  settingsCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: THEME.bgSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: { fontSize: 15, color: THEME.textPrimary, fontWeight: '500' },
  settingSub: { fontSize: 12, color: THEME.textMuted, marginTop: 1 },
  settingArrow: { fontSize: 20, color: THEME.textMuted },
  sep: { height: 1, backgroundColor: THEME.border, marginLeft: 62 },

  logoutBtn: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: THEME.danger + '18',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.danger + '44',
  },
  logoutBtnText: { color: THEME.danger, fontWeight: '700', fontSize: 15 },

  qrScroll: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  qrCard: {
    backgroundColor: THEME.bgSecondary,
    borderRadius: 20,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qrBand: { height: 88, justifyContent: 'flex-end', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: -32 },
  qrBody: { padding: 20, paddingTop: 28, alignItems: 'center' },
  qrName: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  qrHandle: { fontSize: 13, color: THEME.textMuted, marginBottom: 20 },
  qrCodeWrap: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  qrCaption: { fontSize: 12, color: THEME.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  copyLinkBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  copyLinkText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: THEME.bgSecondary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.textMuted + '66',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary, textAlign: 'center', marginBottom: 20 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: THEME.bgInput,
    borderRadius: 10,
    padding: 13,
    color: THEME.textPrimary,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: THEME.bgInput,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: THEME.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1,
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  statusOptionText: { fontSize: 15, color: THEME.textPrimary, fontWeight: '500' },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    marginBottom: 20,
  },
  colorSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchActive: { borderWidth: 3.5, borderColor: '#fff' },
});