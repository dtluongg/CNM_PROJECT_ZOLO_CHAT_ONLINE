/**
 * SearchScreen – text search + QR camera scan (modern UI)
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, FlatList, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../services/apiClient';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';

const Avatar = ({ name, avatar, size = 46 }) => {
  const bg = getAvatarColor(name);
  return avatar
    ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{getInitials(name)}</Text>
      </View>
    );
};

export default function SearchScreen({ navigation }) {
  const [mode, setMode]       = useState('text');
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const timerRef = useRef(null);
  const inputRef = useRef(null);

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
        if (!users.length) setError('Không tìm thấy người dùng nào.');
      } catch (e) {
        setError(e.response?.data?.message || 'Lỗi kết nối. Thử lại nhé!');
      } finally {
        setLoading(false);
      }
    }, 380);
  };

  const handleBarcodeScan = useCallback(async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(true);
    const match = data.match(/\/user\/([a-f0-9]{24})/i);
    if (!match) {
      Alert.alert('Không nhận ra mã QR', 'Mã này không phải QR hồ sơ ZoloChat.', [
        { text: 'Quét lại', onPress: () => { setScanned(false); setScanning(false); } },
      ]);
      return;
    }
    try {
      const res = await apiClient.get(`/auth/users/${match[1]}/profile`);
      const u = res.data.user || res.data;
      setMode('text');
      setScanned(false);
      setScanning(false);
      navigation.navigate('UserProfile', { user: u });
    } catch (e) {
      Alert.alert('Không tìm thấy', 'Người dùng không tồn tại hoặc đã bị xóa.', [
        { text: 'Quét lại', onPress: () => { setScanned(false); setScanning(false); } },
      ]);
    }
  }, [scanned, navigation]);

  const openCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Cần quyền camera', 'Vào cài đặt để cấp quyền camera cho ZoloChat.');
        return;
      }
    }
    setScanned(false);
    setScanning(false);
    setMode('camera');
  };

  const renderUser = ({ item }) => {
    const si = STATUS_CONFIG[item.status] || STATUS_CONFIG.offline;
    return (
      <TouchableOpacity
        style={s.userCard}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('UserProfile', { user: item })}
      >
        <View style={{ position: 'relative' }}>
          <Avatar name={item.displayName} avatar={item.avatar} size={50} />
          <View style={[s.statusDot, { backgroundColor: si.color }]} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.userName, { color: item.usernameColor || THEME.textPrimary }]} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.username && (
            <Text style={s.userHandle}>@{item.username}</Text>
          )}
          <Text style={[s.userStatus, { color: si.color }]}>{si.label}</Text>
        </View>
        <View style={s.viewBtn}>
          <Text style={s.viewBtnText}>Xem</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Tìm kiếm</Text>
        <TouchableOpacity
          style={[s.modeToggle, mode === 'camera' && { backgroundColor: THEME.accent }]}
          onPress={mode === 'camera' ? () => setMode('text') : openCamera}
        >
          <Text style={s.modeToggleText}>{mode === 'camera' ? '⌨️' : '📷'}</Text>
        </TouchableOpacity>
      </View>

      {mode === 'text' ? (
        <>
          {/* Search box */}
          <View style={s.searchBar}>
            <View style={s.searchBox}>
              <Text style={s.searchIco}>🔍</Text>
              <TextInput
                ref={inputRef}
                style={s.searchInput}
                value={query}
                onChangeText={search}
                placeholder="Tìm theo tên, @username, email..."
                placeholderTextColor={THEME.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                selectionColor={THEME.accent}
                returnKeyType="search"
              />
              {loading && <ActivityIndicator size="small" color={THEME.accent} />}
              {!loading && query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setError(''); }}>
                  <Text style={s.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {results.length > 0 && (
            <View style={s.resultHeader}>
              <Text style={s.resultCount}>{results.length} KẾT QUẢ</Text>
            </View>
          )}

          <FlatList
            data={results}
            keyExtractor={u => u._id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={() => (
              <View style={s.emptyWrap}>
                {query.length < 2 ? (
                  <>
                    <Text style={s.emptyIcon}>🔍</Text>
                    <Text style={s.emptyTitle}>Tìm kiếm người dùng</Text>
                    <Text style={s.emptyDesc}>Nhập ít nhất 2 ký tự để tìm kiếm theo tên, username hoặc email</Text>
                    <TouchableOpacity style={s.qrCta} onPress={openCamera}>
                      <Text style={s.qrCtaText}>📷  Quét mã QR</Text>
                    </TouchableOpacity>
                  </>
                ) : error && !loading ? (
                  <>
                    <Text style={s.emptyIcon}>😕</Text>
                    <Text style={s.emptyTitle}>Không tìm thấy</Text>
                    <Text style={s.emptyDesc}>{error}</Text>
                  </>
                ) : null}
              </View>
            )}
          />
        </>
      ) : (
        /* Camera mode */
        <View style={{ flex: 1 }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              />
              {/* Dark overlay with cutout */}
              <View style={s.scanOverlay} pointerEvents="none">
                <View style={s.scanDimTop} />
                <View style={s.scanMidRow}>
                  <View style={s.scanDimSide} />
                  <View style={s.scanWindow}>
                    <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                    <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
                    <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                    <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
                  </View>
                  <View style={s.scanDimSide} />
                </View>
                <View style={s.scanDimBottom}>
                  {scanning
                    ? <ActivityIndicator color="#fff" size="large" style={{ marginBottom: 10 }} />
                    : <Text style={s.scanHint}>Hướng camera vào mã QR của người dùng</Text>
                  }
                </View>
              </View>
            </>
          ) : (
            <View style={s.permWrap}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>📷</Text>
              <Text style={s.permTitle}>Cần quyền camera</Text>
              <Text style={s.permDesc}>Hãy cấp quyền camera để quét mã QR</Text>
              <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                <Text style={s.permBtnText}>Cấp quyền</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const SCAN_SIZE = 240;

const s = StyleSheet.create({
  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: THEME.textPrimary },
  modeToggle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: THEME.bgInput, justifyContent: 'center', alignItems: 'center',
  },
  modeToggleText: { fontSize: 18 },

  searchBar: { backgroundColor: THEME.bgSecondary, padding: 10, paddingTop: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.bgInput, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: THEME.border,
  },
  searchIco: { fontSize: 15 },
  searchInput: { flex: 1, color: THEME.textPrimary, fontSize: 15, padding: 0 },
  clearText: { color: THEME.textMuted, fontSize: 16, padding: 2 },

  resultHeader: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  resultCount: { fontSize: 11, fontWeight: '700', color: THEME.textMuted, letterSpacing: 0.8 },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
    backgroundColor: THEME.bgSecondary,
    marginHorizontal: 12, marginTop: 8, borderRadius: 14,
    marginBottom: 0,
  },
  statusDot: {
    position: 'absolute', width: 13, height: 13, borderRadius: 7,
    bottom: 0, right: 0, borderWidth: 2, borderColor: THEME.bgSecondary,
  },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  userHandle: { fontSize: 12, color: THEME.textMuted },
  userStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  viewBtn: {
    backgroundColor: THEME.accent + '20', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: THEME.accent + '50',
  },
  viewBtnText: { color: THEME.accent, fontWeight: '700', fontSize: 12 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  qrCta: {
    backgroundColor: THEME.accent, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  qrCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Camera
  scanOverlay: { ...StyleSheet.absoluteFillObject },
  scanDimTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanMidRow: { flexDirection: 'row', height: SCAN_SIZE },
  scanDimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanWindow: { width: SCAN_SIZE, borderRadius: 4 },
  scanDimBottom: {
    flex: 1.2, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  scanHint: { color: '#fff', fontSize: 14, textAlign: 'center', fontWeight: '500' },

  corner: {
    position: 'absolute', width: 28, height: 28,
    borderColor: '#fff', borderRadius: 2,
  },

  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permTitle: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 8 },
  permDesc: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', marginBottom: 24 },
  permBtn: {
    backgroundColor: THEME.accent, borderRadius: 24,
    paddingHorizontal: 28, paddingVertical: 13,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
