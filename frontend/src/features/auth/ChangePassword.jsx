import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from './api/authApi';
import { useAuth } from '../../context/AuthContext';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLocalAccount = !user?.authProvider || user?.authProvider === 'local';
  const myId = user?._id || user?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!isLocalAccount) {
      setError('Tài khoản đăng nhập bằng Google/Facebook không thể đổi mật khẩu tại đây.');
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các trường.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword({
        oldPassword,
        newPassword,
      });

      const msg = res?.data?.message || 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.';
      setSuccessMessage(msg);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        logout();
        navigate('/signin', { state: { message: msg } });
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-start md:items-center justify-center px-4 py-8 md:py-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <p className="inline-flex items-center justify-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 mb-3">
            Bảo mật tài khoản
          </p>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Đổi mật khẩu</h1>
          <p className="text-sm text-gray-500">
            Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {successMessage}
          </div>
        )}

        {!isLocalAccount && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm">
            Tài khoản OAuth không hỗ trợ đổi mật khẩu trong ứng dụng.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={!isLocalAccount || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={!isLocalAccount || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Mật khẩu mới"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={!isLocalAccount || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isLocalAccount}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Đang đổi mật khẩu...' : 'Xác nhận đổi mật khẩu'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-5 text-sm">
          {myId ? (
            <Link to={`/user/${myId}`} className="text-blue-600 hover:text-blue-700 font-semibold">
              Quay lại hồ sơ cá nhân
            </Link>
          ) : (
            <Link to="/chat" className="text-blue-600 hover:text-blue-700 font-semibold">
              Quay lại ứng dụng
            </Link>
          )}
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;
