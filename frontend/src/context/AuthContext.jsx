import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import {
  getAccessToken,
  getCurrentUserRaw,
  setAccessToken,
  setCurrentUserRaw,
  removeAccessToken,
  removeCurrentUserRaw,
  migrateLegacyAuthStorage,
} from '../utils/authStorage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      migrateLegacyAuthStorage();

      const storedToken = getAccessToken();
      const storedUserRaw = getCurrentUserRaw();

      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Load cache ngay lập tức để UI hiện nhanh
      if (storedUserRaw) {
        try {
          const cachedUser = JSON.parse(storedUserRaw);
          setUser(cachedUser);
          setToken(storedToken);
        } catch {
          removeCurrentUserRaw();
        }
      }

      // Thử refresh Supabase session nếu là OAuth user
      // Supabase tự động refresh token hết hạn bằng refresh_token nội bộ
      let activeToken = storedToken;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          // Dùng token mới từ Supabase (có thể đã được refresh tự động)
          activeToken = session.access_token;
          if (activeToken !== storedToken) {
            setAccessToken(activeToken);
          }
          setToken(activeToken);
        }
      } catch {
        // Không phải OAuth user, dùng local JWT
      }

      // Gọi authme để lấy dữ liệu mới nhất từ MongoDB (retry 1 lần nếu lỗi mạng)
      const apiUrl = import.meta.env.VITE_API_URL || '/backend/api';
      const fetchAuthMe = async (token) => {
        const res = await fetch(`${apiUrl}/auth/authme`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res;
      };
      try {
        let res = await fetchAuthMe(activeToken);
        // Retry 1 lần nếu lỗi mạng thoáng qua (503/500)
        if (!res.ok && (res.status === 503 || res.status === 500)) {
          await new Promise(r => setTimeout(r, 800));
          res = await fetchAuthMe(activeToken);
        }
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
            setCurrentUserRaw(JSON.stringify(data.user));
          }
        }
      } catch {
        // Network error, dùng cache
      } finally {
        setLoading(false);
      }
    };

    init();

    // Lắng nghe Supabase tự refresh token (OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        const newToken = session.access_token;
        setToken(newToken);
        setAccessToken(newToken);
        // Refresh user data với token mới để đảm bảo role/isBanned cập nhật
        const apiUrl = import.meta.env.VITE_API_URL || '/backend/api';
        try {
          const res = await fetch(`${apiUrl}/auth/authme`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              setUser(data.user);
              setCurrentUserRaw(JSON.stringify(data.user));
            }
          }
        } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    setAccessToken(accessToken);
    setCurrentUserRaw(JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    removeAccessToken();
    removeCurrentUserRaw();
    // Đăng xuất khỏi Supabase session nếu là OAuth
    supabase.auth.signOut().catch(() => {});
  };

  const updateToken = (newAccessToken) => {
    setToken(newAccessToken);
    setAccessToken(newAccessToken);
  };

  const updateUser = (newUserData) => {
    const merged = { ...user, ...newUserData };
    setUser(merged);
    setCurrentUserRaw(JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};