import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: nhập username, 2: nhập OTP + mật khẩu mới
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!username.trim()) {
      setError('Vui lòng nhập username hoặc email');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/users/forgot-password', { username: username.trim() });
      setInfoMessage(res.data?.message || 'Nếu tài khoản tồn tại, mã OTP đã được gửi tới email đăng ký');
      setStep(2);
    } catch (err) {
      // Backend luôn trả message chung, chỉ hiển thị ra cho user
      setError(err.response?.data?.message || 'Không thể gửi yêu cầu quên mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP');
      return;
    }

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        otp: otp.trim(),
        newPassword,
      };
      const res = await apiClient.post('/users/reset-password', payload);
      const message = res.data?.message || 'Đặt lại mật khẩu thành công';
      // Chuyển về trang đăng nhập kèm thông báo
      navigate('/signin', { state: { message } });
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Quên mật khẩu</h1>
        <p className="text-center text-sm text-gray-500 mb-4">
          Nhập username hoặc email để nhận mã OTP đặt lại mật khẩu.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {infoMessage && !error && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
            {infoMessage}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Username hoặc Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập username hoặc email đã đăng ký"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Đang gửi yêu cầu...' : 'Gửi mã OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Username hoặc Email</label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Mã OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập mã OTP 6 chữ số"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Đang đặt lại mật khẩu...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 mt-5 text-sm">
          Nhớ lại mật khẩu?{' '}
          <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-semibold">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
