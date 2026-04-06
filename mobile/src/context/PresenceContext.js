import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const PresenceContext = createContext();

export const PresenceProvider = ({ children }) => {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState({});

  const channelRef = useRef(null);
  const heartbeatRef = useRef(null);

  const syncState = useCallback((channel) => {
    const state = channel.presenceState();
    const map = {};

    Object.entries(state).forEach(([key, presences]) => {
      if (!presences || presences.length === 0) return;
      const p = presences[0];

      const age = Date.now() - new Date(p.online_at || 0).getTime();

      if (age > 30000) return; // chỉ giữ tối đa 30 giây

      map[key] = {
        status: p.status || 'online',
        online_at: p.online_at,
      };
    });

    setPresenceMap(map);
  }, []);

  useEffect(() => {
    if (!user?._id) {
      setPresenceMap({});
      return;
    }

    const channel = supabase.channel('presence:global');

    channel
      .on('presence', { event: '*' }, () => syncState(channel))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Presence connected for', user._id);
          await channel.track({
            userId: String(user._id),
            status: user.status || 'online',
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Heartbeat mạnh
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current && AppState.currentState === 'active') {
        await channelRef.current.track({
          userId: String(user._id),
          status: user.status || 'online',
          online_at: new Date().toISOString(),
        });
      }
    }, 8000); // 8 giây

    // AppState
    const appStateListener = AppState.addEventListener('change', async (nextState) => {
      if (!channelRef.current) return;

      if (nextState === 'background' || nextState === 'inactive') {
        console.log('📴 App background → untrack');
        await channelRef.current.untrack();
      } else if (nextState === 'active') {
        console.log('📱 App foreground → track');
        await channelRef.current.track({
          userId: String(user._id),
          status: user.status || 'online',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      clearInterval(heartbeatRef.current);
      appStateListener.remove();
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?._id, user?.status]);

  const isUserOnline = useCallback((userId) => {
    const data = presenceMap[String(userId)];
    if (!data || data.status === 'invisible') return false;
    const age = Date.now() - new Date(data.online_at).getTime();
    return age < 30000; // 30 giây
  }, [presenceMap]);

  const getPresenceStatus = useCallback((userId) => {
    const data = presenceMap[String(userId)];
    if (!data || data.status === 'invisible') return null;
    return data.status;
  }, [presenceMap]);

  return (
    <PresenceContext.Provider value={{
      isUserOnline,
      getPresenceStatus,
    }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);