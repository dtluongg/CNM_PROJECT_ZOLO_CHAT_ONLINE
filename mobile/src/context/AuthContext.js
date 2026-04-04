import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from AsyncStorage on app start
  useEffect(() => {
    // Safety timeout: nếu AsyncStorage treo quá 5s thì vẫn thoát loading
    const timeout = setTimeout(() => {
      console.warn('[AuthContext] restoreSession timeout — forcing loading=false');
      setLoading(false);
    }, 5000);

    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('accessToken');
        const storedUserRaw = await AsyncStorage.getItem('currentUser');

        if (storedToken) {
          setToken(storedToken);
          if (storedUserRaw) {
            try {
              setUser(JSON.parse(storedUserRaw));
            } catch {
              await AsyncStorage.removeItem('currentUser');
            }
          }
        }
      } catch (e) {
        console.error('[AuthContext] restoreSession error:', e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    restoreSession();
    return () => clearTimeout(timeout);
  }, []);

  const login = async (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (e) {
      console.error('[AuthContext] login storage error:', e);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('currentUser');
    } catch (e) {
      console.error('[AuthContext] logout storage error:', e);
    }
  };

  const updateToken = async (newAccessToken) => {
    setToken(newAccessToken);
    try {
      await AsyncStorage.setItem('accessToken', newAccessToken);
    } catch (e) {
      console.error('[AuthContext] updateToken error:', e);
    }
  };

  const updateUser = async (newUserData) => {
    const merged = { ...user, ...newUserData };
    setUser(merged);
    try {
      await AsyncStorage.setItem('currentUser', JSON.stringify(merged));
    } catch (e) {
      console.error('[AuthContext] updateUser error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, updateToken, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
