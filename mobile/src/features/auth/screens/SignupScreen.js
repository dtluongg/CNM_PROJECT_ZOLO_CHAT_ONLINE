import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { supabase } from '../../../config/supabase';
import authApi from '../api/authApi';
import userApi from '../../user/api/userApi';
import apiClient from '../../../services/apiClient';

WebBrowser.maybeCompleteAuthSession();

// ── Icon badges ────────────────────────────────────────────────────
const GoogleBadge = () => (
  <View style={styles.oauthIconBadge}>
    <Text style={[styles.oauthIconText, { color: '#4285F4' }]}>G</Text>
  </View>
);

const FacebookBadge = () => (
  <View style={styles.oauthIconBadge}>
    <Text style={[styles.oauthIconText, { color: '#1877F2' }]}>f</Text>
  </View>
);

// ── OTP Section Component ──────────────────────────────────────────
const OtpSection = ({
  title,
  inputValue,
  onInputChange,
  inputPlaceholder,
  keyboardType,
  onSend,
  sendLoading,
  cooldown,
  otpSent,
  otpValue,
  onOtpChange,
}) => (
  <View style={styles.otpBox}>
    <Text style={styles.otpBoxTitle}>{title}</Text>
    <View style={styles.otpRow}>
      <TextInput
        style={styles.otpInput}
        value={inputValue}
        onChangeText={onInputChange}
        placeholder={inputPlaceholder}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.sendOtpBtn, (sendLoading || cooldown > 0 || !inputValue) && styles.disabledBtn]}
        onPress={onSend}
        disabled={sendLoading || cooldown > 0 || !inputValue}
        activeOpacity={0.7}
      >
        {sendLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.sendOtpBtnText}>
            {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi OTP'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
    {otpSent && (
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        value={otpValue}
        onChangeText={onOtpChange}
        placeholder="Nhập mã OTP 6 chữ số"
        keyboardType="number-pad"
        maxLength={6}
      />
    )}
    {otpSent && !otpValue ? (
      <Text style={styles.warnText}>Vui lòng nhập mã OTP đã gửi</Text>
    ) : null}
  </View>
);

// ── SignupScreen ───────────────────────────────────────────────────
const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });

  // Email OTP
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone OTP
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const startCooldown = (setter) => {
    setter(60);
    const interval = setInterval(() => {
      setter((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendEmailOtp = async () => {
    setError('');
    if (!formData.email.trim()) {
      setError('Vui lòng nhập email trước');
      return;
    }
    setEmailOtpLoading(true);
    try {
      const res = await apiClient.post('/auth/send-email-otp', {
        email: formData.email.trim(),
      });
      setEmailOtpSent(true);
      setInfoMessage(res.data.message || 'OTP đã gửi về email');
      startCooldown(setEmailCooldown);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP email');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setError('');
    if (!formData.phone.trim()) {
      setError('Vui lòng nhập số điện thoại trước');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^\d+]/g, '');
    setPhoneOtpLoading(true);
    try {
      const res = await apiClient.post('/auth/send-phone-otp', {
        phone: cleanPhone,
      });
      setPhoneOtpSent(true);
      setInfoMessage(res.data.message || 'OTP đã gửi về điện thoại');
      startCooldown(setPhoneCooldown);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP điện thoại');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    const hasEmailOtp = emailOtpSent && emailOtp.trim().length > 0;
    const hasPhoneOtp = phoneOtpSent && phoneOtp.trim().length > 0;

    if (!hasEmailOtp && !hasPhoneOtp) {
      setError('Cần xác thực ít nhất một phương thức: gửi OTP qua email hoặc số điện thoại');
      return;
    }

    if (!formData.username.trim() || !formData.firstName.trim() || !formData.lastName.trim() || !formData.password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.replace(/[^\d+]/g, '');
      if (hasEmailOtp) payload.emailOtp = emailOtp.trim();
      if (hasPhoneOtp) payload.phoneOtp = phoneOtp.trim();

      const response = await authApi.signup(payload);
      if (response.status === 201) {
        navigation.navigate('Signin', {
          message: 'Đăng ký thành công! Vui lòng đăng nhập.',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      const redirectUri = Linking.createURL('/auth/callback');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
        },
      });

      if (oauthError || !data?.url) {
        setError(oauthError?.message || `Không thể bắt đầu đăng ký ${provider}`);
        setOauthLoading(null);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success' && result.url) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSessionFromUrl({ url: result.url });

        let session = sessionData?.session;
        if (!session) {
          const { data: cur } = await supabase.auth.getSession();
          session = cur?.session;
        }

        if (sessionError || !session) {
          setError('Không thể lấy session sau OAuth. Vui lòng thử lại.');
          setOauthLoading(null);
          return;
        }

        // Sync with backend
        const res = await apiClient.post('/auth/sync-oauth', {
          access_token: session.access_token,
        });

        if (res.data.needsEmailVerification) {
          navigation.navigate('CompleteProfile', {
            supabaseId: res.data.supabaseId,
            provider: res.data.provider,
            displayName: res.data.displayName,
            avatar: res.data.avatar,
            accessToken: session.access_token,
          });
          return;
        }

        // OAuth signup succeeded — navigate to Signin with success message
        navigation.navigate('Signin', {
          message: 'Đăng ký thành công! Vui lòng đăng nhập.',
        });
      } else if (result.type !== 'cancel' && result.type !== 'dismiss') {
        setError(`Đăng ký ${provider} thất bại. Vui lòng thử lại.`);
      }
    } catch (err) {
      console.error('OAuth signup error:', err);
      setError(`Không thể kết nối ${provider}. Vui lòng thử lại.`);
    } finally {
      setOauthLoading(null);
    }
  };

  const atLeastOneOtpReady =
    (emailOtpSent && emailOtp.trim()) || (phoneOtpSent && phoneOtp.trim());

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Đăng Ký</Text>

          {/* OAuth Buttons */}
          <TouchableOpacity
            style={styles.oauthBtn}
            onPress={() => handleOAuth('google')}
            disabled={!!oauthLoading}
            activeOpacity={0.7}
          >
            {oauthLoading === 'google' ? (
              <ActivityIndicator size="small" color="#555" />
            ) : (
              <GoogleBadge />
            )}
            <Text style={styles.oauthBtnText}>
              {oauthLoading === 'google' ? 'Đang chuyển hướng...' : 'Đăng ký với Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthBtn, { marginTop: 10 }]}
            onPress={() => handleOAuth('facebook')}
            disabled={!!oauthLoading}
            activeOpacity={0.7}
          >
            {oauthLoading === 'facebook' ? (
              <ActivityIndicator size="small" color="#555" />
            ) : (
              <FacebookBadge />
            )}
            <Text style={styles.oauthBtnText}>
              {oauthLoading === 'facebook' ? 'Đang chuyển hướng...' : 'Đăng ký với Facebook'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc đăng ký bằng tài khoản</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.subTitle}>
            Xác thực qua email hoặc số điện thoại (1 trong 2)
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {!!infoMessage && !error && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{infoMessage}</Text>
            </View>
          )}

          {/* Name row */}
          <View style={styles.rowHalf}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First name *</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(v) => setField('firstName', v)}
                placeholder="VD: John"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last name *</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(v) => setField('lastName', v)}
                placeholder="VD: Doe"
                autoCapitalize="words"
              />
            </View>
          </View>

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(v) => setField('username', v)}
            placeholder="Tên đăng nhập"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mật khẩu *</Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(v) => setField('password', v)}
            placeholder="Tối thiểu 6 ký tự"
            secureTextEntry
          />

          {/* Identity verification */}
          <Text style={styles.sectionTitle}>
            Xác thực danh tính <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <Text style={styles.sectionSubtitle}>
            Cần xác thực ít nhất 1 trong 2 phương thức bên dưới
          </Text>

          {/* Email OTP */}
          <OtpSection
            title="Xác thực qua Email"
            inputValue={formData.email}
            onInputChange={(v) => setField('email', v)}
            inputPlaceholder="your@email.com"
            keyboardType="email-address"
            onSend={handleSendEmailOtp}
            sendLoading={emailOtpLoading}
            cooldown={emailCooldown}
            otpSent={emailOtpSent}
            otpValue={emailOtp}
            onOtpChange={setEmailOtp}
          />

          {/* Phone OTP */}
          <OtpSection
            title="Xác thực qua Số điện thoại"
            inputValue={formData.phone}
            onInputChange={(v) => setField('phone', v)}
            inputPlaceholder="0912345678 (10 chữ số)"
            keyboardType="phone-pad"
            onSend={handleSendPhoneOtp}
            sendLoading={phoneOtpLoading}
            cooldown={phoneCooldown}
            otpSent={phoneOtpSent}
            otpValue={phoneOtp}
            onOtpChange={setPhoneOtp}
          />

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (loading || !atLeastOneOtpReady) && styles.disabledBtn,
            ]}
            onPress={handleSubmit}
            disabled={loading || !atLeastOneOtpReady}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Đăng Ký</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signin')}>
              <Text style={styles.linkText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#3B82F6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 18,
  },
  subTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 14,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  oauthIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  oauthIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  oauthBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    flexShrink: 1,
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  successText: {
    color: '#15803D',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  rowHalf: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  otpBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  otpBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#fff',
  },
  sendOtpBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  sendOtpBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  warnText: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
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
    color: '#6B7280',
  },
  linkText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
});

export default SignupScreen;
