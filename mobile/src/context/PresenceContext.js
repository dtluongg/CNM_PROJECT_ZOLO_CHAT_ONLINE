import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
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
  const { user, token } = useAuth();
  const [onlineSet, setOnlineSet]     = useState(new Set());
  const [statusMap, setStatusMap]     = useState({}); // userId → 'online'|'idle'|'dnd'
  const [lastSeenMap, setLastSeenMap] = useState({}); // userId → ISO timestamp
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

    // Khi kết nối, yêu cầu danh sách online hiện tại
    socket.on('connect', () => {
      socket.emit('presence:subscribe');
    });

    // Nhận snapshot danh sách online (có kèm statusMap)
    socket.on('presence:online-list', ({ userIds, statusMap: sm }) => {
      const ids = Array.isArray(userIds) ? userIds.map(String) : [];
      setOnlineSet(new Set(ids));
      if (sm && typeof sm === 'object') {
        const normalized = {};
        Object.entries(sm).forEach(([k, v]) => { normalized[String(k)] = v; });
        setStatusMap(normalized);
      }
    });

    // User vừa online: cập nhật status, xóa khỏi lastSeenMap
    socket.on('presence:online', ({ userId, status }) => {
      const uid = String(userId);
      setOnlineSet(prev => new Set([...prev, uid]));
      setStatusMap(prev => ({ ...prev, [uid]: status || 'online' }));
      setLastSeenMap(prev => {
        if (!prev[uid]) return prev;
        const next = { ...prev };
        delete next[uid];
        return next;
      });
    });

    // User vừa offline: lưu lastSeen, xóa khỏi onlineSet & statusMap
    socket.on('presence:offline', ({ userId, lastSeen }) => {
      const uid = String(userId);
      setOnlineSet(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
      setStatusMap(prev => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      if (lastSeen) {
        setLastSeenMap(prev => ({ ...prev, [uid]: lastSeen }));
      }
    });

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

  return (
    <PresenceContext.Provider value={{ isUserOnline, getPresenceStatus, getLastSeen }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
