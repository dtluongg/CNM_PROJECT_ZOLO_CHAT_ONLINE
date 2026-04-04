/**
 * SearchScreen – text search + QR camera scan
 * Used as the "Tìm kiếm" tab content inside MainTabScreen.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, ScrollView, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../services/apiClient';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';

// ─── Mini avatar ─────────────────────────────────────────────────
const Avatar = ({ name, avatar, size = 44 }) => {
  const bg = getAvatarColor(name);
  return avatar
    ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{getInitials(name)}</Text>
      </View>
    );
};

// ─── SEARCH SCREEN ────────────────────────────────────────────────
export default function SearchScreen({ navigation }) {
  const [mode, setMode]       = useState('text'); // 'text' | 'camera'
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false); // UI feedback

  const [permission, requestPermission] = useCameraPermissions();
  const timerRef = useRef(null);

  // ── Text search ──────────────────────────────────────────────
  const search = (q) => {
    setQuery(q);
    setError('');
    clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/auth/users/search?q=${encodeURIComponent(q.trim())}`);
        const users = res.data.users || [];
        setResults(users);
        if (!users.length) setError('Không tìm thấy người dùng.');
      } catch (e) {
        setError(e.response?.data?.message || 'Lỗi tìm kiếm.');
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  // ── QR scan result ────────────────────────────────────────────
  const handleBarcodeScan = useCallback(async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(true);

    // Extract MongoDB ObjectId from URL patterns:
    // chatapp://user/{id}  or  https://.../user/{id}
    const match = data.match(/\/user\/([a-f0-9]{24})/i);
    if (!match) {
      Alert.alert('Mã QR không hợp lệ', 'Không nhận diện được mã QR người dùng.', [
        { text: 'Thử lại', onPress: () => { setScanned(false); setScanning(false); } },
      ]);
      return;
    }

    const userId = match[1];
    try {
      const res = await apiClient.get(`/auth/users/${userId}/profile`);
      const user = res.data.user || res.data;
      setMode('text');
      setScanned(false);
      setScanning(false);
      navigation.navigate('UserProfile', { user });
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không tìm thấy người dùng.', [
        { text: 'Thử lại', onPress: () => { setScanned(false); setScanning(false); } },
      ]);
    }
  }, [scanned, navigation]);

  // ── Switch to camera mode ─────────────────────────────────────
  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera trong cài đặt để quét mã QR.');
        return;
      }
    }
    setScanned(false);
    setScanning(false);
    setMode('camera');
  };

  const closeCamera = () => {
    setMode('text');
    setScanned(false);
    setScanning(false);
  };

  // ─── User result item ────────────────────────────────────────
  const UserItem = ({ item }) => {
    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.online;
    return (
      <TouchableOpacity
        style={s.userItem}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('UserProfile', { user: item })}
      >
        <View style={{ position: 'relative' }}>
          <Avatar name={item.displayName} avatar={item.avatar} size={48} />
          <View style={[s.statusDot, {
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: statusInfo.color,
            bottom: -1, right: -1,
          }]} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.userName, { color: item.usernameColor || THEME.textPrimary }]}>
            {item.displayName}
          </Text>
          {item.username && <Text style={s.userHandle}>@{item.username}</Text>}
          {item.bio
            ? <Text style={s.userBio} numberOfLines={1}>{item.bio}</Text>
            : <Text style={[s.userBio, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          }
        </View>
        <Text style={s.viewArrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🔍 Tìm kiếm</Text>
        {mode === 'camera' ? (
          <TouchableOpacity style={s.modeBtn} onPress={closeCamera}>
            <Text style={s.modeBtnText}>⌨️ Nhập văn bản</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.modeBtn} onPress={openCamera}>
            <Text style={s.modeBtnText}>📷 Quét QR</Text>
          </TouchableOpacity>
        )}
      </View>

      {mode === 'text' ? (
        /* ── TEXT SEARCH ──────────────────────────────────────── */
        <>
          <View style={s.searchContainer}>
            <View style={s.searchBox}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                value={query}
                onChangeText={search}
                placeholder="Nhập tên, @username hoặc email..."
                placeholderTextColor={THEME.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                selectionColor={THEME.accent}
              />
              {loading
                ? <ActivityIndicator size="small" color={THEME.accent} />
                : query.length > 0
                  ? (
                    <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setError(''); }}>
                      <Text style={{ color: THEME.textMuted, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  ) : null
              }
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {results.length > 0 && (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{results.length} KẾT QUẢ</Text>
              </View>
            )}
            {results.map(u => <UserItem key={u._id} item={u} />)}

            {error && query.length >= 2 && !loading && (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>👤</Text>
                <Text style={s.emptyText}>{error}</Text>
              </View>
            )}

            {query.length < 2 && (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>💡</Text>
                <Text style={s.emptyText}>Nhập ít nhất 2 ký tự để tìm kiếm</Text>
                <TouchableOpacity style={s.qrHintBtn} onPress={openCamera}>
                  <Text style={s.qrHintBtnText}>📷 Hoặc quét mã QR</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        /* ── CAMERA QR SCAN ────────────────────────────────────── */
        <View style={{ flex: 1 }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              />
              {/* Overlay */}
              <View style={s.scanOverlay} pointerEvents="none">
                {/* Top / bottom dim */}
                <View style={s.scanDim} />
                {/* Frame */}
                <View style={s.scanFrameRow}>
                  <View style={s.scanDimSide} />
                  <View style={s.scanFrame}>
                    {/* Corner marks */}
                    <View style={[s.corner, s.cornerTL]} />
                    <View style={[s.corner, s.cornerTR]} />
                    <View style={[s.corner, s.cornerBL]} />
                    <View style={[s.corner, s.cornerBR]} />
                  </View>
                  <View style={s.scanDimSide} />
                </View>
                <View style={s.scanDimBottom}>
                  {scanning ? (
                    <ActivityIndicator color="#fff" size="large" style={{ marginBottom: 12 }} />
                  ) : null}
                  <Text style={s.scanHint}>
                    {scanning ? 'Đang tìm người dùng...' : 'Hướng camera vào mã QR của người dùng'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={s.permDenied}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
              <Text style={s.permTitle}>Cần quyền camera</Text>
              <Text style={s.permSub}>Hãy cấp quyền camera để quét mã QR</Text>
              <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                <Text style={s.permBtnText}>Cấp quyền camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary, flex: 1 },
  modeBtn: {
    backgroundColor: THEME.accent + '22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: THEME.accent + '55',
  },
  modeBtnText: { color: THEME.accent, fontWeight: '700', fontSize: 13 },

  searchContainer: { padding: 12, backgroundColor: THEME.bgSecondary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.bgInput, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: THEME.textPrimary, fontSize: 15 },

  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  userItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  statusDot: { position: 'absolute', borderWidth: 2, borderColor: THEME.bgTertiary },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  userHandle: { fontSize: 12, color: THEME.textMuted, marginBottom: 1 },
  userBio: { fontSize: 12, color: THEME.textMuted },
  viewArrow: { fontSize: 20, color: THEME.textMuted, marginLeft: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyText:  { color: THEME.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  qrHintBtn: {
    backgroundColor: THEME.accent, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  qrHintBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Camera overlay
  scanOverlay: { ...StyleSheet.absoluteFillObject },
  scanDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrameRow: { flexDirection: 'row', height: 240 },
  scanDimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: { width: 240, borderRadius: 4 },
  scanDimBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  scanHint: { color: '#fff', fontSize: 14, textAlign: 'center', fontWeight: '500' },

  // QR frame corners
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: '#fff', borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Permission denied
  permDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permTitle: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 8 },
  permSub: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', marginBottom: 24 },
  permBtn: {
    backgroundColor: THEME.accent, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
