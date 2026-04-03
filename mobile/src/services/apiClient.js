import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Điện thoại thật: cần IP máy tính trên cùng WiFi
// Ví dụ: http://192.168.88.135:2026/backend/api
// (xem IP trong Metro: exp://192.168.xx.xx:8081 → lấy phần IP đó)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://192.168.88.135:2026/backend/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Attach Bearer token from AsyncStorage on each request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore storage errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
