import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Reuse the same URL logic as MessageScreen
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.88.135:2026/backend/api')
    .replace('/backend/api', '');

const PresenceContext = createContext();

export const PresenceProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [onlineSet, setOnlineSet] = useState(new Set());
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

    // On connect, request the full list of currently online users
    socket.on('connect', () => {
      socket.emit('presence:subscribe');
    });

    // Receive the full snapshot of online user IDs
    socket.on('presence:online-list', ({ userIds }) => {
      setOnlineSet(new Set(Array.isArray(userIds) ? userIds.map(String) : []));
    });

    // Incremental: a user just came online
    socket.on('presence:online', ({ userId }) => {
      setOnlineSet(prev => new Set([...prev, String(userId)]));
    });

    // Incremental: a user just went offline
    socket.on('presence:offline', ({ userId }) => {
      setOnlineSet(prev => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
    });

    // Reconnect when app comes back to foreground
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

  const getPresenceStatus = useCallback(
    (userId) => (onlineSet.has(String(userId)) ? 'online' : null),
    [onlineSet],
  );

  return (
    <PresenceContext.Provider value={{ isUserOnline, getPresenceStatus }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
