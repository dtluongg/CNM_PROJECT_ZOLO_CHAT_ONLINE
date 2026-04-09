import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, MessageCircle } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { usePresence } from '../../../context/PresenceContext';

const STATUS_CONFIG = {
  online:    { color: '#3ba55c', label: 'Đang hoạt động' },
  idle:      { color: '#faa61a', label: 'Vắng mặt' },
  dnd:       { color: '#ed4245', label: 'Không làm phiền' },
  invisible: { color: '#80848e', label: 'Ẩn' },
  offline:   { color: '#80848e', label: 'Offline' },
};

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

export default function UserProfileModal({ userId, onClose, onStartChat }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('info'); // 'info' | 'qr'
  const { isUserOnline, getPresenceStatus } = usePresence();

  const profileLink = `${window.location.origin}/user/${userId}`;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    apiClient.get(`/auth/users/${userId}/profile`)
      .then(res => setProfile(res.data.user))
      .catch(() => setError('Không thể tải thông tin người dùng.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Merge presence với DB status
  const isOnline = isUserOnline(userId);
  const presStatus = getPresenceStatus(userId);
  const displayStatus = presStatus || profile?.status || 'offline';
  const statusInfo = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.offline;
  const accentColor = profile?.usernameColor || getAvatarColor(profile?.displayName);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, backdropFilter: 'blur(3px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 16,
        width: 380,
        maxWidth: '94vw',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.2s ease',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
            width: 30, height: 30, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: 32, height: 32, border: '3px solid var(--border)',
              borderTop: `3px solid ${accentColor}`, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            Đang tải...
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#ed4245' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            {error}
          </div>
        ) : profile && (
          <>
            {/* Banner */}
            <div style={{
              height: 90,
              background: profile.banner
                ? `url(${profile.banner}) center/cover no-repeat`
                : `linear-gradient(135deg, ${accentColor}dd, ${accentColor}55)`,
              position: 'relative',
            }} />

            {/* Avatar */}
            <div style={{ padding: '0 20px 0', marginTop: -38 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.displayName}
                    style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-secondary)', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 76, height: 76, borderRadius: '50%',
                    background: accentColor, border: '4px solid var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 28, userSelect: 'none',
                  }}>
                    {getInitials(profile.displayName)}
                  </div>
                )}
                <span style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: statusInfo.color, border: '3px solid var(--bg-secondary)',
                }} />
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 20px 0' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: profile.usernameColor || 'var(--text-primary)' }}>
                {profile.displayName}
              </div>
              {profile.username && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 1 }}>@{profile.username}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
              </div>
              {profile.statusText && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                  {profile.statusText}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, margin: '14px 20px 0', background: 'var(--bg-primary)', borderRadius: 8, padding: 3 }}>
              {[{ key: 'info', label: 'Thông tin' }, { key: 'qr', label: 'QR / Link' }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, background: tab === t.key ? 'var(--bg-secondary)' : 'none',
                  border: 'none', cursor: 'pointer', padding: '6px 4px', borderRadius: 6,
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: tab === t.key ? 700 : 500, fontSize: 13, transition: 'all 0.12s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '14px 20px 20px' }}>
              {tab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Bio */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      Giới thiệu
                    </div>
                    <p style={{
                      margin: 0, fontSize: 13, lineHeight: 1.6,
                      color: profile.bio ? 'var(--text-secondary)' : 'var(--text-muted)',
                      background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px',
                      fontStyle: profile.bio ? 'normal' : 'italic',
                    }}>
                      {profile.bio || 'Chưa có giới thiệu.'}
                    </p>
                  </div>

                  {/* Member since */}
                  {profile.createdAt && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Tham gia từ {new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                    </div>
                  )}

                  {/* Actions */}
                  {onStartChat && (
                    <button
                      onClick={() => { onStartChat(profile); onClose(); }}
                      style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '10px 0', cursor: 'pointer',
                        fontWeight: 700, fontSize: 14, width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
                    >
                      <MessageCircle size={16} />
                      Nhắn tin
                    </button>
                  )}
                </div>
              )}

              {tab === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  {/* QR Code */}
                  <div style={{
                    background: '#fff', padding: 16, borderRadius: 12,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  }}>
                    <QRCodeSVG
                      value={profileLink}
                      size={180}
                      fgColor="#1a1a2e"
                      bgColor="#ffffff"
                      level="M"
                      imageSettings={{
                        src: profile.avatar || '',
                        height: 36,
                        width: 36,
                        excavate: true,
                      }}
                    />
                  </div>

                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Quét mã để xem hồ sơ của <strong style={{ color: profile.usernameColor || 'var(--text-primary)' }}>{profile.displayName}</strong>
                  </p>

                  {/* Link */}
                  <div style={{
                    width: '100%', background: 'var(--bg-tertiary)', borderRadius: 8,
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      flex: 1, fontSize: 12, color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {profileLink}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      title="Sao chép link"
                      style={{
                        background: copied ? '#3ba55c' : 'var(--bg-hover)',
                        border: 'none', borderRadius: 6, padding: '4px 8px',
                        cursor: 'pointer', color: copied ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.2s', flexShrink: 0,
                      }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
