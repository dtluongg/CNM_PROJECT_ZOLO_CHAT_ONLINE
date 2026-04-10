import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import authApi from './api/authApi';

const CALLBACK_URL = `${window.location.origin}/auth/callback`;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const SIGNIN_LOCK_STORAGE_KEY = 'signin_lock_state';

const formatRemainingTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isWrongPasswordMessage = (message = '') => {
  const normalized = message.toLowerCase();
  return normalized.includes('mật khẩu không chính xác') || normalized.includes('mat khau khong chinh xac');
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.9 2.8 14.7 2 12 2 6.9 2 2.8 6.5 2.8 12s4.1 10 9.2 10c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12z"
    />
    <path fill="#34A853" d="M3.9 7.3l3.2 2.3C7.9 8 9.8 6.6 12 6.6c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.9 2.8 14.7 2 12 2 8.2 2 4.9 4.2 3.9 7.3z" />
    <path fill="#FBBC05" d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3.1-2.5c-.9.6-2.1 1-3.5 1-3.9 0-5.3-2.6-5.6-3.9l-3.1 2.4C4.9 19.7 8.2 22 12 22z" />
    <path fill="#4285F4" d="M20.8 13.1c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.1-1 2-2 2.6l3.1 2.5c1.8-1.7 2.9-4.2 2.9-7.4z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#1877F2" />
    <path
      fill="#FFFFFF"
      d="M13.8 8.1h1.8V5h-2.1c-2.6 0-4.2 1.6-4.2 4.3v1.9H7v3h2.3V19h3.1v-4.8h2.5l.4-3h-2.9V9.7c0-.9.3-1.6 1.4-1.6z"
    />
  </svg>
);

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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const isLocked = lockUntil && lockUntil > Date.now();

  useEffect(() => {
    if (location.state?.message) setSuccessMessage(location.state.message);
  }, [location]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIGNIN_LOCK_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const savedAttempts = Number(parsed?.failedAttempts || 0);
      const savedLockUntil = Number(parsed?.lockUntil || 0);

      if (savedAttempts > 0) setFailedAttempts(savedAttempts);
      if (savedLockUntil > Date.now()) {
        setLockUntil(savedLockUntil);
        setRemainingSeconds(Math.ceil((savedLockUntil - Date.now()) / 1000));
      } else if (savedAttempts > 0) {
        localStorage.removeItem(SIGNIN_LOCK_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(SIGNIN_LOCK_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!lockUntil) return undefined;

    const tick = () => {
      const diffMs = lockUntil - Date.now();
      if (diffMs <= 0) {
        setLockUntil(null);
        setFailedAttempts(0);
        setRemainingSeconds(0);
        localStorage.removeItem(SIGNIN_LOCK_STORAGE_KEY);
        return;
      }
      setRemainingSeconds(Math.ceil(diffMs / 1000));
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [lockUntil]);

  useEffect(() => {
    if (failedAttempts <= 0 && !lockUntil) {
      localStorage.removeItem(SIGNIN_LOCK_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      SIGNIN_LOCK_STORAGE_KEY,
      JSON.stringify({
        failedAttempts,
        lockUntil,
      }),
    );
  }, [failedAttempts, lockUntil]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError(`Bạn đã nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${formatRemainingTime(remainingSeconds)}.`);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.signin(formData);
      if (response.status === 200) {
        const { accessToken, user } = response.data;
        setFailedAttempts(0);
        setLockUntil(null);
        setRemainingSeconds(0);
        localStorage.removeItem(SIGNIN_LOCK_STORAGE_KEY);
        login(accessToken, user);
        navigate('/dashboard');
      }
    } catch (err) {
      const backendMessage = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';

      if (isWrongPasswordMessage(backendMessage)) {
        const nextAttempts = failedAttempts + 1;

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const nextLockUntil = Date.now() + LOCK_DURATION_MS;
          setFailedAttempts(nextAttempts);
          setLockUntil(nextLockUntil);
          setRemainingSeconds(Math.ceil(LOCK_DURATION_MS / 1000));
          setError(`Bạn đã nhập sai mật khẩu ${MAX_FAILED_ATTEMPTS} lần. Tài khoản tạm khóa trong 5 phút.`);
        } else {
          const attemptsLeft = MAX_FAILED_ATTEMPTS - nextAttempts;
          setFailedAttempts(nextAttempts);
          setError(`${backendMessage}. Bạn còn ${attemptsLeft} lần thử.`);
        }
      } else {
        setError(backendMessage);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-start md:items-center justify-center px-4 py-8 md:py-10 overflow-y-auto">
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

        {isLocked && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 text-sm">
            Tạm thời khóa đăng nhập bằng mật khẩu. Thử lại sau {formatRemainingTime(remainingSeconds)}.
          </div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3 mb-5">
          <OAuthButton provider="google" label="Tiếp tục với Google" icon={<GoogleIcon />} onClick={handleOAuth} loading={oauthLoading} />
          <OAuthButton provider="facebook" label="Tiếp tục với Facebook" icon={<FacebookIcon />} onClick={handleOAuth} loading={oauthLoading} />
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
              disabled={isLocked}
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
              disabled={isLocked}
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
            disabled={loading || isLocked}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : isLocked ? `Thử lại sau ${formatRemainingTime(remainingSeconds)}` : 'Đăng Nhập'}
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
