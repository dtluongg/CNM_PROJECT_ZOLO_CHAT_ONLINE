/**
 * ProfileScreen – full profile management
 * Used as the "Hồ sơ" tab content inside MainTabScreen.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, TextInput, Alert, ActivityIndicator,
  Modal, StatusBar, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../services/apiClient';
import { uploadImageToSupabase } from '../services/storageUpload';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';

// ─── Avatar component ─────────────────────────────────────────────
const Avatar = ({ name, avatar, size = 48, status = null }) => {
  const bg = getAvatarColor(name);
  const dotSize = Math.floor(size * 0.28);
  const sc = STATUS_CONFIG[status]?.color || THEME.statusOnline;
  return (
    <View style={{ width: size, height: size }}>
      {avatar
        ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        : (
          <View style={[s.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
            <Text style={[s.avatarText, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
          </View>
        )
      }
      {status && (
        <View style={[s.statusDot, {
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          backgroundColor: sc, bottom: -1, right: -1,
        }]} />
      )}
    </View>
  );
};

// ─── Color swatch ─────────────────────────────────────────────────
const COLOR_PALETTE = [
  '#5865f2','#eb459e','#00b4d8','#57f287',
  '#faa61a','#ed4245','#9b59b6','#e67e22',
  '#1abc9c','#3498db','#e91e63','#ff5722',
];

const STATUS_OPTIONS = ['online','idle','dnd','invisible'];

// ─── PROFILE SCREEN ───────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('info'); // 'info' | 'qr'
  const [editModal, setEditModal] = useState(false);
  const [colorModal, setColorModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio]               = useState('');
  const [selStatus, setSelStatus]   = useState('online');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/auth/authme');
      const u = res.data.user;
      setProfile(u);
      setDisplayName(u.displayName || '');
      setBio(u.bio || '');
      setSelStatus(u.status || 'online');
    } catch {
      if (user) {
        setProfile(user);
        setDisplayName(user.displayName || '');
        setBio(user.bio || '');
        setSelStatus(user.status || 'online');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pick & upload avatar ────────────────────────────────────────
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploadingAvatar(true);
    try {
      const uid = profile?._id || user?._id || 'unknown';
      const publicUrl = await uploadImageToSupabase(asset.uri, 'avatars', uid);
      await saveProfile({ avatar: publicUrl });
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên. Thử lại nhé!');
      console.error('[ProfileScreen] avatar upload error:', e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Pick & upload banner ────────────────────────────────────────
  const handlePickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploadingBanner(true);
    try {
      const uid = profile?._id || user?._id || 'unknown';
      const publicUrl = await uploadImageToSupabase(asset.uri, 'banners', uid);
      await saveProfile({ banner: publicUrl });
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải ảnh bìa lên. Thử lại nhé!');
      console.error('[ProfileScreen] banner upload error:', e);
    } finally {
      setUploadingBanner(false);
    }
  };

  // ── Save profile to backend ─────────────────────────────────────
  const saveProfile = async (data) => {
    setSaving(true);
    try {
      const res = await apiClient.patch('/auth/update-profile', data);
      const updated = res.data.user;
      setProfile(updated);
      await updateUser(updated);
      setDisplayName(updated.displayName || '');
      setBio(updated.bio || '');
      setSelStatus(updated.status || 'online');
      setEditModal(false);
      setColorModal(false);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutModal(false);
    try { await apiClient.post('/users/signout'); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    await logout();
  };

  // ── Copy profile link ─────────────────────────────────────────
  const userId = profile?._id || user?._id;
  const profileLink = userId ? `chatapp://user/${userId}` : '';

  const handleCopyLink = async () => {
    if (!profileLink) return;
    await Clipboard.setStringAsync(profileLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const d = profile || user;
  const statusInfo = STATUS_CONFIG[d?.status || 'online'] || STATUS_CONFIG.online;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: THEME.bgTertiary }]}>
        <ActivityIndicator color={THEME.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>👤 Hồ sơ của tôi</Text>
      </View>

      {/* Tab switcher */}
      <View style={s.tabRow}>
        {['info', 'qr'].map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>
              {t === 'info' ? '📋 Thông tin' : '🔲 Mã QR'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'info' ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Banner */}
          <TouchableOpacity onPress={handlePickBanner} activeOpacity={0.85} style={{ position: 'relative' }}>
            {d?.banner
              ? <Image source={{ uri: d.banner }} style={s.banner} />
              : <View style={[s.banner, { backgroundColor: d?.usernameColor || THEME.accent }]} />
            }
            {uploadingBanner
              ? <View style={s.bannerOverlay}><ActivityIndicator color="#fff" /></View>
              : <View style={s.bannerOverlay}><Text style={s.bannerOverlayText}>✏️ Đổi ảnh bìa</Text></View>
            }
          </TouchableOpacity>

          {/* Avatar row */}
          <View style={s.avatarRow}>
            <TouchableOpacity onPress={handlePickAvatar} style={s.avatarWrap}>
              {uploadingAvatar
                ? (
                  <View style={[s.avatarLoading, { backgroundColor: getAvatarColor(d?.displayName) }]}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )
                : <Avatar name={d?.displayName} avatar={d?.avatar} size={80} status={d?.status} />
              }
              <View style={s.editBadge}><Text style={{ fontSize: 14 }}>✏️</Text></View>
            </TouchableOpacity>
          </View>

          {/* Name + status */}
          <View style={s.profileInfo}>
            <Text style={[s.profileName, { color: d?.usernameColor || THEME.textPrimary }]}>
              {d?.displayName || 'Tên hiển thị'}
            </Text>
            {d?.username && <Text style={s.profileHandle}>@{d.username}</Text>}
            <View style={[s.statusPill, { backgroundColor: statusInfo.color + '22', borderColor: statusInfo.color + '55' }]}>
              <View style={[s.statusDotInline, { backgroundColor: statusInfo.color }]} />
              <Text style={[s.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          {d?.bio && (
            <View style={s.bioBox}>
              <Text style={s.bioText}>{d.bio}</Text>
            </View>
          )}

          {d?.email && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{d.email}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={s.card}>
            <ActionRow icon="✏️" label="Chỉnh sửa hồ sơ" onPress={() => setEditModal(true)} />
            <View style={s.divider} />
            <ActionRow icon="🖼️" label="Đổi ảnh đại diện" onPress={handlePickAvatar} />
            <View style={s.divider} />
            <ActionRow icon="🎨" label="Màu tên hiển thị" onPress={() => setColorModal(true)} />
            <View style={s.divider} />
            <ActionRow icon="🔴" label="Trạng thái" sublabel={statusInfo.label} onPress={() => setEditModal(true)} />
            <View style={s.divider} />
            <ActionRow icon="🚪" label="Đăng xuất" danger onPress={() => setLogoutModal(true)} />
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      ) : (
        /* QR tab */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.qrContainer}>
          <View style={s.qrCard}>
            <Text style={s.qrTitle}>Mã QR của bạn</Text>
            <Text style={s.qrSub}>Chia sẻ mã này để người khác tìm thấy bạn</Text>

            {profileLink ? (
              <View style={s.qrBox}>
                <QRCode
                  value={profileLink}
                  size={200}
                  backgroundColor="#ffffff"
                  color="#1a1a2e"
                />
              </View>
            ) : (
              <View style={[s.qrBox, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: THEME.textMuted }}>Chưa có ID người dùng</Text>
              </View>
            )}

            {/* Profile name under QR */}
            <Text style={[s.qrName, { color: d?.usernameColor || THEME.textPrimary }]}>
              {d?.displayName || 'Tên hiển thị'}
            </Text>
            {d?.username && <Text style={s.qrHandle}>@{d.username}</Text>}

            {/* Copy link button */}
            <TouchableOpacity style={[s.copyBtn, copiedLink && { backgroundColor: THEME.statusOnline }]} onPress={handleCopyLink}>
              <Text style={s.copyBtnText}>{copiedLink ? '✓ Đã sao chép' : '🔗 Sao chép link hồ sơ'}</Text>
            </TouchableOpacity>

            <Text style={s.qrHint}>
              Người dùng khác có thể quét mã QR này trong phần Tìm kiếm để xem hồ sơ của bạn.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Edit profile modal ─────────────────────────────────── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.handle} />
            <Text style={s.modalTitle}>Chỉnh sửa hồ sơ</Text>

            <Text style={s.fieldLabel}>Tên hiển thị</Text>
            <TextInput
              style={s.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Nhập tên hiển thị"
              placeholderTextColor={THEME.textMuted}
              selectionColor={THEME.accent}
            />

            <Text style={s.fieldLabel}>Giới thiệu bản thân</Text>
            <TextInput
              style={[s.fieldInput, { height: 80, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Viết gì đó về bạn..."
              placeholderTextColor={THEME.textMuted}
              multiline
              selectionColor={THEME.accent}
            />

            <Text style={s.fieldLabel}>Trạng thái</Text>
            <View style={s.statusRow}>
              {STATUS_OPTIONS.map(st => {
                const info = STATUS_CONFIG[st];
                const active = selStatus === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusOption, active && { borderColor: info.color, backgroundColor: info.color + '22' }]}
                    onPress={() => setSelStatus(st)}
                  >
                    <View style={[s.statusDotInline, { backgroundColor: info.color }]} />
                    <Text style={[s.statusOptionText, active && { color: info.color }]}>{info.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={s.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                disabled={saving}
                onPress={() => saveProfile({ displayName, bio, status: selStatus })}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Color picker modal ─────────────────────────────────── */}
      <Modal visible={colorModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.handle} />
            <Text style={s.modalTitle}>Màu tên hiển thị</Text>
            <View style={s.colorGrid}>
              {COLOR_PALETTE.map(color => {
                const active = (d?.usernameColor || '') === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[s.colorSwatch, { backgroundColor: color }, active && s.colorSwatchActive]}
                    onPress={() => saveProfile({ usernameColor: color })}
                  >
                    {active && <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setColorModal(false)}>
              <Text style={s.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Logout confirm modal ──────────────────────────────── */}
      <Modal visible={logoutModal} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: 24 }]}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>👋</Text>
            <Text style={s.modalTitle}>Đăng xuất?</Text>
            <Text style={{ color: THEME.textMuted, textAlign: 'center', marginBottom: 20 }}>
              Bạn sẽ cần đăng nhập lại để sử dụng ZoloChat.
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setLogoutModal(false)}>
                <Text style={s.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: THEME.danger }]} onPress={handleLogout}>
                <Text style={s.saveBtnText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Reusable action row ───────────────────────────────────────────
function ActionRow({ icon, label, sublabel, danger, onPress }) {
  return (
    <TouchableOpacity style={s.actionRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.actionIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.actionLabel, danger && { color: THEME.danger }]}>{label}</Text>
        {sublabel && <Text style={s.actionSublabel}>{sublabel}</Text>}
      </View>
      <Text style={[s.actionArrow, danger && { color: THEME.danger }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  avatarCircle: { justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700' },
  statusDot: {
    position: 'absolute', borderWidth: 2,
    borderColor: THEME.bgSecondary,
  },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary, flex: 1 },

  // Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2, borderBottomColor: THEME.accent,
  },
  tabBtnText: { color: THEME.textMuted, fontWeight: '600', fontSize: 14 },
  tabBtnTextActive: { color: THEME.accent },

  // Banner
  banner: { width: '100%', height: 100 },
  bannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  bannerOverlayText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Avatar
  avatarRow: { paddingHorizontal: 16, marginTop: -40, flexDirection: 'row' },
  avatarWrap: { position: 'relative' },
  avatarLoading: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: THEME.bgTertiary,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: THEME.bgSecondary, borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: THEME.bgTertiary,
  },

  // Profile info
  profileInfo: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  profileHandle: { fontSize: 14, color: THEME.textMuted, marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, gap: 6,
  },
  statusDotInline: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600' },

  bioBox: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: THEME.bgSecondary, borderRadius: 8,
    padding: 12,
  },
  bioText: { color: THEME.textSecondary, fontSize: 14, lineHeight: 20 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  infoLabel: { color: THEME.textMuted, fontSize: 13 },
  infoValue: { color: THEME.textPrimary, fontSize: 13, fontWeight: '600' },

  // Actions card
  card: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    backgroundColor: THEME.bgSecondary, borderRadius: 12, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: THEME.border, marginLeft: 52 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  actionIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  actionLabel: { fontSize: 15, color: THEME.textPrimary, fontWeight: '500' },
  actionSublabel: { fontSize: 12, color: THEME.textMuted, marginTop: 1 },
  actionArrow: { fontSize: 20, color: THEME.textMuted },

  // QR tab
  qrContainer: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  qrCard: {
    backgroundColor: THEME.bgSecondary, borderRadius: 16,
    padding: 24, alignItems: 'center', width: '100%',
  },
  qrTitle: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 4 },
  qrSub: { fontSize: 13, color: THEME.textMuted, marginBottom: 24, textAlign: 'center' },
  qrBox: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16,
  },
  qrName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  qrHandle: { fontSize: 13, color: THEME.textMuted, marginBottom: 20 },
  copyBtn: {
    backgroundColor: THEME.accent, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 24, marginBottom: 16,
  },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  qrHint: {
    fontSize: 12, color: THEME.textMuted, textAlign: 'center', lineHeight: 18,
  },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: THEME.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: THEME.textMuted,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18, fontWeight: '800', color: THEME.textPrimary,
    marginBottom: 16, textAlign: 'center',
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: THEME.textMuted, marginBottom: 6, textTransform: 'uppercase' },
  fieldInput: {
    backgroundColor: THEME.bgInput, borderRadius: 8, padding: 12,
    color: THEME.textPrimary, fontSize: 15, marginBottom: 14,
  },

  // Status options
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: THEME.border,
  },
  statusOptionText: { color: THEME.textSecondary, fontSize: 13, fontWeight: '600' },

  // Color grid
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 },
  colorSwatch: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },

  // Modal buttons
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, backgroundColor: THEME.bgInput, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { color: THEME.textPrimary, fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 1, backgroundColor: THEME.accent, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
