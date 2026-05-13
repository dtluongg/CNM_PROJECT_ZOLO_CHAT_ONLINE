import axios from 'axios';
import { supabase } from '../config/supabase';
import { getAccessToken, setAccessToken, getSessionId } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2026/backend/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'X-Zolo-Client': 'Web-App',
  },
});

// Request interceptor: gắn token vào mọi request
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    const sessionId = getSessionId();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (sessionId) {
      config.headers['X-Zolo-Session-Id'] = sessionId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: tự refresh token khi 401 và retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Chỉ retry 1 lần cho lỗi 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Thử refresh Supabase session (OAuth users)
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

        if (!refreshError && session?.access_token) {
          const newToken = session.access_token;
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Không phải Supabase session
      }

      // Thử refresh local JWT
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refreshme`,
          {},
          { withCredentials: true }
        );
        if (res.data?.accessToken) {
          const newToken = res.data.accessToken;
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh thất bại → không làm gì, để lỗi 401 truyền đi
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
