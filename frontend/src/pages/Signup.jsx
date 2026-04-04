import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import apiClient from '../services/apiClient';

const CALLBACK_URL = `${window.location.origin}/auth/callback`;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const OtpSection = ({ label, target, type, onSend, cooldown, otpSent, otpValue, onOtpChange, loading }) => (
  <div className="rounded-lg border border-gray-200 p-4 space-y-3">
    <p className="font-semibold text-gray-700 text-sm">{label}</p>
    <div className="flex gap-2">
      <input
        type={type === 'email' ? 'email' : 'tel'}
        value={target}
        disabled
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={loading || cooldown > 0 || !target}
        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? 'Đang gửi...' : cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi OTP'}
      </button>
    </div>
    {otpSent && (
      <input
        type="text"
        value={otpValue}
        onChange={(e) => onOtpChange(e.target.value)}
        placeholder="Nhập mã OTP 6 chữ số"
        maxLength={6}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      />
    )}
    {otpSent && !otpValue && (
      <p className="text-xs text-amber-600">Vui lòng nhập mã OTP đã gửi</p>
    )}
  </div>
);

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone OTP state
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: CALLBACK_URL,
          scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
        },
      });
      if (oauthError) {
        setError(oauthError.message || `Đăng ký ${provider} thất bại`);
        setOauthLoading(null);
      }
    } catch {
      setError(`Không thể kết nối ${provider}. Vui lòng thử lại.`);
      setOauthLoading(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startCooldown = (setter) => {
    setter(60);
    const interval = setInterval(() => {
      setter((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendEmailOtp = async () => {
    setError('');
    if (!formData.email) { setError('Vui lòng nhập email trước'); return; }
    setEmailOtpLoading(true);
    try {
      const res = await apiClient.post('/auth/send-email-otp', { email: formData.email });
      setEmailOtpSent(true);
      setInfoMessage(res.data.message || 'OTP đã gửi về email');
      startCooldown(setEmailCooldown);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP email');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setError('');
    if (!formData.phone) { setError('Vui lòng nhập số điện thoại trước'); return; }
    // Chỉ giữ chữ số và dấu + trước khi gửi lên backend
    const cleanPhone = formData.phone.replace(/[^\d+]/g, '');
    setPhoneOtpLoading(true);
    try {
      const res = await apiClient.post('/auth/send-phone-otp', { phone: cleanPhone });
      setPhoneOtpSent(true);
      setInfoMessage(res.data.message || 'OTP đã gửi về điện thoại');
      startCooldown(setPhoneCooldown);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP điện thoại');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const hasEmailOtp = emailOtpSent && emailOtp.trim().length > 0;
    const hasPhoneOtp = phoneOtpSent && phoneOtp.trim().length > 0;

    if (!hasEmailOtp && !hasPhoneOtp) {
      setError('Cần xác thực ít nhất một phương thức: gửi OTP qua email hoặc số điện thoại');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (hasEmailOtp) payload.emailOtp = emailOtp;
      if (hasPhoneOtp) payload.phoneOtp = phoneOtp;

      const response = await apiClient.post('/users/signup', payload);
      if (response.status === 201) {
        navigate('/signin', { state: { message: 'Đăng ký thành công! Vui lòng đăng nhập.' } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const atLeastOneOtpReady = (emailOtpSent && emailOtp) || (phoneOtpSent && phoneOtp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Đăng Ký</h1>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-5">
          <button type="button" onClick={() => handleOAuth('google')} disabled={!!oauthLoading}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-60">
            {oauthLoading === 'google'
              ? <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <GoogleIcon />}
            {oauthLoading === 'google' ? 'Đang chuyển hướng...' : 'Đăng ký với Google'}
          </button>
          <button type="button" onClick={() => handleOAuth('facebook')} disabled={!!oauthLoading}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-60">
            {oauthLoading === 'facebook'
              ? <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <FacebookIcon />}
            {oauthLoading === 'facebook' ? 'Đang chuyển hướng...' : 'Đăng ký với Facebook'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">hoặc đăng ký bằng tài khoản</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-500 mb-4">Xác thực qua email hoặc số điện thoại (1 trong 2)</p>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">First name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="VD: John" />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Last name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="VD: Doe" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">Username</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Tên đăng nhập" />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">Mật khẩu</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Tối thiểu 6 ký tự" />
          </div>

          {/* OTP Section */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Xác thực danh tính <span className="text-red-500">*</span></p>
            <p className="text-xs text-gray-500">Cần xác thực ít nhất 1 trong 2 phương thức bên dưới</p>

            {/* Email OTP */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">Xác thực qua Email</p>
              <div className="flex gap-2">
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="your@email.com" />
                <button type="button" onClick={handleSendEmailOtp}
                  disabled={emailOtpLoading || emailCooldown > 0 || !formData.email}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap">
                  {emailOtpLoading ? 'Đang gửi...' : emailCooldown > 0 ? `Gửi lại (${emailCooldown}s)` : 'Gửi OTP'}
                </button>
              </div>
              {emailOtpSent && (
                <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="Nhập mã OTP 6 chữ số" maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              )}
            </div>

            {/* Phone OTP */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">Xác thực qua Số điện thoại</p>
              <div className="flex gap-2">
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0912345678 (10 chữ số)" />
                <button type="button" onClick={handleSendPhoneOtp}
                  disabled={phoneOtpLoading || phoneCooldown > 0 || !formData.phone}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap">
                  {phoneOtpLoading ? 'Đang gửi...' : phoneCooldown > 0 ? `Gửi lại (${phoneCooldown}s)` : 'Gửi OTP'}
                </button>
              </div>
              {phoneOtpSent && (
                <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)}
                  placeholder="Nhập mã OTP 6 chữ số" maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              )}
            </div>
          </div>

          <button type="submit" disabled={loading || !atLeastOneOtpReady}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50">
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-4 text-sm">
          Đã có tài khoản?{' '}
          <Link to="/signin" className="text-blue-500 hover:text-blue-600 font-semibold">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
