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
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: auto-refresh on 401 ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config;
    if (error.response?.status !== 401 || orig._retry) {
      return Promise.reject(error);
    }
    orig._retry = true;

    // 1. Supabase session refresh (OAuth users)
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        await AsyncStorage.setItem('accessToken', session.access_token);
        orig.headers.Authorization = `Bearer ${session.access_token}`;
        return apiClient(orig);
      }
    } catch {}

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
