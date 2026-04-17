import React, { useCallback } from 'react';
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
} from 'react-native';
import { usePresence } from '../../../context/PresenceContext';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../../context/AuthContext';
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
        <TabButton tabKey="info" label="Thông tin" active={tab === 'info'} onPress={() => setTab('info')} />
        <TabButton tabKey="qr" label="Mã QR" active={tab === 'qr'} onPress={() => setTab('qr')} />
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
                <Text style={s.bannerEditText}>✏️  Đổi ảnh bìa</Text>
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
                {d.displayName || 'Tên hiển thị'}
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
              <Text style={[s.statusChipText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              <Text style={[s.statusChipText, { color: statusInfo.color, fontSize: 10 }]}> ▾</Text>
            </TouchableOpacity>
          </View>

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

              <Text style={s.qrCaption}>Quét mã này để xem hồ sơ của {d.displayName}</Text>

              <TouchableOpacity
                style={[s.copyLinkBtn, copiedLink && { backgroundColor: THEME.statusOnline }]}
                onPress={() => handleCopyLink(profileLink)}
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

            <Text style={s.fieldLabel}>TRẠNG THÁI TÙY CHỈNH</Text>
            <TextInput
              style={s.fieldInput}
              value={statusText}
              onChangeText={setStatusText}
              placeholder="Đang làm gì đó... (giống Discord)"
              placeholderTextColor={THEME.textMuted}
              maxLength={128}
              selectionColor={THEME.accent}
            />

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={s.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.65 }]}
                disabled={saving}
                onPress={() => saveProfile({ displayName: displayName.trim(), bio: bio.trim(), statusText: statusText.trim() })}
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
                style={[s.saveBtn, { backgroundColor: THEME.danger || '#ed4245' }]}
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