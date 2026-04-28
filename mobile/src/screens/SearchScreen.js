import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../services/apiClient';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';
import { usePresence } from '../context/PresenceContext';
import { useLanguage } from '../context/LanguageContext';

const Avatar = ({ name, avatar, size = 50 }) => {
  const bg = getAvatarColor(name);
  return avatar ? (
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
  );
};

export default function SearchScreen({ navigation }) {
  const { isUserOnline, getPresenceStatus } = usePresence();
  const { t } = useLanguage();

  const [mode, setMode] = useState('text'); // 'text' | 'camera'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // ==================== LIVE STATUS ====================
  const getLiveStatusInfo = (user) => {
    const online = isUserOnline(user._id);
    const presStatus = getPresenceStatus(user._id);

    console.log(`[STATUS DEBUG] ${user.displayName} → online: ${online}, presStatus: ${presStatus}`);

    if (online && presStatus) {
      return STATUS_CONFIG[presStatus] || STATUS_CONFIG.online;
    }

    return STATUS_CONFIG.offline;
  };
  // ==================== SEARCH ====================
  const performSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.get(`/auth/users/search?q=${encodeURIComponent(q.trim())}`);
      const users = res.data.users || [];
      setResults(users);
      setError(users.length === 0 ? t('search.no_users') : '');
    } catch (e) {
      setError(e.response?.data?.message || t('search.connection_error'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    (q) => {
      setQuery(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => performSearch(q), 400);
    },
    [performSearch]
  );

  // ==================== QR SCAN ====================
  const handleBarcodeScan = useCallback(
    async ({ data }) => {
      if (scanned) return;
      setScanned(true);

      const match = data.match(/\/user\/([a-f0-9]{24})/i);
      if (!match) {
        Alert.alert(t('search.qr_invalid_title'), t('search.qr_invalid_desc'), [
          { text: t('friends.retry_scan'), onPress: () => setScanned(false) },
        ]);
        return;
      }

      try {
        const res = await apiClient.get(`/auth/users/${match[1]}/profile`);
        const user = res.data.user || res.data;

        // Reset và chuyển sang profile
        setMode('text');
        setQuery('');
        setResults([]);
        setScanned(false);

        navigation.navigate('UserProfile', { user });
      } catch {
        Alert.alert(t('friends.user_not_found'), t('friends.user_not_found_desc'), [
          { text: t('friends.retry_scan'), onPress: () => setScanned(false) },
        ]);
      }
    },
    [navigation, scanned]
  );

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(t('common.camera_permission_title'), t('common.camera_permission_desc'));
        return;
      }
    }
    setMode('camera');
    setScanned(false);
  };

  const closeCamera = () => {
    setMode('text');
    setScanned(false);
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ==================== RENDER USER ITEM ====================
  const renderUser = ({ item }) => {
    const si = getLiveStatusInfo(item);

    return (
      <TouchableOpacity
        style={s.userCard}
        activeOpacity={0.78}
        onPress={() => navigation.navigate('UserProfile', { user: item })}
      >
        <View style={{ position: 'relative' }}>
          <Avatar name={item.displayName} avatar={item.avatar} size={50} />
          <View style={[s.statusDot, { backgroundColor: si.color }]} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[s.userName, { color: item.usernameColor || THEME.textPrimary }]}
            numberOfLines={1}
          >
            {item.displayName}
          </Text>
          {item.username && <Text style={s.userHandle}>@{item.username}</Text>}
          <Text style={[s.userStatus, { color: si.color }]} numberOfLines={1}>
            {t(`chat.status.${si.key || 'offline'}`)}
          </Text>
        </View>

        <View style={s.viewBtn}>
          <Text style={s.viewBtnText}>{t('common.edit') === 'Sửa' ? 'Xem' : 'View'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('search.title')}</Text>
        <TouchableOpacity
          style={[s.modeToggle, mode === 'camera' && { backgroundColor: THEME.accent }]}
          onPress={mode === 'camera' ? closeCamera : openCamera}
        >
          <Text style={s.modeToggleText}>{mode === 'camera' ? '⌨️' : '📷'}</Text>
        </TouchableOpacity>
      </View>

      {mode === 'text' ? (
        <>
          {/* Search Bar */}
          <View style={s.searchBar}>
            <View style={s.searchBox}>
              <Text style={s.searchIco}>🔍</Text>
              <TextInput
                ref={inputRef}
                style={s.searchInput}
                value={query}
                onChangeText={search}
                placeholder={t('friends.search_placeholder')}
                placeholderTextColor={THEME.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                selectionColor={THEME.accent}
              />
              {loading && <ActivityIndicator size="small" color={THEME.accent} />}
              {!loading && query.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setResults([]);
                    setError('');
                    inputRef.current?.focus();
                  }}
                >
                  <Text style={s.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Result Count */}
          {results.length > 0 && (
            <View style={s.resultHeader}>
              <Text style={s.resultCount}>{results.length} {t('friends.global_search_results')}</Text>
            </View>
          )}

          {/* User List */}
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            ListEmptyComponent={() => (
              <View style={s.emptyWrap}>
                {query.length < 2 ? (
                  <>
                    <Text style={s.emptyIcon}>🔍</Text>
                    <Text style={s.emptyTitle}>{t('friends.search_friends')}</Text>
                    <Text style={s.emptyDesc}>
                      {t('search.min_chars_hint')}
                    </Text>
                    <TouchableOpacity style={s.qrCta} onPress={openCamera}>
                      <Text style={s.qrCtaText}>📷 {t('friends.qr_not_recognized_title') === 'Chưa nhận dạng được' ? 'Quét mã QR' : 'Scan QR Code'}</Text>
                    </TouchableOpacity>
                  </>
                ) : error ? (
                  <>
                    <Text style={s.emptyIcon}>😕</Text>
                    <Text style={s.emptyTitle}>{t('friends.no_search_results')}</Text>
                    <Text style={s.emptyDesc}>{error}</Text>
                  </>
                ) : null}
              </View>
            )}
          />
        </>
      ) : (
        /* ==================== CAMERA MODE ==================== */
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          />

          <View style={s.scanOverlay} pointerEvents="none">
            <View style={s.scanDimTop} />
            <View style={s.scanMidRow}>
              <View style={s.scanDimSide} />
              <View style={s.scanWindow}>
                <View style={[s.corner, { top: 0, left: 0 }]} />
                <View style={[s.corner, { top: 0, right: 0 }]} />
                <View style={[s.corner, { bottom: 0, left: 0 }]} />
                <View style={[s.corner, { bottom: 0, right: 0 }]} />
              </View>
              <View style={s.scanDimSide} />
            </View>
            <View style={s.scanDimBottom}>
              <Text style={s.scanHint}>{t('friends.qr_caption', { name: '' }).replace(' hồ sơ của ', '').replace(' profile on ZoloChat', '')}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.closeCameraBtn} onPress={closeCamera}>
            <Text style={{ fontSize: 26, color: '#fff', fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ====================== STYLES ====================== */
const SCAN_SIZE = 260;

const s = StyleSheet.create({
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
  modeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeToggleText: { fontSize: 20 },

  searchBar: { backgroundColor: THEME.bgSecondary, padding: 12, paddingTop: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.bgInput,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  searchIco: { fontSize: 16 },
  searchInput: { flex: 1, color: THEME.textPrimary, fontSize: 16 },

  resultHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  resultCount: { fontSize: 12, fontWeight: '700', color: THEME.textMuted },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: THEME.bgSecondary,
    borderRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: THEME.bgSecondary,
  },
  userName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  userHandle: { fontSize: 13, color: THEME.textMuted },
  userStatus: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },

  viewBtn: {
    backgroundColor: THEME.accent + '15',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.accent + '40',
  },
  viewBtnText: { color: THEME.accent, fontWeight: '700', fontSize: 13 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: THEME.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14.5, color: THEME.textMuted, textAlign: 'center', lineHeight: 22 },
  qrCta: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 12,
  },
  qrCtaText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  scanOverlay: { ...StyleSheet.absoluteFillObject },
  scanDimTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanMidRow: { flexDirection: 'row', height: SCAN_SIZE },
  scanDimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanWindow: { width: SCAN_SIZE, position: 'relative' },
  scanDimBottom: {
    flex: 1.3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanHint: { color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#00ff99',
    borderWidth: 3,
  },

  closeCameraBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});