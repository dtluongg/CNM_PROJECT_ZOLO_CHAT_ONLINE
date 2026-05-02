import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import authApi from '../../auth/api/authApi';
import userApi from '../api/userApi';
import apiClient from '../../../services/apiClient';
import { supabase } from '../../../config/supabase';

export default function DashboardScreen() {
  const { user, token, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authApi.authMe();
      setProfile(res.data.user);
      setDisplayName(res.data.user.displayName || '');
    } catch (err) {
      console.warn('fetchProfile error:', err.message || err);
      // Use cached user data
      if (user) {
        setProfile(user);
        setDisplayName(user.displayName || '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Hãy cho phép ứng dụng truy cập ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await updateProfile({ avatar: base64 });
    }
  };

  const updateProfile = async (data) => {
    setUpdating(true);
    try {
      const res = await userApi.updateProfile(data);
      const updated = res.data.user;
      setProfile(updated);
      await updateUser(updated);
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ.');
      setEditModal(false);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Cập nhật thất bại.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/auth/signout');
          } catch {}
          try {
            await supabase.auth.signOut();
          } catch {}
          await logout();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const userData = profile || user;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>ZoloChat</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutBtn}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Banner (nếu chưa có ảnh) */}
      {!userData?.avatar && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Hồ sơ chưa có ảnh đại diện</Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={handlePickAvatar}>
            <Text style={styles.bannerBtnText}>Tải ảnh lên</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Card */}
      <View style={styles.card}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {userData?.avatar ? (
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {(userData?.displayName || userData?.email || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickAvatar}>
            <Text style={styles.editAvatarIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Name & Email */}
        <Text style={styles.displayName}>{userData?.displayName || 'Chưa đặt tên'}</Text>
        <Text style={styles.email}>{userData?.email || 'Chưa có email'}</Text>

        {/* Badges */}
        <View style={styles.badges}>
          {userData?.isEmailVerified && (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text style={styles.badgeText}>✓ Email xác thực</Text>
            </View>
          )}
          {userData?.phone && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text style={styles.badgeText}>📱 {userData.phone}</Text>
            </View>
          )}
          {userData?.authProvider && (
            <View style={[styles.badge, styles.badgeGray]}>
              <Text style={styles.badgeText}>{userData.authProvider}</Text>
            </View>
          )}
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
          <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>

            <Text style={styles.label}>Tên hiển thị</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Nhập tên hiển thị"
            />

            <TouchableOpacity style={styles.avatarPickBtn} onPress={handlePickAvatar}>
              <Text style={styles.avatarPickBtnText}>Đổi ảnh đại diện</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={() => updateProfile({ displayName })}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appName: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  logoutBtn: { color: '#EF4444', fontWeight: '600', fontSize: 15 },

  banner: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: { color: '#92400E', fontSize: 14, flex: 1 },
  bannerBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  bannerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 40, color: '#fff', fontWeight: '700' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editAvatarIcon: { fontSize: 14 },

  displayName: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  email: { fontSize: 14, color: '#64748B', marginBottom: 16 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeBlue: { backgroundColor: '#DBEAFE' },
  badgeGray: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  editBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  avatarPickBtn: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPickBtnText: { color: '#3B82F6', fontWeight: '600', fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  saveBtn: { backgroundColor: '#3B82F6' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
