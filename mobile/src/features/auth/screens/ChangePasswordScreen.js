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
import { useLanguage } from '../../../context/LanguageContext';

export default function ChangePasswordScreen({ navigation }) {
  const { t } = useLanguage();
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
      setError(t('password.oauth_error'));
      return;
    }

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError(t('auth.fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.password_mismatch') || 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      const msg = res.data?.message || t('password.success_msg');
      setSuccessMessage(msg);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(t('common.success'), msg, [
        {
          text: 'OK',
          onPress: async () => {
            await logout();
          },
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || t('password.error_msg'));
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
              <Text style={s.pillText}>{t('password.security_header')}</Text>
            </View>
            <Text style={s.title}>{t('password.change_title')}</Text>
            <Text style={s.subtitle}>
              {t('password.update_desc')}
            </Text>
          </View>

          <View style={s.userBox}>
            <Text style={s.userName} numberOfLines={1}>
              {user?.displayName || t('user.unknown')}
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
              <Text style={s.alertText}>{t('password.oauth_alert')}</Text>
            </View>
          )}

          <View style={s.form}>
            <Text style={s.label}>{t('password.current_label')}</Text>
            <TextInput
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder={t('password.current_placeholder')}
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              editable={isLocalAccount && !loading}
              style={s.input}
            />

            <Text style={s.label}>{t('password.new_label')}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('password.new_placeholder')}
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              editable={isLocalAccount && !loading}
              style={s.input}
            />

            <Text style={s.label}>{t('password.confirm_label')}</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('password.confirm_placeholder')}
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              editable={isLocalAccount && !loading}
              style={s.input}
            />

            <Text style={s.helperText}>
              {t('password.min_length_hint')}
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
                <Text style={s.primaryBtnText}>{t('password.confirm_label') === 'Confirm New Password' ? 'Update Password' : 'Xác nhận đổi mật khẩu'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Text style={s.linkText}>{t('common.back')}</Text>
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
