/**
 * Central environment config — đổi IP 1 chỗ, chạy mọi thiết bị.
 *
 * Trong file .env:
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:2026/backend/api
 *
 * Android emulator : http://10.0.2.2:2026/backend/api
 * iOS simulator    : http://localhost:2026/backend/api
 * Thiết bị thật / Expo Go: http://<IP_LAN_máy>:2026/backend/api
 */

// ── CONFIG ──
// Ưu tiên biến môi trường từ .env (EXPO_PUBLIC_ prefix là bắt buộc cho Expo Go)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://172.20.10.3:2026/backend/api'; // Thay IP này bằng IP máy bạn (ipconfig)

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  API_BASE_URL.replace('/backend/api', '');

module.exports = { API_BASE_URL, SOCKET_URL };
