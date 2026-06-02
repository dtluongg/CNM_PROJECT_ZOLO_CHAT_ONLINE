import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import authApi from './api/authApi';
import { useLanguage } from '../../context/LanguageContext';

const CompleteProfile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

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
    if (!email) { setError(t('auth.enter_email_first')); return; }
    setOtpLoading(true);
    try {
      const res = await authApi.sendEmailOtp({ email });
      setOtpSent(true);
      setInfoMsg(res.data.message || t('auth.otp_sent_email'));
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.message || t('auth.send_otp_email_failed'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp) { setError(t('auth.otp_required')); return; }
    setLoading(true);
    try {
      const res = await authApi.completeOAuthProfile({
        supabaseId: oauthData.supabaseId,
        provider: oauthData.provider,
        email,
        emailOtp: otp,
        displayName: oauthData.displayName,
        avatar: oauthData.avatar,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || oauthData.accessToken;

      login(accessToken, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.complete_profile_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!oauthData?.supabaseId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          {oauthData.avatar && (
            <img src={oauthData.avatar} alt="avatar" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-gray-200" />
          )}
          <h1 className="text-2xl font-bold text-gray-800">{t('auth.complete_profile_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('auth.complete_profile_desc', { name: oauthData.displayName, provider: oauthData.provider })}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
        )}
        {infoMsg && !error && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">{infoMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('auth.email')}</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.email_placeholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || cooldown > 0 || !email}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
              >
                {otpLoading ? t('auth.sending') : cooldown > 0 ? t('auth.resend_otp', { count: cooldown }) : t('auth.send_otp')}
              </button>
            </div>
          </div>

          {otpSent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('auth.otp_label')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t('auth.otp_code_placeholder')}
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
            {loading ? t('common.processing') : t('auth.finish_registration_btn')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.other_account_link')}{' '}
          <button onClick={() => navigate('/signin')} className="text-blue-600 hover:underline font-semibold">
            {t('auth.back_to_signin')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default CompleteProfile;
