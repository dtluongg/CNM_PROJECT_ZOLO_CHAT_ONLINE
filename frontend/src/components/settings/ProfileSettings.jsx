import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../services/apiClient';

const STATUSES = [
  { key: 'online', label: 'Online', color: '#3ba55c', emoji: '🟢' },
  { key: 'idle', label: 'Idle', color: '#faa61a', emoji: '🌙' },
  { key: 'dnd', label: 'Do Not Disturb', color: '#ed4245', emoji: '⛔' },
  { key: 'offline', label: 'Invisible', color: '#80848e', emoji: '👻' },
];

const THEME_NAMES = { dark: 'Dark', light: 'Light', midnight: 'Midnight', ocean: 'Ocean' };

const COLOR_LABELS = {
  '--accent': 'Màu chính (Accent)',
  '--bubble-self': 'Bong bóng của tôi',
  '--bg-tertiary': 'Nền chat',
  '--bg-secondary': 'Nền sidebar',
  '--bg-primary': 'Nền ngoài cùng',
};

export default function ProfileSettings({ onClose }) {
  const { user, updateUser } = useAuth();
  const { theme: themeName, presets, colors, setTheme, setCustomColor, resetTheme } = useTheme();

  const [tab, setTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || 'online');
  const [statusText, setStatusText] = useState(user?.statusText || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [banner, setBanner] = useState(user?.banner || null);
  const [usernameColor, setUsernameColor] = useState(user?.usernameColor || '#5865f2');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef();
  const bannerRef = useRef();

  const toBase64 = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await toBase64(file);
    setAvatar(b64);
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await toBase64(file);
    setBanner(b64);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.patch('/auth/update-profile', {
        displayName, bio, status, statusText, avatar, banner, usernameColor,
      });
      updateUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'profile', label: '👤 Hồ sơ' },
    { key: 'appearance', label: '🎨 Giao diện' },
    { key: 'status', label: '💬 Trạng thái' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12,
        width: 580, maxWidth: '95vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Cài đặt</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: tab === t.key ? 'var(--bg-tertiary)' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '8px 14px', borderRadius: '6px 6px 0 0',
                  fontWeight: tab === t.key ? 700 : 500, fontSize: 13,
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── PROFILE TAB ── */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Banner */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Ảnh bìa</label>
                <div
                  onClick={() => bannerRef.current?.click()}
                  style={{
                    height: 100, borderRadius: 8, cursor: 'pointer',
                    background: banner ? `url(${banner}) center/cover` : 'var(--accent)',
                    opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px dashed var(--border)',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.opacity = 1}
                  onMouseLeave={e => e.target.style.opacity = 0.8}
                >
                  {!banner && <span style={{ color: '#fff', fontWeight: 700 }}>+ Thêm ảnh bìa</span>}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
              </div>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div onClick={() => avatarRef.current?.click()} style={{ position: 'relative', cursor: 'pointer' }}>
                  {avatar ? (
                    <img src={avatar} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28, border: '3px solid var(--border)' }}>
                      {(user?.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', color: '#fff', fontSize: 20 }}
                    onMouseEnter={e => e.target.style.opacity = 1}
                    onMouseLeave={e => e.target.style.opacity = 0}
                  >✏️</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: usernameColor }}>{displayName || 'Tên hiển thị'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                  <button onClick={() => avatarRef.current?.click()} style={{ marginTop: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Đổi ảnh</button>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>

              {/* Display name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Tên hiển thị</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
              </div>

              {/* Username color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Màu tên</label>
                  <input type="color" value={usernameColor} onChange={e => setUsernameColor(e.target.value)}
                    style={{ width: 48, height: 36, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }} />
                </div>
                <span style={{ color: usernameColor, fontWeight: 700, fontSize: 16, marginTop: 20 }}>{displayName || 'Preview'}</span>
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Giới thiệu</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Giới thiệu bản thân..."
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
          )}

          {/* ── APPEARANCE TAB ── */}
          {tab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>Chủ đề</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {Object.entries(presets).map(([name, cols]) => (
                    <button
                      key={name}
                      onClick={() => setTheme(name)}
                      style={{
                        background: cols['--bg-secondary'],
                        border: themeName === name ? `2px solid ${cols['--accent']}` : '2px solid transparent',
                        borderRadius: 8, padding: 12, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 6,
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[cols['--accent'], cols['--bubble-self'], cols['--bg-tertiary']].map((c, i) => (
                          <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <div style={{ width: 40, height: 6, borderRadius: 3, background: cols['--bg-primary'] }} />
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: cols['--bg-tertiary'] }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cols['--text-primary'] }}>{THEME_NAMES[name]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>Tùy chỉnh màu</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(COLOR_LABELS).map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', borderRadius: 6, padding: '10px 12px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{colors[key]}</span>
                        <input type="color" value={colors[key] || '#000000'} onChange={e => setCustomColor(key, e.target.value)}
                          style={{ width: 32, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={resetTheme} style={{
                background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                border: 'none', borderRadius: 6, padding: '10px 16px',
                cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}>↺ Đặt lại mặc định (Dark)</button>
            </div>
          )}

          {/* ── STATUS TAB ── */}
          {tab === 'status' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 10 }}>Trạng thái hoạt động</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {STATUSES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setStatus(s.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: status === s.key ? 'var(--bg-hover)' : 'var(--bg-primary)',
                        border: status === s.key ? `1px solid ${s.color}` : '1px solid var(--border)',
                        borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{s.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: status === s.key ? s.color : 'var(--text-secondary)' }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Trạng thái tùy chỉnh</label>
                <input value={statusText} onChange={e => setStatusText(e.target.value)}
                  placeholder="Nhập trạng thái... (ví dụ: 🎮 Đang chơi game)"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
              </div>
              {/* Preview */}
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
                    {(user?.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: STATUSES.find(s => s.key === status)?.color, border: '3px solid var(--bg-primary)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: usernameColor }}>{displayName || user?.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{statusText || STATUSES.find(s => s.key === status)?.label}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}>
          <button onClick={onClose} style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '10px 24px', cursor: 'pointer',
            fontWeight: 700, opacity: saving ? 0.7 : 1, minWidth: 100,
          }}>
            {saved ? '✓ Đã lưu' : saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
