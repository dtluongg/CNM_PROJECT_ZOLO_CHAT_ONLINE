import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import authApi from './api/authApi';
import { useLanguage } from '../../context/LanguageContext';

const CALLBACK_URL = `${window.location.origin}/auth/callback`;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

const Signup = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

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
  const isPasswordValid = PASSWORD_POLICY_REGEX.test(formData.password);

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
        setError(oauthError.message || t('auth.oauth_failed', { provider }));
        setOauthLoading(null);
      }
    } catch {
      setError(t('auth.conn_failed', { provider }));
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
    if (!formData.email) { setError(t('auth.enter_email_first')); return; }
    setEmailOtpLoading(true);
    try {
      const res = await authApi.sendEmailOtp({ email: formData.email });
      setEmailOtpSent(true);
      setInfoMessage(res.data.message || t('auth.otp_sent_email'));
      startCooldown(setEmailCooldown);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.send_otp_email_failed'));
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setError('');
    if (!formData.phone) { setError(t('auth.enter_phone_first')); return; }
    const cleanPhone = formData.phone.replace(/[^\d+]/g, '');
    setPhoneOtpLoading(true);
    try {
      const res = await authApi.sendPhoneOtp({ phone: cleanPhone });
      setPhoneOtpSent(true);
      setInfoMessage(res.data.message || t('auth.otp_sent_phone'));
      startCooldown(setPhoneCooldown);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.send_otp_phone_failed'));
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.password || !confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }

    if (!isPasswordValid) {
      setError(t('auth.signup_policy_error'));
      return;
    }

    if (formData.password !== confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }

    const hasEmailOtp = emailOtpSent && emailOtp.trim().length > 0;
    const hasPhoneOtp = phoneOtpSent && phoneOtp.trim().length > 0;

    if (!hasEmailOtp && !hasPhoneOtp) {
      setError(t('auth.verify_at_least_one'));
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (hasEmailOtp) payload.emailOtp = emailOtp;
      if (hasPhoneOtp) payload.phoneOtp = phoneOtp;

      const response = await authApi.signup(payload);
      if (response.status === 201) {
        navigate('/signin', { state: { message: t('auth.signup_success') } });
      }
    } catch (err) {
      setError(err.response?.data?.message || t('auth.signup_failed_try_again'));
    } finally {
      setLoading(false);
    }
  };

  const atLeastOneOtpReady = (emailOtpSent && emailOtp) || (phoneOtpSent && phoneOtp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-start md:items-center justify-center px-4 py-8 md:py-10 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">{t('auth.signup_title')}</h1>

        <div className="space-y-3 mb-5">
          <button type="button" onClick={() => handleOAuth('google')} disabled={!!oauthLoading}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-60">
            {oauthLoading === 'google'
              ? <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <GoogleIcon />}
            {oauthLoading === 'google' ? t('auth.redirecting') : t('auth.google')}
          </button>
          <button type="button" onClick={() => handleOAuth('facebook')} disabled={!!oauthLoading}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-60">
            {oauthLoading === 'facebook'
              ? <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <FacebookIcon />}
            {oauthLoading === 'facebook' ? t('auth.redirecting') : t('auth.facebook')}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">{t('auth.or_signup_with')}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-500 mb-4">{t('auth.otp_verify_method')}</p>

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">{t('auth.first_name')}</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder={t('auth.first_name_placeholder')} />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">{t('auth.last_name')}</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder={t('auth.last_name_placeholder')} />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">{t('auth.username')}</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder={t('auth.username_placeholder')} />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">{t('auth.password')}</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder={t('auth.password_placeholder')} />
            <p className={`mt-1 text-xs ${formData.password && !isPasswordValid ? 'text-red-500' : 'text-gray-500'}`}>
              {t('auth.password_hint')}
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">{t('auth.confirm_password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t('auth.confirm_password_placeholder')}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">{t('auth.identity_verify')} <span className="text-red-500">*</span></p>
            <p className="text-xs text-gray-500">{t('auth.at_least_one_otp')}</p>

            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">{t('auth.verify_email')}</p>
              <div className="flex gap-2">
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder={t('auth.email_placeholder')} />
                <button type="button" onClick={handleSendEmailOtp}
                  disabled={emailOtpLoading || emailCooldown > 0 || !formData.email}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap">
                  {emailOtpLoading ? t('auth.sending') : emailCooldown > 0 ? t('auth.resend_otp', { count: emailCooldown }) : t('auth.send_otp')}
                </button>
              </div>
              {emailOtpSent && (
                <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder={t('auth.otp_placeholder')} maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="font-semibold text-gray-700 text-sm">{t('auth.verify_phone')}</p>
              <div className="flex gap-2">
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={t('auth.phone_placeholder')} />
                <button type="button" onClick={handleSendPhoneOtp}
                  disabled={phoneOtpLoading || phoneCooldown > 0 || !formData.phone}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap">
                  {phoneOtpLoading ? t('auth.sending') : phoneCooldown > 0 ? t('auth.resend_otp', { count: phoneCooldown }) : t('auth.send_otp')}
                </button>
              </div>
              {phoneOtpSent && (
                <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)}
                  placeholder={t('auth.otp_placeholder')} maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              )}
            </div>
          </div>

          <button type="submit" disabled={loading || !atLeastOneOtpReady || !isPasswordValid}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50">
            {loading ? t('auth.creating_account') : t('auth.signup_button')}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-4 text-sm">
          {t('auth.already_have_account')}{' '}
          <Link to="/signin" className="text-blue-500 hover:text-blue-600 font-semibold">{t('auth.signin_link')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
