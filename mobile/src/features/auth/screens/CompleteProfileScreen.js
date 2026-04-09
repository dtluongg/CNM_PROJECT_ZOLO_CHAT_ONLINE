import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import authApi from '../api/authApi';
import userApi from '../../user/api/userApi';
import apiClient from '../../../services/apiClient';

export default function CompleteProfileScreen({ route, navigation }) {
  const { supabaseId, provider, displayName: initName, avatar: initAvatar } = route.params || {};
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [displayName, setDisplayName] = useState(initName || '');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startCooldown = () => {
    let secs = 60;
    setCooldown(secs);
    const timer = setInterval(() => {
      secs -= 1;
      setCooldown(secs);
      if (secs <= 0) clearInterval(timer);
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email.');
      return;
    }
    setSendingOtp(true);
    try {
      await apiClient.post('/auth/send-otp', { email: email.trim(), type: 'email' });
      setOtpSent(true);
      startCooldown();
      Alert.alert('Đã gửi', `Mã OTP đã được gửi đến ${email}`);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Gửi OTP thất bại.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleComplete = async () => {
    if (!email.trim() || !emailOtp.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mã OTP.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post('/auth/complete-oauth-profile', {
        supabaseId,
        provider,
        email: email.trim(),
        emailOtp: emailOtp.trim(),
        displayName: displayName.trim(),
        avatar: initAvatar || null,
      });
      const { accessToken, user } = res.data;
      await login(accessToken, user);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Xác thực thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hoàn tất đăng ký</Text>
        <Text style={styles.subtitle}>
          Tài khoản {provider} của bạn chưa có email. Vui lòng cung cấp email để hoàn tất.
        </Text>

        {/* Avatar preview */}
        {initAvatar ? (
          <Image source={{ uri: initAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>
              {(initName || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        {initName && <Text style={styles.providerName}>{initName}</Text>}

        {/* Display name */}
        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Nhập tên hiển thị"
        />

        {/* Email */}
        <Text style={styles.label}>Email *</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.otpBtn, cooldown > 0 && styles.otpBtnDisabled]}
            onPress={handleSendOtp}
            disabled={cooldown > 0 || sendingOtp}
          >
            {sendingOtp ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.otpBtnText}>
                {cooldown > 0 ? `${cooldown}s` : 'Gửi OTP'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* OTP input */}
        {otpSent && (
          <>
            <Text style={[styles.label, { marginTop: 16 }]}>Mã OTP</Text>
            <TextInput
              style={styles.input}
              value={emailOtp}
              onChangeText={setEmailOtp}
              placeholder="Nhập mã 6 số"
              keyboardType="number-pad"
              maxLength={6}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!otpSent || submitting) && styles.submitBtnDisabled]}
          onPress={handleComplete}
          disabled={!otpSent || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Hoàn tất đăng ký</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingTop: 60, alignItems: 'stretch' },

  title: { fontSize: 26, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 },

  avatar: {
    width: 90, height: 90, borderRadius: 45,
    alignSelf: 'center', marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 8,
  },
  avatarLetter: { fontSize: 36, color: '#fff', fontWeight: '700' },
  providerName: {
    textAlign: 'center', fontSize: 16, fontWeight: '600',
    color: '#1E293B', marginBottom: 24,
  },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, backgroundColor: '#fff', marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },

  otpBtn: {
    backgroundColor: '#3B82F6', paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 10,
  },
  otpBtnDisabled: { backgroundColor: '#94A3B8' },
  otpBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  submitBtn: {
    backgroundColor: '#3B82F6', paddingVertical: 15,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#94A3B8' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },
});
