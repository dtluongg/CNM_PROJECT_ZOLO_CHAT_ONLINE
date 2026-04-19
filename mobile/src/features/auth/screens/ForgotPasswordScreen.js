import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import authApi from '../api/authApi';
import userApi from '../../user/api/userApi';
import apiClient from '../../../services/apiClient';
import { THEME } from '../../../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: username/email, 2: otp + new password
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSendOtp = async () => {
    setError('');
    setInfoMessage('');

    if (!username.trim()) {
      setError('Vui lòng nhập username hoặc email');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', {
        username: username.trim(),
      });
      setInfoMessage(
        res.data?.message ||
          'Nếu tài khoản tồn tại, mã OTP đã được gửi tới email đăng ký'
      );
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Không thể gửi yêu cầu quên mật khẩu'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setInfoMessage('');

    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP');
      return;
    }

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        otp: otp.trim(),
        newPassword,
      };
      const res = await authApi.resetPassword(payload);
      const message = res.data?.message || 'Đặt lại mật khẩu thành công';
      navigation.navigate('Signin', { message });
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.headerBlock}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Khôi phục tài khoản</Text>
            </View>
            <Text style={styles.title}>Quên mật khẩu</Text>
            <Text style={styles.subtitle}>
              Nhập username hoặc email để nhận mã OTP đặt lại mật khẩu.
            </Text>
          </View>

          {!!error && (
            <View style={[styles.alertBox, styles.errorBox]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!!infoMessage && !error && (
            <View style={[styles.alertBox, styles.successBox]}>
              <Text style={styles.successText}>{infoMessage}</Text>
            </View>
          )}

          {step === 1 ? (
            <>
              <Text style={styles.label}>Username hoặc Email</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Nhập username hoặc email đã đăng ký"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Gửi mã OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Username hoặc Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={username}
                editable={false}
              />

              <Text style={styles.label}>Mã OTP</Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="Nhập mã OTP 6 chữ số"
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mật khẩu mới"
                secureTextEntry
              />

              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Đặt lại mật khẩu</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Nhớ lại mật khẩu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signin')}>
              <Text style={styles.linkText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: THEME.bgPrimary,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: THEME.bgPrimary,
  },
  card: {
    backgroundColor: THEME.bgSecondary,
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 420,
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
    backgroundColor: 'rgba(88,101,242,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(88,101,242,0.34)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  pillText: { color: THEME.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  alertBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: 'rgba(59,165,92,0.16)',
    borderColor: 'rgba(59,165,92,0.45)',
  },
  successText: {
    color: THEME.textPrimary,
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: 'rgba(237,66,69,0.16)',
    borderColor: 'rgba(237,66,69,0.45)',
  },
  errorText: {
    color: THEME.textPrimary,
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.textPrimary,
    marginBottom: 14,
    backgroundColor: THEME.bgInput,
  },
  disabledInput: {
    backgroundColor: THEME.bgPrimary,
    color: THEME.textMuted,
    borderColor: THEME.border,
  },
  primaryBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  linkText: {
    fontSize: 13,
    color: THEME.accent,
    fontWeight: '800',
  },
});
