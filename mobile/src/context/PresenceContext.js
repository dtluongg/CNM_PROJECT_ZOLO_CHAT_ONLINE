import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config/env';

// ─── Utility: hiển thị "hoạt động X phút trước" ─────────────────────────────
export const formatLastSeen = (dateOrIso) => {
  if (!dateOrIso) return 'Ngoại tuyến';
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return 'Ngoại tuyến';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Vừa mới hoạt động';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const PresenceContext = createContext();

export const PresenceProvider = ({ children }) => {
  const { user, token, logout } = useAuth();
  const [onlineSet, setOnlineSet]         = useState(new Set());
  const [statusMap, setStatusMap]         = useState({}); // userId → 'online'|'idle'|'dnd'
  const [statusTextMap, setStatusTextMap] = useState({}); // userId → custom status text
  const [lastSeenMap, setLastSeenMap]     = useState({}); // userId → ISO timestamp
  const [sessionUpdateCounter, setSessionUpdateCounter] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?._id || !token) {
      setOnlineSet(new Set());
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    // Khi kết nối, yêu cầu danh sách online hiện tại + làm mới session
    socket.on('connect', () => {
      socket.emit('presence:subscribe');
      setSessionUpdateCounter(prev => prev + 1);
    });

    // Nhận snapshot danh sách online (có kèm statusMap + statusTextMap)
    socket.on('presence:online-list', ({ userIds, statusMap: sm, statusTextMap: stm }) => {
      const ids = Array.isArray(userIds) ? userIds.map(String) : [];
      setOnlineSet(new Set(ids));
      if (sm && typeof sm === 'object') {
        const normalized = {};
        Object.entries(sm).forEach(([k, v]) => { normalized[String(k)] = v; });
        setStatusMap(normalized);
      }
      if (stm && typeof stm === 'object') {
        const norm = {};
        Object.entries(stm).forEach(([k, v]) => { norm[String(k)] = v; });
        setStatusTextMap(norm);
      }
    });

    // User vừa online: cập nhật status + statusText, xóa khỏi lastSeenMap
    socket.on('presence:online', ({ userId, status, statusText }) => {
      const uid = String(userId);
      setOnlineSet(prev => new Set([...prev, uid]));
      setStatusMap(prev => ({ ...prev, [uid]: status || 'online' }));
      setStatusTextMap(prev => ({ ...prev, [uid]: statusText || '' }));
      setLastSeenMap(prev => {
        if (!prev[uid]) return prev;
        const next = { ...prev };
        delete next[uid];
        return next;
      });
    });

    // User vừa offline: lưu lastSeen, xóa khỏi onlineSet & maps
    socket.on('presence:offline', ({ userId, lastSeen }) => {
      const uid = String(userId);
      setOnlineSet(prev => {
        const next = new Set(prev); next.delete(uid); return next;
      });
      setStatusMap(prev => { const n = { ...prev }; delete n[uid]; return n; });
      setStatusTextMap(prev => { const n = { ...prev }; delete n[uid]; return n; });
      if (lastSeen) {
        setLastSeenMap(prev => ({ ...prev, [uid]: lastSeen }));
      }
    });

    // User thay đổi trạng thái hoặc statusText
    socket.on('presence:status-changed', ({ userId, status, statusText }) => {
      const uid = String(userId);
      setOnlineSet(prev => new Set([...prev, uid]));
      setStatusMap(prev => ({ ...prev, [uid]: status || 'online' }));
      setStatusTextMap(prev => ({ ...prev, [uid]: statusText ?? prev[uid] ?? '' }));
      setLastSeenMap(prev => {
        if (!prev[uid]) return prev;
        const next = { ...prev }; delete next[uid]; return next;
      });
    });

    // ── Xử lý bị đăng xuất từ xa ────────────────────────────────
    socket.on('session:terminated', async ({ sessionId, initiatedBy, reason }) => {
      const mySessionId = await AsyncStorage.getItem('sessionId');

      // Nếu mình là người khởi tạo lệnh, không tự logout mình
      if (initiatedBy && mySessionId && initiatedBy === mySessionId) {
        console.log('[PresenceContext] Ignoring self-initiated termination');
        return;
      }

      // CHỈ logout nếu sessionId CHÍNH XÁC là của mình
      if (sessionId && sessionId === mySessionId) {
        Alert.alert(
          'Phiên đăng nhập kết thúc',
          reason || 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác.',
          [{ text: 'Đã hiểu', onPress: () => { logout(); } }]
        );
      }
    });

    socket.on('session:terminated-others', async ({ exceptSessionId, reason }) => {
      const mySessionId = await AsyncStorage.getItem('sessionId');

      // Nếu ID của mình nằm trong danh sách ngoại trừ -> bỏ qua
      if (exceptSessionId && mySessionId && exceptSessionId === mySessionId) {
        console.log('[PresenceContext] Ignoring collective termination (self-exempt)');
        return;
      }

      // Còn lại thì logout hết
      Alert.alert(
        'Phiên đăng nhập kết thúc',
        reason || 'Tất cả các phiên đăng nhập khác đã bị kết thúc từ thiết bị của bạn.',
        [{ text: 'Đã hiểu', onPress: () => { logout(); } }]
      );
    });

    // ── Lắng nghe cập nhật danh sách session ────────────────────
    socket.on('session:update', () => {
      setSessionUpdateCounter(prev => prev + 1);
    });

    // Tín hiệu định danh cá nhân (Double check — đảm bảo nhận được dù socket room bị stale)
    if (user?._id) {
      socket.on(`session:update:${String(user._id)}`, () => {
        setSessionUpdateCounter(prev => prev + 1);
      });
    }

    // Reconnect khi app vào foreground
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    });

    return () => {
      appSub.remove();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id, token]);

  const isUserOnline = useCallback(
    (userId) => onlineSet.has(String(userId)),
    [onlineSet],
  );

  // Trả về trạng thái thực: 'online' | 'idle' | 'dnd' | null (offline)
  const getPresenceStatus = useCallback(
    (userId) => {
      const uid = String(userId);
      if (!onlineSet.has(uid)) return null;
      return statusMap[uid] || 'online';
    },
    [onlineSet, statusMap],
  );

  // Trả về ISO timestamp lần cuối hoạt động (null nếu đang online)
  const getLastSeen = useCallback(
    (userId) => {
      const uid = String(userId);
      if (onlineSet.has(uid)) return null;
      return lastSeenMap[uid] || null;
    },
    [onlineSet, lastSeenMap],
  );

  // Trả về custom status text (Discord-style)
  const getStatusText = useCallback(
    (userId) => statusTextMap[String(userId)] || '',
    [statusTextMap],
  );

  return (
    <PresenceContext.Provider value={{ isUserOnline, getPresenceStatus, getLastSeen, getStatusText, sessionUpdateCounter }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
