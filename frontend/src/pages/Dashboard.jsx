import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import apiClient from '../services/apiClient';

// ── Avatar Upload Form (hiện khi chưa có avatar) ─────────────────
const AvatarSetupBanner = ({ onSave, onSkip }) => {
  const [preview, setPreview] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh quá lớn, tối đa 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSave = async () => {
    if (!preview && !displayName.trim()) {
      setError('Vui lòng chọn ảnh hoặc nhập tên hiển thị');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {};
      if (preview) payload.avatar = preview;
      if (displayName.trim()) payload.displayName = displayName.trim();
      const res = await apiClient.patch('/auth/update-profile', payload);
      onSave(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
      <h2 className="text-lg font-bold text-blue-800 mb-1">Hoàn thiện hồ sơ của bạn</h2>
      <p className="text-sm text-blue-600 mb-5">Bạn chưa có ảnh đại diện và tên hiển thị. Cập nhật ngay để hoàn chỉnh tài khoản!</p>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 text-sm px-3 py-2 rounded mb-4">{error}</div>
      )}

      {/* Avatar preview */}
      <div className="flex items-center gap-5 mb-5">
        <div
          onClick={() => fileRef.current.click()}
          className="w-24 h-24 rounded-full border-2 border-blue-300 bg-white flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-500 transition"
        >
          {preview
            ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
            : <span className="text-4xl text-blue-200">+</span>
          }
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-2">Nhấn vào vòng tròn để chọn ảnh (JPG/PNG, tối đa 5MB)</p>
          <button type="button" onClick={() => fileRef.current.click()}
            className="text-sm text-blue-600 hover:underline">
            Chọn ảnh đại diện
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      {/* Display name */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nhập họ và tên của bạn"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 text-sm"
        >
          {loading ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
};

// ── Avatar Edit Modal ─────────────────────────────────────────────
const AvatarEditModal = ({ currentAvatar, currentName, onSave, onClose }) => {
  const [preview, setPreview] = useState(currentAvatar || null);
  const [displayName, setDisplayName] = useState(currentName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh quá lớn, tối đa 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {};
      if (preview !== currentAvatar) payload.avatar = preview;
      if (displayName.trim() !== currentName) payload.displayName = displayName.trim();
      if (Object.keys(payload).length === 0) { onClose(); return; }
      const res = await apiClient.patch('/auth/update-profile', payload);
      onSave(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Chỉnh sửa hồ sơ</h2>
        {error && <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

        <div className="flex flex-col items-center gap-4 mb-5">
          <div
            onClick={() => fileRef.current.click()}
            className="w-24 h-24 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-500 transition"
          >
            {preview
              ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-4xl text-gray-300">+</span>
            }
          </div>
          <button type="button" onClick={() => fileRef.current.click()} className="text-sm text-blue-600 hover:underline">
            Đổi ảnh
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 text-sm">
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition">
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, updateToken, updateUser, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSignout, setLoadingSignout] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/authme');
        setProfileData(res.data.user);
        updateUser(res.data.user);
      } catch (err) {
        if (err.response?.status === 401) {
          // Thử refresh token
          try {
            const refreshRes = await apiClient.post('/users/refreshme', {});
            if (refreshRes.data?.accessToken) {
              updateToken(refreshRes.data.accessToken);
              const retryRes = await apiClient.get('/auth/authme');
              setProfileData(retryRes.data.user);
              updateUser(retryRes.data.user);
            }
          } catch {
            logout();
            navigate('/signin');
          }
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileSaved = (updatedUser) => {
    setProfileData(updatedUser);
    updateUser(updatedUser);
    setBannerDismissed(true);
    setShowEditModal(false);
    setSuccessMsg('Cập nhật hồ sơ thành công!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSignout = async () => {
    setLoadingSignout(true);
    try {
      await apiClient.post('/users/signout', {});
    } catch { /* ignore */ }
    await supabase.auth.signOut().catch(() => {});
    logout();
    navigate('/signin');
    setLoadingSignout(false);
  };

  const currentUser = profileData || user;
  const hasAvatar = !!currentUser?.avatar;
  const showAvatarBanner = !hasAvatar && !bannerDismissed && !loadingProfile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4 md:p-8">
      {showEditModal && (
        <AvatarEditModal
          currentAvatar={currentUser?.avatar}
          currentName={currentUser?.displayName}
          onSave={handleProfileSaved}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Success message */}
        {successMsg && (
          <div className="bg-green-500 text-white px-4 py-3 rounded-xl text-sm font-medium">{successMsg}</div>
        )}

        {/* Avatar Banner — chỉ hiện khi chưa có avatar */}
        {showAvatarBanner && (
          <AvatarSetupBanner
            onSave={handleProfileSaved}
            onSkip={() => setBannerDismissed(true)}
          />
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {loadingProfile ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Header: avatar + tên */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                    {hasAvatar
                      ? <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                          <span className="text-white text-2xl font-bold">
                            {(currentUser?.displayName || currentUser?.username || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )
                    }
                  </div>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs transition shadow"
                    title="Chỉnh sửa ảnh"
                  >
                    ✏️
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentUser?.displayName || '(chưa có tên)'}</h2>
                  <p className="text-sm text-gray-500">{currentUser?.email}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    currentUser?.authProvider === 'google' ? 'bg-red-100 text-red-700' :
                    currentUser?.authProvider === 'facebook' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {currentUser?.authProvider === 'google' ? 'Google' :
                     currentUser?.authProvider === 'facebook' ? 'Facebook' : 'Tài khoản local'}
                  </span>
                </div>
              </div>

              {/* Thông tin chi tiết */}
              <div className="border rounded-xl overflow-hidden mb-5">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Username', currentUser?.username || '—'],
                      ['Họ tên', currentUser?.displayName || '—'],
                      ['Email', currentUser?.email],
                      ['Số điện thoại', currentUser?.phone || '—'],
                      ['Xác thực email', currentUser?.isEmailVerified ? '✅ Đã xác thực' : '❌ Chưa xác thực'],
                      ['Xác thực SĐT', currentUser?.isPhoneVerified ? '✅ Đã xác thực' : '❌ Chưa xác thực'],
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-gray-600 bg-gray-50 w-1/3">{label}</td>
                        <td className="px-4 py-2.5 text-gray-800">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition text-sm"
                >
                  Chỉnh sửa hồ sơ
                </button>
                <button
                  onClick={handleSignout}
                  disabled={loadingSignout}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50"
                >
                  {loadingSignout ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
