import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StatusBar, Alert,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import authApi from '../api/authApi';
import userApi from '../../user/api/userApi';
import apiClient from '../../../services/apiClient';
import { THEME } from '../../../theme';

export default function ChangePasswordScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLocalAccount = !user?.authProvider || user?.authProvider === 'local';

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');

    if (!isLocalAccount) {
      setError('Tài khoản OAuth không hỗ trợ đổi mật khẩu trong ứng dụng.');
      return;
    }

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Vui lòng điền đầy đủ các trường.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      const msg = res.data?.message || 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.';
      setSuccessMessage(msg);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Thành công', msg, [
        {
          text: 'OK',
          onPress: async () => {
            await logout();
          },
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.headerBlock}>
            <View style={s.pill}>
              <Text style={s.pillText}>Bảo mật tài khoản</Text>
            </View>
            <Text style={s.title}>Đổi mật khẩu</Text>
            <Text style={s.subtitle}>
              Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn.
            </Text>
          </View>

          <View style={s.userBox}>
            <Text style={s.userName} numberOfLines={1}>
              {user?.displayName || 'Người dùng'}
            </Text>
            <Text style={s.userMeta} numberOfLines={1}>
              {user?.email || user?.username || '—'}
            </Text>
          </View>

          {!!error && (
            <View style={[s.alertBox, s.errorBox]}>
              <Text style={s.alertText}>{error}</Text>
            </View>
          )}

          {!!successMessage && !error && (
            <View style={[s.alertBox, s.successBox]}>
              <Text style={s.alertText}>{successMessage}</Text>
            </View>
          )}

          {!isLocalAccount && (
            <View style={[s.alertBox, s.warnBox]}>
              <Text style={s.alertText}>Tài khoản đăng nhập bằng Google/Facebook không thể đổi mật khẩu tại đây.</Text>
            </View>
          )}

          <View style={s.form}>
            <Text style={s.label}>Mật khẩu hiện tại</Text>
            <TextInput
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Nhập mật khẩu đang dùng"
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              editable={isLocalAccount && !loading}
              style={s.input}
            />

            <Text style={s.label}>Mật khẩu mới</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mật khẩu mới"
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              editable={isLocalAccount && !loading}
              style={s.input}
            />

            <Text style={s.label}>Xác nhận mật khẩu mới</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              editable={isLocalAccount && !loading}
              style={s.input}
            />

            <Text style={s.helperText}>
              Mật khẩu mới nên có ít nhất 8 ký tự và khó đoán.
            </Text>

            <TouchableOpacity
              style={[s.primaryBtn, (loading || !isLocalAccount) && s.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading || !isLocalAccount}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Xác nhận đổi mật khẩu</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Text style={s.linkText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.bgPrimary },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: THEME.bgPrimary,
  },
  card: {
    backgroundColor: THEME.bgSecondary,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  headerBlock: { alignItems: 'center', marginBottom: 16 },
  pill: {
    backgroundColor: 'rgba(237,66,69,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(237,66,69,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  pillText: { color: THEME.danger, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  title: { color: THEME.textPrimary, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: THEME.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  userBox: {
    backgroundColor: THEME.bgPrimary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 14,
  },
  userName: { color: THEME.textPrimary, fontSize: 16, fontWeight: '700' },
  userMeta: { color: THEME.textMuted, fontSize: 12, marginTop: 4 },
  alertBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  errorBox: { backgroundColor: 'rgba(237,66,69,0.16)', borderColor: 'rgba(237,66,69,0.45)' },
  successBox: { backgroundColor: 'rgba(59,165,92,0.16)', borderColor: 'rgba(59,165,92,0.45)' },
  warnBox: { backgroundColor: 'rgba(250,166,26,0.16)', borderColor: 'rgba(250,166,26,0.45)' },
  alertText: { color: THEME.textPrimary, fontSize: 13, lineHeight: 18 },
  form: { marginTop: 4 },
  label: { color: THEME.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: THEME.bgInput,
    borderColor: THEME.border,
    borderWidth: 1.5,
    borderRadius: 12,
    color: THEME.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  helperText: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  linkBtn: { alignItems: 'center', paddingVertical: 14 },
  linkText: { color: THEME.textSecondary, fontSize: 14, fontWeight: '700' },
});
