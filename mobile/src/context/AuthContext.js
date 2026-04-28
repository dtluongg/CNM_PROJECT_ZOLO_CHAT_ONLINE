import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLogoutCallback } from '../services/apiClient';
import { supabase } from '../config/supabase';
import { API_BASE_URL } from '../config/env';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] INITIALIZING WITH API_BASE_URL:', API_BASE_URL);
    const timeout = setTimeout(() => {
      console.warn('[AuthContext] restoreSession timeout');
      setLoading(false);
    }, 5000);

    (async () => {
      try {
        const storedToken   = await AsyncStorage.getItem('accessToken');
        const storedUserRaw = await AsyncStorage.getItem('currentUser');
        if (storedToken) {
          setToken(storedToken);
          if (storedUserRaw) {
            try { setUser(JSON.parse(storedUserRaw)); } catch {}
          }
        }
      } catch (e) {
        console.error('[AuthContext] restoreSession error:', e);
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUser']);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    })();
    return () => clearTimeout(timeout);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUser']);
    } catch {}
  }, []);

  // Register logout with apiClient so it can force-logout on 401 refresh failure
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  const login = async (accessToken, userData, refreshToken) => {
    setToken(accessToken);
    setUser(userData);
    try {
      const items = [
        ['accessToken', accessToken],
        ['currentUser', JSON.stringify(userData)],
      ];
      if (refreshToken) items.push(['refreshToken', refreshToken]);
      await AsyncStorage.multiSet(items);
    } catch (e) {
      console.error('[AuthContext] login error:', e);
    }
  };

  const updateToken = async (newToken) => {
    setToken(newToken);
    try { await AsyncStorage.setItem('accessToken', newToken); } catch {}
  };

  const updateUser = async (newUserData) => {
    const merged = { ...user, ...newUserData };
    setUser(merged);
    try { await AsyncStorage.setItem('currentUser', JSON.stringify(merged)); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
