import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../api/apiClient';

// Trang này hiện ra khi Facebook không trả về email.
// Người dùng phải nhập email + xác thực OTP để hoàn tất đăng ký.
const CompleteProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Nhận state từ AuthCallback: { supabaseId, provider, displayName, avatar, accessToken }
  const oauthData = location.state;

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    // Nếu không có oauthData → redirect về signin
    if (!oauthData?.supabaseId) {
      navigate('/signin', { replace: true });
    }
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    const iv = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    setError('');
    setInfoMsg('');
    if (!email) { setError('Vui lòng nhập email'); return; }
    setOtpLoading(true);
    try {
      const res = await apiClient.post('/auth/send-email-otp', { email });
      setOtpSent(true);
      setInfoMsg(res.data.message || 'OTP đã gửi về email');
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp) { setError('Vui lòng nhập mã OTP'); return; }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/complete-oauth-profile', {
        supabaseId: oauthData.supabaseId,
        provider: oauthData.provider,
        email,
        emailOtp: otp,
        displayName: oauthData.displayName,
        avatar: oauthData.avatar,
      });

      // Lấy Supabase session để dùng làm accessToken
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || oauthData.accessToken;

      login(accessToken, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Hoàn tất đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!oauthData?.supabaseId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          {oauthData.avatar && (
            <img src={oauthData.avatar} alt="avatar" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-gray-200" />
          )}
          <h1 className="text-2xl font-bold text-gray-800">Hoàn tất đăng ký</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xin chào <span className="font-semibold">{oauthData.displayName}</span>!
            Tài khoản Facebook chưa có email. Vui lòng xác thực email để tiếp tục.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
        )}
        {infoMsg && !error && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">{infoMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email + gửi OTP */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || cooldown > 0 || !email}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
              >
                {otpLoading ? 'Đang gửi...' : cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi OTP'}
              </button>
            </div>
          </div>

          {/* Nhập OTP */}
          {otpSent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mã OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã 6 chữ số"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !otpSent || !otp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Muốn dùng tài khoản khác?{' '}
          <button onClick={() => navigate('/signin')} className="text-blue-600 hover:underline font-semibold">
            Quay lại đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
};

export default CompleteProfile;
