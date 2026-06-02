import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from './api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const ChangePassword = () => {
  const { t } = useLanguage();
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
      setError(t('auth.oauth_no_change_pass'));
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t('auth.fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwords_mismatch_change'));
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword({
        oldPassword,
        newPassword,
      });

      const msg = res?.data?.message || t('auth.change_pass_success');
      setSuccessMessage(msg);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        logout();
        navigate('/signin', { state: { message: msg } });
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.change_pass_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-start md:items-center justify-center px-4 py-8 md:py-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <p className="inline-flex items-center justify-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 mb-3">
            {t('auth.security_label')}
          </p>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('auth.change_password_title')}</h1>
          <p className="text-sm text-gray-500">
            {t('auth.change_password_desc')}
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
            {t('auth.oauth_no_support')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.current_password_label')}</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={!isLocalAccount || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              placeholder={t('auth.current_password_placeholder')}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">{t('auth.new_password_label')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={!isLocalAccount || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
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
              disabled={!isLocalAccount || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              placeholder={t('auth.confirm_new_password_placeholder')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isLocalAccount}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? t('auth.changing_pass') : t('auth.confirm_change_pass_btn')}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-5 text-sm">
          {myId ? (
            <Link to={`/user/${myId}`} className="text-blue-600 hover:text-blue-700 font-semibold">
              {t('auth.back_to_profile')}
            </Link>
          ) : (
            <Link to="/chat" className="text-blue-600 hover:text-blue-700 font-semibold">
              {t('auth.back_to_app')}
            </Link>
          )}
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;
