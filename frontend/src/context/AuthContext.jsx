import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUserRaw = localStorage.getItem('currentUser');

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
          localStorage.removeItem('currentUser');
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
            localStorage.setItem('accessToken', activeToken);
          }
          setToken(activeToken);
        }
      } catch {
        // Không phải OAuth user, dùng local JWT
      }

      // Gọi authme để lấy dữ liệu mới nhất từ MongoDB
      const apiUrl = import.meta.env.VITE_API_URL || '/backend/api';
      try {
        const res = await fetch(`${apiUrl}/auth/authme`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        setToken(session.access_token);
        localStorage.setItem('accessToken', session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    // Đăng xuất khỏi Supabase session nếu là OAuth
    supabase.auth.signOut().catch(() => {});
  };

  const updateToken = (newAccessToken) => {
    setToken(newAccessToken);
    localStorage.setItem('accessToken', newAccessToken);
  };

  const updateUser = (newUserData) => {
    const merged = { ...user, ...newUserData };
    setUser(merged);
    localStorage.setItem('currentUser', JSON.stringify(merged));
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
