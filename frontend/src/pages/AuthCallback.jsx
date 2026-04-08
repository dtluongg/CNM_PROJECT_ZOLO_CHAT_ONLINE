import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleX } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

// Trang này nhận redirect từ Supabase sau khi đăng nhập Google/Facebook.
// Supabase gắn session vào URL hash (#access_token=...&refresh_token=...)
// hoặc qua PKCE code exchange tự động.
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Đang xác thực...');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase tự parse hash/code từ URL và thiết lập session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // Thử exchange code nếu dùng PKCE flow
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(window.location.href);

          if (exchangeError || !exchangeData?.session) {
            setError('Không thể lấy session từ Supabase. Vui lòng thử lại.');
            return;
          }

          await syncAndRedirect(exchangeData.session);
          return;
        }

        await syncAndRedirect(session);

      } catch (err) {
        console.error('AuthCallback error:', err);
        setError('Xảy ra lỗi trong quá trình xác thực.');
      }
    };

    // Sync user MongoDB và redirect
    const syncAndRedirect = async (session) => {
      setStatus('Đang đồng bộ tài khoản...');

      const { data: syncData, error: syncError } = await callSyncOAuth(session.access_token);

      if (syncError) {
        setError(syncError);
        return;
      }

      // Facebook không có email → chuyển sang trang hoàn tất đăng ký
      if (syncData.needsEmailVerification) {
        navigate('/complete-profile', {
          replace: true,
          state: {
            supabaseId: syncData.supabaseId,
            provider: syncData.provider,
            displayName: syncData.displayName,
            avatar: syncData.avatar,
            accessToken: session.access_token,
          },
        });
        return;
      }

      login(session.access_token, syncData.user);
      navigate('/chat', { replace: true });
    };

    handleCallback();
  }, []);

  const callSyncOAuth = async (accessToken) => {
    try {
      const res = await apiClient.post('/auth/sync-oauth', { access_token: accessToken });
      return { data: res.data, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || 'Đồng bộ tài khoản thất bại';
      return { data: null, error: msg };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        {!error ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">{status}</p>
          </>
        ) : (
          <>
            <CircleX className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-2">Xác thực thất bại</p>
            <p className="text-gray-500 text-sm mb-5">{error}</p>
            <button
              onClick={() => navigate('/signin')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
