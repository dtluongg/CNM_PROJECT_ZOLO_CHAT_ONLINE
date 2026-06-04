import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../../services/apiClient';
import { uploadImageToSupabase } from '../../../services/storageUpload';

export function useProfile({ user, updateUser, navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('info');
  const [editModal, setEditModal] = useState(false);
  const [colorModal, setColorModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasFetchedRef = useRef(false);
  const lastFetchRef = useRef(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [statusText, setStatusText] = useState('');
  const [selStatus, setSelStatus] = useState('online');

  useFocusEffect(
    useCallback(() => {
      // Chỉ làm mới ngầm nếu hồ sơ đã cũ (>20s) để tránh gọi authme mỗi lần
      // quay lại màn hình gây thêm tải/lag.
      const now = Date.now();
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        lastFetchRef.current = now;
        fetchProfile(false);
      } else if (now - lastFetchRef.current > 20000) {
        lastFetchRef.current = now;
        fetchProfile('silent');
      }
    }, [])
  );

  const fetchProfile = async (isRefresh = false) => {
    if (isRefresh === true) setRefreshing(true);
    else if (isRefresh === false) setLoading(true);
    // 'silent': no spinner, just update data in background

    try {
      const res = await apiClient.get('/auth/authme');
      const u = res.data.user;

      setProfile(u);
      setDisplayName(u.displayName || '');
      setBio(u.bio || '');
      setStatusText(u.statusText || '');
      setSelStatus(u.status || 'online');
      await updateUser(u);
    } catch (e) {
      console.error('[ProfileScreen] fetchProfile error:', e.message);
      if (!profile && user) {
        setProfile(user);
        setDisplayName(user.displayName || '');
        setBio(user.bio || '');
        setStatusText(user.statusText || '');
        setSelStatus(user.status || 'online');
      }
    } finally {
      if (isRefresh !== 'silent') setLoading(false);
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
      mediaTypes: 'images',
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
      mediaTypes: 'images',
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
      const res = await apiClient.patch('/users/update-profile', data);
      const u = res.data.user;

      setProfile(u);
      setDisplayName(u.displayName || '');
      setBio(u.bio || '');
      setStatusText(u.statusText || '');
      setSelStatus(u.status || 'online');
      await updateUser(u);

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

  const handleCopyLink = async (profileLink) => {
    if (!profileLink) return;
    const { default: Clipboard } = await import('expo-clipboard');
    await Clipboard.setStringAsync(profileLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return {
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
  };
}