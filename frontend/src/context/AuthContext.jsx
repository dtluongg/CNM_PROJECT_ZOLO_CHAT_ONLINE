import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUserRaw = localStorage.getItem('currentUser');

    if (storedToken) {
      setToken(storedToken);

      if (storedUserRaw) {
        try {
          setUser(JSON.parse(storedUserRaw));
        } catch (error) {
          localStorage.removeItem('currentUser');
        }
      }
    }

    setLoading(false);
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
