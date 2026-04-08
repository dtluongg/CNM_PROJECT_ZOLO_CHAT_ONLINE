import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../api/apiClient';

const Navbar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Signout local session (graceful — trả 200 kể cả OAuth user không có cookie)
      await apiClient.post('/users/signout', {});
    } catch { /* ignore */ }
    // Signout Supabase session (cần cho OAuth user)
    await supabase.auth.signOut().catch(() => {});
    logout();
    navigate('/signin');
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-blue-100 transition">
          ZOLO Chat
        </Link>

        <div className="flex items-center space-x-4">
          {token ? (
            <>
              <Link to="/dashboard" className="hover:text-blue-100 transition">
                Dashboard
              </Link>
              <span className="text-sm text-blue-100">
                {user?.displayName || 'User'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition"
              >
                Đăng Xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="hover:text-blue-100 transition"
              >
                Đăng Nhập
              </Link>
              <Link
                to="/signup"
                className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition"
              >
                Đăng Ký
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
