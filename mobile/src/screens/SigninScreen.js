import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../services/apiClient';

WebBrowser.maybeCompleteAuthSession();

// ── SVG-free Google/Facebook icon placeholders rendered as styled text ──
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

const SigninScreen = ({ navigation, route }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'facebook' | null

  useEffect(() => {
    if (route.params?.message) {
      setSuccessMessage(route.params.message);
    }
  }, [route.params]);

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post('/users/signin', {
        username: username.trim(),
        password,
      });
      if (response.status === 200) {
        const { accessToken, refreshToken, user } = response.data;
        await login(accessToken, user, refreshToken);
        // Navigation happens automatically via AppNavigator when token is set
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      const redirectUri = Linking.createURL('auth/callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
        },
      });

      if (oauthError || !data?.url) {
        setError(oauthError?.message || `Không thể bắt đầu đăng nhập ${provider}`);
        setOauthLoading(null);
        return;
      }

      // Xử lý URL callback (từ deep link hoặc WebBrowser result)
      const handleCallbackUrl = async (url) => {
        let session = null;
        if (url) {
          // PKCE: ?code=
          const codeMatch = url.match(/[?&]code=([^&#]+)/);
          if (codeMatch) {
            const { data: exchanged } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
            session = exchanged?.session;
          }
          // Implicit: #access_token=
          if (!session) {
            const hashMatch = url.match(/#(.+)/);
            if (hashMatch) {
              const p = new URLSearchParams(hashMatch[1]);
              const at = p.get('access_token');
              if (at) {
                const { data: s } = await supabase.auth.setSession({
                  access_token: at,
                  refresh_token: p.get('refresh_token') || '',
                });
                session = s?.session;
              }
            }
          }
        }
        // Fallback: getSession
        if (!session) {
          const { data: cur } = await supabase.auth.getSession();
          session = cur?.session;
        }
        return session;
      };

      // Bắt deep link qua Linking (Android đôi khi không trả URL qua WebBrowser)
      let linkHandled = false;
      const linkSub = Linking.addEventListener('url', async ({ url }) => {
        if (linkHandled) return;
        linkHandled = true;
        linkSub.remove();
        const session = await handleCallbackUrl(url);
        if (session) {
          await syncOAuthSession(session, navigation);
        } else {
          setError('Không thể lấy session OAuth. Vui lòng thử lại.');
        }
        setOauthLoading(null);
      });

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'cancel') {
        linkHandled = true;
        linkSub.remove();
        setOauthLoading(null);
        return;
      }

      // Nếu WebBrowser trả URL (iOS hoặc Android thành công)
      if (!linkHandled && result.url) {
        linkHandled = true;
        linkSub.remove();
        const session = await handleCallbackUrl(result.url);
        if (session) {
          await syncOAuthSession(session, navigation);
        } else {
          setError('Không thể lấy session OAuth. Vui lòng thử lại.');
        }
        setOauthLoading(null);
        return;
      }

      // Timeout: nếu deep link vẫn chưa được xử lý sau 8 giây
      setTimeout(async () => {
        if (linkHandled) return;
        linkHandled = true;
        linkSub.remove();
        const session = await handleCallbackUrl(null);
        if (session) {
          await syncOAuthSession(session, navigation);
        } else {
          setError('Không thể lấy session OAuth. Vui lòng thử lại.');
        }
        setOauthLoading(null);
      }, 8000);

    } catch (err) {
      console.error('OAuth error:', err);
      setError(`Không thể kết nối ${provider}. Vui lòng thử lại.`);
      setOauthLoading(null);
    }
  };

  const syncOAuthSession = async (session, nav) => {
    try {
      const res = await apiClient.post('/auth/sync-oauth', {
        access_token: session.access_token,
      });

      if (res.data.needsEmailVerification) {
        // Facebook user with no email — go to CompleteProfile
        nav.navigate('CompleteProfile', {
          supabaseId: res.data.supabaseId,
          provider: res.data.provider,
          displayName: res.data.displayName,
          avatar: res.data.avatar,
          accessToken: session.access_token,
        });
        return;
      }

      await login(session.access_token, res.data.user);
      // AppNavigator will redirect to Dashboard automatically
    } catch (err) {
      setError(
        err.response?.data?.message || 'Đồng bộ tài khoản thất bại. Vui lòng thử lại.'
      );
    }
  };

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
          <Text style={styles.title}>Đăng Nhập</Text>

          {!!successMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
              {oauthLoading === 'google'
                ? 'Đang chuyển hướng...'
                : 'Tiếp tục với Google'}
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
              {oauthLoading === 'facebook'
                ? 'Đang chuyển hướng...'
                : 'Tiếp tục với Facebook'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc đăng nhập bằng tài khoản</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Local login form */}
          <Text style={styles.label}>Username hoặc Email</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Tên đăng nhập hoặc email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Đăng Nhập</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.linkText}>Đăng ký ngay</Text>
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
    // Gradient-like background via a simple color — LinearGradient requires expo-linear-gradient
    backgroundColor: '#3B82F6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
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
    marginBottom: 22,
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
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
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
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
    marginVertical: 20,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    flexShrink: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.6,
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

export default SigninScreen;
