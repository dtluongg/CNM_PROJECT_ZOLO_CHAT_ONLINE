import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import notificationApi from '../features/notifications/api/notificationApi';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';

const NotificationContext = createContext(null);

const SOUND_PREF_KEY = 'notif_sound_enabled';
const BANNER_PREF_KEY = 'notif_banner_enabled';

const readBool = (key, defaultValue = true) => {
  const value = localStorage.getItem(key);
  if (value === null) return defaultValue;
  return value === 'true';
};

const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.03;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch (_) {
    // Ignore sound errors.
  }
};

export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [toast, setToast] = useState(null);

  const [soundEnabled, setSoundEnabledState] = useState(() => readBool(SOUND_PREF_KEY, true));
  const [bannerEnabled, setBannerEnabledState] = useState(() => readBool(BANNER_PREF_KEY, true));

  const socketRef = useRef(null);
  const toastTimerRef = useRef(null);
  const nextCursorRef = useRef(null);
  const unreadRef = useRef(0);

  useEffect(() => {
    unreadRef.current = unreadCount;
  }, [unreadCount]);

  const showToastFromLatest = useCallback(async () => {
    try {
      if (!bannerEnabled) return;
      const res = await notificationApi.list({ limit: 1 });
      const latest = Array.isArray(res?.data?.data) ? res.data.data[0] : null;
      if (!latest?._id) return;
      setToast({
        id: latest._id,
        title: latest.title || 'Thông báo mới',
        body: latest.body || '',
      });
    } catch (_) {
      // Ignore fallback fetch errors.
    }
  }, [bannerEnabled]);

  const setSoundEnabled = useCallback((value) => {
    setSoundEnabledState(value);
    localStorage.setItem(SOUND_PREF_KEY, String(value));
  }, []);

  const setBannerEnabled = useCallback((value) => {
    setBannerEnabledState(value);
    localStorage.setItem(BANNER_PREF_KEY, String(value));
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(Number(res?.data?.unreadCount || 0));
    } catch (_) {
      // Keep previous state on failure.
    }
  }, []);

  const fetchNotifications = useCallback(async ({ append = false, cursor = null } = {}) => {
    try {
      setLoading(true);
      const effectiveCursor = append ? (cursor || nextCursorRef.current) : null;
      const res = await notificationApi.list({ cursor: effectiveCursor, limit: 20 });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const meta = res?.data?.meta || {};

      setItems((prev) => (append ? [...prev, ...list] : list));
      setHasMore(Boolean(meta.hasMore));
      setNextCursor(meta.nextCursor || null);
      nextCursorRef.current = meta.nextCursor || null;
      if (typeof meta.unreadCount === 'number') {
        setUnreadCount(meta.unreadCount);
      }
    } catch (_) {
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    try {
      await notificationApi.markRead(notificationId);
      setItems((prev) => prev.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      ));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) {
      // Ignore action errors.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (_) {
      // Ignore action errors.
    }
  }, []);

  const getConversationSetting = useCallback(async (conversationId) => {
    const res = await notificationApi.getSetting(conversationId);
    return res?.data?.data || null;
  }, []);

  const updateConversationSetting = useCallback(async (conversationId, payload) => {
    const res = await notificationApi.updateSetting(conversationId, payload);
    return res?.data?.data || null;
  }, []);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    fetchNotifications({ append: false });
    fetchUnreadCount();

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('notifications:new', ({ notification }) => {
      if (!notification?._id) return;

      setItems((prev) => {
        if (prev.some((item) => item._id === notification._id)) return prev;
        return [notification, ...prev];
      });

      if (notification.isRead !== true) {
        setUnreadCount((prev) => prev + 1);
      }

      if (soundEnabled) {
        playBeep();
      }

      if (bannerEnabled) {
        setToast({
          id: notification._id,
          title: notification.title || 'Thông báo mới',
          body: notification.body || '',
        });
      }
    });

    socket.on('notifications:unread-count', ({ unreadCount: value }) => {
      if (typeof value === 'number') {
        const previous = unreadRef.current;
        setUnreadCount(value);
        if (value > previous) {
          showToastFromLatest();
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, fetchNotifications, fetchUnreadCount, bannerEnabled, soundEnabled, showToastFromLatest]);

  // Fallback polling nhẹ để không mất thông báo khi socket bị chập chờn.
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await notificationApi.getUnreadCount();
        const nextUnread = Number(res?.data?.unreadCount || 0);
        const previous = unreadRef.current;

        if (nextUnread > previous) {
          setUnreadCount(nextUnread);
          await fetchNotifications({ append: false });
          showToastFromLatest();
        } else if (nextUnread !== previous) {
          setUnreadCount(nextUnread);
        }
      } catch (_) {
        // Ignore polling failures.
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [token, fetchNotifications, showToastFromLatest]);

  useEffect(() => {
    if (!toast?.id) return;
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(toastTimerRef.current);
  }, [toast]);

  const value = useMemo(() => ({
    items,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    markRead,
    markAllRead,
    toast,
    dismissToast: () => setToast(null),
    soundEnabled,
    setSoundEnabled,
    bannerEnabled,
    setBannerEnabled,
    getConversationSetting,
    updateConversationSetting,
  }), [
    items,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    markRead,
    markAllRead,
    toast,
    soundEnabled,
    setSoundEnabled,
    bannerEnabled,
    setBannerEnabled,
    getConversationSetting,
    updateConversationSetting,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
