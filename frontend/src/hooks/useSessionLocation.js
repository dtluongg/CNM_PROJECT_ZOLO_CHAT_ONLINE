import { useEffect, useRef } from 'react';
import { getSessionId } from '../utils/authStorage';
import apiClient from '../services/apiClient';

/**
 * Hook: Cập nhật vị trí session bằng GPS sau khi login thành công.
 * 
 * Rules:
 * - Chỉ chạy SAU KHI user đã authenticated (có sessionId)
 * - KHÔNG popup xin permission mới — chỉ dùng nếu permission đã 'granted'
 * - Timeout ngắn (10s) + silent fail — không ảnh hưởng UX
 * - Chỉ chạy 1 lần per session (useRef guard)
 * - Delay 2s sau mount để không block initial render
 */
const useSessionLocation = () => {
  const hasSent = useRef(false);

  useEffect(() => {
    if (hasSent.current) return;

    const updateLocation = async () => {
      try {
        const sessionId = getSessionId();
        if (!sessionId) return;

        // Kiểm tra: Browser có hỗ trợ geolocation không?
        if (!navigator.geolocation) return;

        // Kiểm tra permission hiện tại — KHÔNG trigger popup
        let permissionState = 'prompt'; // default
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          permissionState = permission.state;
        } catch {
          // Một số browser (Safari) không hỗ trợ Permissions API
          // → skip silently, không gọi GPS
          return;
        }

        // Chỉ tiếp tục nếu permission đã 'granted' (user đã cho phép trước đó)
        if (permissionState !== 'granted') return;

        // Lấy vị trí GPS — timeout ngắn, cache 5 phút
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              hasSent.current = true;
              await apiClient.patch('/sessions/update-location', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
              console.log('[SessionLocation] GPS location updated successfully');
            } catch {
              // Silent fail — không ảnh hưởng UX
            }
          },
          () => {
            // Geolocation error (timeout, denied mid-request, etc.) → silent
          },
          {
            timeout: 10000,        // Tối đa 10s chờ GPS
            maximumAge: 300000,     // Chấp nhận cache 5 phút
            enableHighAccuracy: false, // City-level đủ rồi, tiết kiệm pin
          }
        );
      } catch {
        // Silent fail toàn bộ — login UX không bị ảnh hưởng
      }
    };

    // Delay 2s sau mount để không block initial render / login flow
    const timer = setTimeout(updateLocation, 2000);
    return () => clearTimeout(timer);
  }, []);
};

export default useSessionLocation;
