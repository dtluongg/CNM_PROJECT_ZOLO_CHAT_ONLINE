import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from './api/authApi';
import { useLanguage } from '../../context/LanguageContext';

const ForgotPassword = () => {
  const { t } = useLanguage();
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
      setError(t('auth.enter_username_email'));
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ username: username.trim() });
      setInfoMessage(res.data?.message || t('auth.otp_sent_info'));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.forgot_password_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!otp.trim()) {
      setError(t('auth.enter_otp'));
      return;
    }

    if (!newPassword) {
      setError(t('auth.enter_new_password'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        otp: otp.trim(),
        newPassword,
      };
      const res = await authApi.resetPassword(payload);
      const message = res.data?.message || t('auth.reset_password_success');
      navigate('/signin', { state: { message } });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.reset_password_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t('auth.forgot_password_title')}</h1>
        <p className="text-center text-sm text-gray-500 mb-4">
          {t('auth.forgot_password_desc')}
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
              <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.username_or_email')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={t('auth.forgot_password_input_placeholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? t('auth.sending_request') : t('auth.send_otp_btn')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.username_or_email')}</label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.otp_label')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={t('auth.otp_placeholder')}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.new_password_label')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={t('auth.new_password_placeholder')}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.confirm_new_password_label')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={t('auth.confirm_new_password_placeholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? t('auth.resetting_password') : t('auth.reset_password_btn')}
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 mt-5 text-sm">
          {t('auth.remember_password')}{' '}
          <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-semibold">{t('auth.back_to_signin')}</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
