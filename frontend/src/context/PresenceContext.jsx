import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const PresenceContext = createContext({ onlineUsers: new Set(), isUserOnline: () => false, getPresenceStatus: () => null });

export const PresenceProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [presenceMeta, setPresenceMeta] = useState({});
  const channelRef = useRef(null);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (!user?._id) {
      setOnlineUsers(new Set());
      setPresenceMeta({});
      return;
    }

    // Cleanup cũ
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel('presence:global');

    const syncState = () => {
      const state = channel.presenceState();
      const ids = new Set();
      const meta = {};

      Object.entries(state).forEach(([key, presences]) => {
        if (presences?.length > 0) {
          const data = presences[0];
          const lastSeen = new Date(data.online_at || 0).getTime();

          // 🔥 STRICT CLEANUP: chỉ giữ presence < 60s
          if (Date.now() - lastSeen > 60000) {
            console.log('🧹 CLEANED STALE:', key, 'age:', Math.round((Date.now() - lastSeen)/1000) + 's');
            return;
          }

          ids.add(key);
          meta[key] = data;
        }
      });

      console.log('🔥 SYNC:', { online: ids.size, total: Object.keys(state).length });
      setOnlineUsers(ids);
      setPresenceMeta(meta);
    };

    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('➕ JOIN:', key);
        syncState(); // Force sync
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('➖ LEAVE:', key);
        syncState();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ CONNECTED:', user._id);
          // Track KHÔNG dùng config key ở đây
          await channel.track({
            userId: String(user._id),
            status: user.status || 'online',
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // 🔥 AGGRESSIVE HEARTBEAT: mỗi 15s
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current && document.visibilityState === 'visible') {
        console.log('💓 HEARTBEAT:', user._id);
        await channelRef.current.track({
          userId: String(user._id),
          status: user.status || 'online',
          online_at: new Date().toISOString(),
        });
      }
    }, 15000); // 15s thay vì 30s

    // 🔥 BEFOREUNLOAD - Force track lần cuối
    const handleBeforeUnload = () => {
      console.log('🚪 BEFORE UNLOAD');
      if (channelRef.current) {
        channelRef.current.track({
          userId: String(user._id),
          status: 'offline',
          online_at: new Date().toISOString(),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      console.log('🧹 FULL CLEANUP');
      clearInterval(heartbeatRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [user?._id, user?.status]);

  // 🔥 ULTRA STRICT ONLINE CHECK
  const isUserOnline = (userId) => {
    const key = String(userId);
    const hasPresence = onlineUsers.has(key);
    const meta = presenceMeta[key];

    if (!hasPresence || !meta) return false;
    if (meta.status === 'invisible') return false;

    const age = Date.now() - new Date(meta.online_at || 0).getTime();
    const isRecent = age < 30000; // 30s MAX

    console.log('🔍 ONLINE CHECK:', userId, {
      age: Math.round(age/1000) + 's',
      status: meta.status,
      recent: isRecent
    });

    return isRecent;
  };

  const getPresenceStatus = (userId) => {
    const key = String(userId);
    if (!onlineUsers.has(key)) return null;
    const meta = presenceMeta[key];
    if (meta?.status === 'invisible') return null;
    return meta?.status || 'online';
  };

  return (
    <PresenceContext.Provider value={{
      onlineUsers,
      isUserOnline,
      getPresenceStatus,
      presenceMeta,
      totalOnline: onlineUsers.size
    }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
