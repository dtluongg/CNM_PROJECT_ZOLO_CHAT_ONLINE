import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!user) {
    return null;
  }

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setLoading(true);
    try {
      const payload = { oldPassword, newPassword };
      const res = await apiClient.post('/users/change-password', payload);
      const message = res.data?.message || 'Đổi mật khẩu thành công';
      setSuccessMessage(message);

      // Backend đã xoá refreshToken; frontend nên đăng xuất và yêu cầu login lại
      setTimeout(() => {
        logout();
        navigate('/signin', { state: { message } });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Hồ sơ cá nhân</h1>

        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold">
            {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{user.displayName || 'User'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.username && (
              <p className="text-sm text-gray-500">Username: {user.username}</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Đổi mật khẩu</h2>
          <p className="text-xs text-gray-500 mb-3">
            Chỉ áp dụng cho tài khoản đăng nhập local bằng username/password. Tài khoản đăng nhập qua Google/Facebook không thể đổi mật khẩu tại đây.
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập mật khẩu đang dùng"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Mật khẩu mới"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
