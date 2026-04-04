import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../services/apiClient';
import { supabase } from '../../config/supabase';

const STATUSES = [
  { key: 'online', label: 'Online', color: '#3ba55c', emoji: '🟢' },
  { key: 'idle', label: 'Idle', color: '#faa61a', emoji: '🌙' },
  { key: 'dnd', label: 'Do Not Disturb', color: '#ed4245', emoji: '⛔' },
  { key: 'invisible', label: 'Invisible', color: '#80848e', emoji: '👻' },
];

const THEME_LABELS = {
  dark: { label: 'Dark', desc: 'Discord-like dark' },
  light: { label: 'Light', desc: 'Clean & bright' },
  midnight: { label: 'Midnight', desc: 'Deep black + pink' },
  ocean: { label: 'Ocean', desc: 'Deep sea blue' },
};

const COLOR_LABELS = {
  '--accent': 'Màu chính (Accent)',
  '--bubble-self': 'Bong bóng của tôi',
  '--bubble-other': 'Bong bóng người khác',
  '--bg-tertiary': 'Nền khu vực chat',
  '--bg-secondary': 'Nền sidebar',
  '--bg-primary': 'Nền ngoài cùng',
  '--input-bg': 'Nền ô nhập liệu',
};

const FieldLabel = ({ children }) => (
  <label style={{
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    display: 'block',
    marginBottom: 8,
  }}>
    {children}
  </label>
);

const TextInput = ({ value, onChange, placeholder, ...rest }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%',
      boxSizing: 'border-box',
      background: 'var(--bg-primary)',
      border: '1.5px solid var(--border)',
      borderRadius: 8,
      padding: '10px 12px',
      color: 'var(--text-primary)',
      fontSize: 14,
      outline: 'none',
      transition: 'border-color 0.15s',
      fontFamily: 'inherit',
    }}
    onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
    {...rest}
  />
);

export default function ProfileSettings({ onClose }) {
  const { user, updateUser } = useAuth();
  const { theme: themeName, presets, colors, setTheme, setCustomColor, resetTheme } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');
  const [copiedLink, setCopiedLink] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || 'online');
  const [statusText, setStatusText] = useState(user?.statusText || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [banner, setBanner] = useState(user?.banner || null);
  const [usernameColor, setUsernameColor] = useState(user?.usernameColor || '#5865f2');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [bannerColor, setBannerColor] = useState('#5865f2');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [avatarIsGif, setAvatarIsGif] = useState(() => (user?.avatar || '').toLowerCase().includes('.gif'));
  const [uploadError, setUploadError] = useState('');
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  const BUCKET = 'avatars';
  const MAX_FILE_SIZE = 5 * 1024 * 1024;      // 5MB (jpg/png/webp)
  const MAX_GIF_SIZE  = 8 * 1024 * 1024;      // 8MB (gif)

  const validateFile = (file, isGifFile = false) => {
    if (!file.type.startsWith('image/')) {
      return 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP...)';
    }
    const limit = isGifFile ? MAX_GIF_SIZE : MAX_FILE_SIZE;
    if (file.size > limit) {
      return `Kích thước tối đa: ${isGifFile ? '8MB (GIF)' : '5MB'}`;
    }
    return null;
  };

  const uploadToSupabase = async (file, folder) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const userId = user?._id || user?.id || 'user';
    const path = `${folder}/${userId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isGifFile = file.type === 'image/gif';
    const validationError = validateFile(file, isGifFile);
    if (validationError) {
      setUploadError(validationError);
      setTimeout(() => setUploadError(''), 4000);
      return;
    }

    setAvatarUploading(true);
    setUploadError('');
    try {
      const url = await uploadToSupabase(file, 'avatars');
      setAvatar(url);
      setAvatarIsGif(isGifFile);
    } catch (err) {
      console.error('[Avatar Upload]', err);
      setUploadError('Không thể upload ảnh đại diện. Kiểm tra cấu hình Supabase Storage.');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      setTimeout(() => setUploadError(''), 4000);
      return;
    }

    setBannerUploading(true);
    setUploadError('');
    try {
      const url = await uploadToSupabase(file, 'banners');
      setBanner(url);
    } catch (err) {
      console.error('[Banner Upload]', err);
      setUploadError('Không thể upload ảnh bìa. Kiểm tra cấu hình Supabase Storage.');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await apiClient.patch('/auth/update-profile', {
        displayName, bio, status, statusText, avatar, banner, usernameColor,
        themeName, themeColors: colors,
      });
      updateUser(res.data.user || { displayName, bio, status, statusText, avatar, banner, usernameColor });
      setSaveMsg('saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      // Graceful local save if API fails
      updateUser({ displayName, bio, status, statusText, avatar, banner, usernameColor });
      setSaveMsg('saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'profile', label: '👤', title: 'Hồ sơ' },
    { key: 'appearance', label: '🎨', title: 'Giao diện' },
    { key: 'status', label: '💬', title: 'Trạng thái' },
    { key: 'myqr', label: '📱', title: 'QR của tôi' },
  ];

  const myId = user?._id || user?.id;
  const profileLink = myId ? `${window.location.origin}/user/${myId}` : '';

  const handleCopyLink = () => {
    if (!profileLink) return;
    navigator.clipboard.writeText(profileLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const currentStatusInfo = STATUSES.find((s) => s.key === status) || STATUSES[0];
  const initials = (displayName || user?.displayName || 'U')[0].toUpperCase();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 14,
        width: 600,
        maxWidth: '96vw',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.2s ease',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 0',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              Cài đặt người dùng
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 20,
                padding: '4px 8px',
                borderRadius: 6,
                lineHeight: 1,
                transition: 'color 0.12s, background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              ✕
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: tab === t.key ? 'var(--bg-tertiary)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '8px 16px',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: tab === t.key ? 700 : 500,
                  fontSize: 13,
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.12s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => { if (tab !== t.key) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={(e) => { if (tab !== t.key) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <span>{t.label}</span>
                <span>{t.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--bg-hover) transparent',
        }}>

          {/* ── PROFILE TAB ── */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Upload Error Banner */}
              {uploadError && (
                <div style={{
                  background: 'rgba(237,66,69,0.15)',
                  border: '1px solid rgba(237,66,69,0.5)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#ed4245',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>⚠️</span>
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Banner / Cover */}
              <div>
                <FieldLabel>Ảnh bìa (Banner)</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => !bannerUploading && bannerRef.current?.click()}
                    style={{
                      height: 110,
                      borderRadius: 10,
                      cursor: bannerUploading ? 'wait' : 'pointer',
                      background: banner
                        ? `url(${banner}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${bannerColor}cc, ${bannerColor}55)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed var(--border)',
                      transition: 'opacity 0.15s',
                      overflow: 'hidden',
                      opacity: bannerUploading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!bannerUploading) e.currentTarget.style.opacity = '0.8'; }}
                    onMouseLeave={(e) => { if (!bannerUploading) e.currentTarget.style.opacity = '1'; }}
                  >
                    {bannerUploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          border: '3px solid rgba(255,255,255,0.3)',
                          borderTop: '3px solid #fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                          Đang upload...
                        </span>
                      </div>
                    ) : !banner ? (
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        + Thêm ảnh bìa
                      </span>
                    ) : null}
                  </div>
                  {!banner && !bannerUploading && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Màu bìa:</span>
                      <input
                        type="color"
                        value={bannerColor}
                        onChange={(e) => setBannerColor(e.target.value)}
                        style={{ width: 32, height: 26, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                      />
                    </div>
                  )}
                  {banner && !bannerUploading && (
                    <button
                      onClick={() => setBanner(null)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  onClick={() => !avatarUploading && avatarRef.current?.click()}
                  style={{ position: 'relative', cursor: avatarUploading ? 'wait' : 'pointer', flexShrink: 0 }}
                >
                  {avatar ? (
                    <>
                      <img
                        src={avatar}
                        alt="avatar"
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `3px solid ${avatarIsGif ? '#eb459e' : 'var(--accent)'}`,
                          display: 'block',
                          opacity: avatarUploading ? 0.5 : 1,
                        }}
                      />
                      {avatarIsGif && !avatarUploading && (
                        <div style={{
                          position: 'absolute', bottom: -2, left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#eb459e', color: '#fff',
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
                          padding: '1px 5px', borderRadius: 4,
                          border: '2px solid var(--bg-secondary)',
                          lineHeight: 1.4, userSelect: 'none',
                        }}>GIF</div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 30,
                      border: '3px solid var(--border)',
                      userSelect: 'none',
                      opacity: avatarUploading ? 0.5 : 1,
                    }}>
                      {initials}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: avatarUploading ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: avatarUploading ? 14 : 22,
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => { if (!avatarUploading) e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
                    onMouseLeave={(e) => { if (!avatarUploading) e.currentTarget.style.background = 'rgba(0,0,0,0)'; }}
                  >
                    {avatarUploading ? (
                      <div style={{
                        width: 22,
                        height: 22,
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid #fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : '✏️'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, color: usernameColor, marginBottom: 2 }}>
                    {displayName || 'Tên hiển thị'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {user?.email || user?.username}
                  </div>
                  <button
                    onClick={() => !avatarUploading && avatarRef.current?.click()}
                    disabled={avatarUploading}
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      cursor: avatarUploading ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      transition: 'background 0.12s',
                      opacity: avatarUploading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!avatarUploading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
                  >
                    {avatarUploading ? 'Đang upload...' : 'Đổi ảnh đại diện'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    JPG, PNG, WebP — tối đa 5MB<br />
                    <span style={{ color: '#eb459e', fontWeight: 600 }}>GIF động</span> — tối đa 8MB
                  </div>
                </div>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>

              {/* Display Name */}
              <div>
                <FieldLabel>Tên hiển thị</FieldLabel>
                <TextInput
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tên của bạn..."
                />
              </div>

              {/* Username color */}
              <div>
                <FieldLabel>Màu tên người dùng</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={usernameColor}
                    onChange={(e) => setUsernameColor(e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none', padding: 0 }}
                  />
                  <span style={{ color: usernameColor, fontWeight: 700, fontSize: 16 }}>
                    {displayName || 'Preview Tên'}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <FieldLabel>Giới thiệu bản thân</FieldLabel>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Kể về bản thân bạn... (emoji, sở thích, ...)"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--bg-primary)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>
            </div>
          )}

          {/* ── APPEARANCE TAB ── */}
          {tab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Theme presets */}
              <div>
                <FieldLabel>Chủ đề giao diện</FieldLabel>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                }}>
                  {Object.entries(presets).map(([name, cols]) => {
                    const isActive = themeName === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setTheme(name)}
                        style={{
                          background: cols['--bg-secondary'],
                          border: isActive
                            ? `2px solid ${cols['--accent']}`
                            : '2px solid transparent',
                          borderRadius: 10,
                          padding: 14,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'border-color 0.15s, transform 0.1s',
                          textAlign: 'left',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        {/* Preview colors dots */}
                        <div style={{ display: 'flex', gap: 5 }}>
                          {[cols['--accent'], cols['--bubble-self'], cols['--bg-tertiary'], cols['--bg-primary']].map((c, i) => (
                            <div key={i} style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: c,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                          ))}
                        </div>
                        {/* Preview layout bar */}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={{ width: 28, height: 40, borderRadius: 3, background: cols['--bg-primary'] }} />
                          <div style={{ flex: 1, height: 40, borderRadius: 3, background: cols['--bg-tertiary'], display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', justifyContent: 'center' }}>
                            <div style={{ height: 5, borderRadius: 3, background: cols['--bubble-other'], width: '60%' }} />
                            <div style={{ height: 5, borderRadius: 3, background: cols['--bubble-self'], width: '40%', alignSelf: 'flex-end' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cols['--text-primary'] }}>
                            {THEME_LABELS[name]?.label}
                          </span>
                          <span style={{ fontSize: 11, color: cols['--text-muted'] }}>
                            {THEME_LABELS[name]?.desc}
                          </span>
                        </div>
                        {isActive && (
                          <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: cols['--accent'],
                            color: '#fff',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom colors */}
              <div>
                <FieldLabel>Tùy chỉnh màu sắc</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(COLOR_LABELS).map(([key, label]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-primary)',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                      <input
                        type="color"
                        value={colors[key] || '#000000'}
                        onChange={(e) => setCustomColor(key, e.target.value)}
                        title={colors[key] || ''}
                        style={{
                          width: 32,
                          height: 32,
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          background: 'none',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset button */}
              <button
                onClick={resetTheme}
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                ↺ Đặt lại về Dark (mặc định)
              </button>
            </div>
          )}

          {/* ── STATUS TAB ── */}
          {tab === 'status' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Status selector */}
              <div>
                <FieldLabel>Trạng thái hoạt động</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setStatus(s.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: status === s.key ? 'var(--bg-hover)' : 'var(--bg-primary)',
                        border: status === s.key
                          ? `1.5px solid ${s.color}`
                          : '1.5px solid var(--border)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        if (status !== s.key) e.currentTarget.style.borderColor = s.color + '88';
                      }}
                      onMouseLeave={(e) => {
                        if (status !== s.key) e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{s.emoji}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: status === s.key ? s.color : 'var(--text-secondary)',
                        }}>
                          {s.label}
                        </div>
                      </div>
                      {status === s.key && (
                        <span style={{ marginLeft: 'auto', color: s.color, fontSize: 16 }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom status text */}
              <div>
                <FieldLabel>Trạng thái tùy chỉnh</FieldLabel>
                <TextInput
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="ví dụ: 🎮 Đang chơi game · 📚 Đang học"
                />
              </div>

              {/* Live preview */}
              <div>
                <FieldLabel>Xem trước</FieldLabel>
                <div style={{
                  background: 'var(--bg-primary)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="preview"
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 18,
                      }}>
                        {initials}
                      </div>
                    )}
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: currentStatusInfo.color,
                      border: '2px solid var(--bg-primary)',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: usernameColor }}>
                      {displayName || user?.displayName || 'Tên hiển thị'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {statusText || currentStatusInfo.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── My QR Tab ── */}
          {tab === 'myqr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '8px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Mã QR của tôi
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Chia sẻ mã này để người khác tìm thấy hồ sơ của bạn
                </div>
              </div>

              {/* QR Code box */}
              <div style={{
                background: '#fff',
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}>
                {profileLink ? (
                  <QRCodeSVG
                    value={profileLink}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#1a1a2e"
                    level="H"
                    imageSettings={user?.avatar ? {
                      src: user.avatar,
                      x: undefined,
                      y: undefined,
                      height: 44,
                      width: 44,
                      excavate: true,
                    } : undefined}
                  />
                ) : (
                  <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    Đang tải...
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', textAlign: 'center' }}>
                  {user?.displayName || 'Tên của bạn'}
                </div>
              </div>

              {/* Profile link row */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Link hồ sơ
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-primary)', borderRadius: 10,
                  padding: '10px 12px', border: '1.5px solid var(--border)',
                }}>
                  <span style={{
                    flex: 1, fontSize: 13, color: 'var(--text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}>
                    {profileLink || '...'}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    title="Sao chép link"
                    style={{
                      background: copiedLink ? 'rgba(59,165,92,0.15)' : 'var(--bg-hover)',
                      border: 'none', borderRadius: 7, cursor: 'pointer',
                      padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5,
                      color: copiedLink ? '#3ba55c' : 'var(--text-muted)',
                      fontWeight: 600, fontSize: 12, flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    {copiedLink ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              {/* View own profile button */}
              <button
                onClick={() => { onClose(); navigate(`/user/${myId}`); }}
                disabled={!myId}
                style={{
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 28px', cursor: myId ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 14, opacity: myId ? 1 : 0.5,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (myId) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                Xem hồ sơ của tôi
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}>
          {saveMsg === 'saved' && (
            <span style={{ fontSize: 13, color: '#3ba55c', fontWeight: 600 }}>
              ✓ Đã lưu thay đổi
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: 8,
              padding: '9px 20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 24px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 14,
              opacity: saving ? 0.75 : 1,
              transition: 'background 0.12s, opacity 0.12s',
              minWidth: 110,
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
