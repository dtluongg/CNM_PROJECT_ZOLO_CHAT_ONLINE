import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { API_BASE_URL } from '../config/env';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Callback registered by AuthContext to force-logout when all refreshes fail
let _logoutCallback = null;
export const setLogoutCallback = (fn) => { _logoutCallback = fn; };

// ── Request: attach Bearer token ─────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      
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
    console.error(`[apiClient] !!! ERROR ${error.response?.status || 'NETWORK'}: ${fullUrl}`);
    if (error.response?.data) {
      console.error(`[apiClient] !!! MSG:`, error.response.data);
    }

    if (error.response?.status !== 401 || orig._retry) {
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
