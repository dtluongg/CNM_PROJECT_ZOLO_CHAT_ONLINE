import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Chrome, Facebook } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../services/apiClient';

const CALLBACK_URL = `${window.location.origin}/auth/callback`;

const OAuthButton = ({ provider, label, icon, onClick, loading }) => (
  <button
    type="button"
    onClick={() => onClick(provider)}
    disabled={loading === provider}
    className="flex items-center justify-center gap-3 w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-60"
  >
    {loading === provider
      ? <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      : icon}
    {loading === provider ? 'Đang chuyển hướng...' : label}
  </button>
);

const Signin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'facebook' | null

  useEffect(() => {
    if (location.state?.message) setSuccessMessage(location.state.message);
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/users/signin', formData);
      if (response.status === 200) {
        const { accessToken, user } = response.data;
        login(accessToken, user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: CALLBACK_URL,
          // Facebook cần scope 'email' để trả về email người dùng
          scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
        },
      });
      if (oauthError) {
        setError(oauthError.message || `Đăng nhập ${provider} thất bại`);
        setOauthLoading(null);
      }
      // Nếu thành công, trình duyệt sẽ redirect → không cần xử lý thêm
    } catch (err) {
      setError(`Không thể kết nối ${provider}. Vui lòng thử lại.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Đăng Nhập</h1>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3 mb-5">
          <OAuthButton provider="google" label="Tiếp tục với Google" icon={<Chrome className="w-5 h-5" />} onClick={handleOAuth} loading={oauthLoading} />
          <OAuthButton provider="facebook" label="Tiếp tục với Facebook" icon={<Facebook className="w-5 h-5" />} onClick={handleOAuth} loading={oauthLoading} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">hoặc đăng nhập bằng tài khoản</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Local form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Username hoặc Email</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Tên đăng nhập hoặc email"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Mật khẩu</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Mật khẩu"
            />
          </div>
          <div className="flex justify-end -mt-2 mb-1">
            <Link
              to="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-5 text-sm">
          Chưa có tài khoản?{' '}
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default Signin;
