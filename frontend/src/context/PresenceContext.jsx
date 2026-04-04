import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const PresenceContext = createContext({ onlineUsers: new Set(), isUserOnline: () => false, getPresenceStatus: () => null });

export const PresenceProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [presenceMeta, setPresenceMeta] = useState({});
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user?._id) {
      setOnlineUsers(new Set());
      setPresenceMeta({});
      return;
    }

    // Xóa channel cũ trước nếu còn (quan trọng với React StrictMode)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel('presence:global', {
      config: { presence: { key: String(user._id) } },
    });

    const syncState = () => {
      const state = channel.presenceState();
      const ids = new Set();
      const meta = {};
      Object.entries(state).forEach(([key, presences]) => {
        if (presences?.length > 0) {
          ids.add(key);
          meta[key] = presences[0];
        }
      });
      setOnlineUsers(ids);
      setPresenceMeta(meta);
    };

    // Phải đăng ký tất cả .on() TRƯỚC khi gọi .subscribe()
    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
        if (newPresences?.length > 0) {
          setPresenceMeta(prev => ({ ...prev, [key]: newPresences[0] }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setPresenceMeta(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (user.status !== 'invisible') {
            await channel.track({
              userId: String(user._id),
              status: user.status || 'online',
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      // Xóa channel đồng bộ trong cleanup để tránh conflict StrictMode
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?._id, user?.status]);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    const key = String(userId);
    if (!onlineUsers.has(key)) return false;
    const meta = presenceMeta[key];
    if (meta?.status === 'invisible') return false;
    return true;
  };

  const getPresenceStatus = (userId) => {
    if (!userId) return null;
    const key = String(userId);
    if (!onlineUsers.has(key)) return null;
    const meta = presenceMeta[key];
    if (meta?.status === 'invisible') return null;
    return meta?.status || 'online';
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline, getPresenceStatus }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
