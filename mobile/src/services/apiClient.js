import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { API_BASE_URL } from '../config/env';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'X-Zolo-Client': 'Mobile-App',
  },
});

// Callback registered by AuthContext to force-logout when all refreshes fail
let _logoutCallback = null;
export const setLogoutCallback = (fn) => { _logoutCallback = fn; };

// ── Request: attach Bearer token ─────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const sessionId = await AsyncStorage.getItem('sessionId');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      if (sessionId) config.headers['X-Zolo-Session-Id'] = sessionId;
      
      if (Platform.OS !== 'web') {
        config.headers['X-Device-Name'] = !Device.isDevice ? 'Emulator' : (Device.modelName || 'Mobile Device');
        config.headers['X-Device-Platform'] = Device.osName || 'Unknown';
      }
      
      // LOG REQUEST (LUÔN BẬT ĐỂ DEBUG)
      console.log(`[apiClient] >>> SENDING: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: auto-refresh on 401 ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // console.log(`[apiClient] <<< RECEIVED: ${response.status} from ${response.config.url}`);
    return response;
  },
  async (error) => {
    const orig = error.config;

    // LOG ERROR (LUÔN BẬT ĐỂ DEBUG)
    const fullUrl = `${orig?.baseURL || ''}${orig?.url || ''}`;
    console.warn(`[apiClient] !!! ERROR ${error.response?.status || 'NETWORK'}: ${fullUrl}`);
    if (error.response?.data) {
      console.warn(`[apiClient] !!! MSG:`, error.response.data);
    }

    if (error.response?.status !== 401 || orig._retry) {
      return Promise.reject(error);
    }

    // Nếu là request logout, đừng cố refresh token làm gì (tránh lỗi lặp)
    if (orig?.url && orig.url.includes('/auth/signout')) {
        return Promise.reject(error);
    }

    // Nếu session bị chấm dứt (kicked), không cần refresh, force logout ngay lập tức
    const msg = error.response?.data?.message || '';
    const code = error.response?.data?.code || '';
    if (code === 'SESSION_TERMINATED' || code === 'SESSION_NOT_FOUND' || msg.includes('Phiên đăng nhập đã bị kết thúc') || msg.includes('kicked')) {
      console.warn('[apiClient] Session terminated, forcing logout');
      try { await supabase.auth.signOut(); } catch {}
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUser', 'sessionId']);
      if (_logoutCallback) _logoutCallback();
      return Promise.reject(error);
    }
    
    orig._retry = true;

    // 1. Supabase session refresh (OAuth users)
    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[apiClient] Supabase refresh error:', refreshError.message);
      }
      if (session?.access_token) {
        await AsyncStorage.setItem('accessToken', session.access_token);
        orig.headers.Authorization = `Bearer ${session.access_token}`;
        return apiClient(orig);
      }
    } catch (e) {
      console.error('[apiClient] Supabase refresh catch:', e);
    }

    // Handle specific USER_NOT_SYNCED case
    if (error.response?.data?.code === 'USER_NOT_SYNCED') {
      console.warn('[apiClient] User not synced, forcing logout');
      try { await supabase.auth.signOut(); } catch {}
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUser']);
      if (_logoutCallback) _logoutCallback();
      return Promise.reject(error);
    }

    // 2. Local JWT refresh — POST /auth/refreshme with token in body
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refreshme`,
          { refreshToken },
          { timeout: 10000 }
        );
        const newToken = res.data?.accessToken;
        if (newToken) {
          await AsyncStorage.setItem('accessToken', newToken);
          orig.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(orig);
        }
      }
    } catch {}

    // 3. All failed → force logout
    try { await supabase.auth.signOut(); } catch {}
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUser']);
    if (_logoutCallback) _logoutCallback();
    return Promise.reject(error);
  }
);

export default apiClient;
