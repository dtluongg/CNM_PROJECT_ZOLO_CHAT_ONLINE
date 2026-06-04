import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, MessageCircle } from 'lucide-react';
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
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

export default function UserProfileModal({ userId, onClose, onStartChat }) {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [tab, setTab]           = useState('info');
  const { isUserOnline, getPresenceStatus } = usePresence();

  const profileLink = `${window.location.origin}/user/${userId}`;

  useEffect(() => {
    if (!userId) return;
    setLoading(true); setError('');
    apiClient.get(`/users/${userId}/profile`)
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

  const isOnline    = isUserOnline(userId);
  const presStatus  = getPresenceStatus(userId);
  const displayStatus = presStatus || profile?.status || 'offline';
  const statusInfo  = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.offline;
  const accentColor = profile?.usernameColor || getAvatarColor(profile?.displayName);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, backdropFilter: 'blur(6px)',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 18,
        width: 400, maxWidth: '96vw',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
          width: 30, height: 30, cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={15} />
        </button>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, border: '3px solid var(--border)',
              borderTopColor: accentColor, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            Đang tải...
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#ed4245', flexShrink: 0 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            {error}
          </div>
        ) : profile && (
          /* Scrollable content */
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Banner */}
            <div style={{
              height: 100, flexShrink: 0,
              background: profile.banner
                ? `url(${profile.banner}) center/cover no-repeat`
                : `linear-gradient(135deg, ${accentColor}cc 0%, ${accentColor}44 100%)`,
              position: 'relative',
            }} />

            {/* Avatar row */}
            <div style={{ padding: '0 20px', marginTop: -44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative' }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.displayName}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-secondary)', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: accentColor, border: '4px solid var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 30,
                  }}>
                    {getInitials(profile.displayName)}
                  </div>
                )}
                <span style={{
                  position: 'absolute', bottom: 5, right: 5,
                  width: 16, height: 16, borderRadius: '50%',
                  background: statusInfo.color, border: '3px solid var(--bg-secondary)',
                }} />
              </div>
              {onStartChat && (
                <button
                  onClick={() => { onStartChat(profile); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, marginBottom: 6,
                    boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.35)',
                  }}
                >
                  <MessageCircle size={15} />
                  Nhắn tin
                </button>
              )}
            </div>

            {/* Name + status */}
            <div style={{ padding: '10px 20px 0' }}>
              <div style={{ fontWeight: 800, fontSize: 21, color: profile.usernameColor || 'var(--text-primary)', lineHeight: 1.2 }}>
                {profile.displayName}
              </div>
              {profile.username && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{profile.username}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
              </div>
              {profile.statusText && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 3 }}>
                  "{profile.statusText}"
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, margin: '14px 20px 0', background: 'var(--bg-primary)', borderRadius: 10, padding: 3 }}>
              {[{ key: 'info', label: 'Thông tin' }, { key: 'qr', label: 'QR / Link' }].map(tb => (
                <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                  flex: 1, background: tab === tb.key ? 'var(--bg-secondary)' : 'none',
                  border: 'none', cursor: 'pointer', padding: '7px 4px', borderRadius: 8,
                  color: tab === tb.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: tab === tb.key ? 700 : 500, fontSize: 13, transition: 'all 0.12s',
                  boxShadow: tab === tb.key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                }}>
                  {tb.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '14px 20px 24px' }}>
              {tab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Bio */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Giới thiệu
                    </div>
                    <div style={{
                      fontSize: 13, lineHeight: 1.65,
                      color: profile.bio ? 'var(--text-secondary)' : 'var(--text-muted)',
                      background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px',
                      fontStyle: profile.bio ? 'normal' : 'italic',
                      border: '1px solid var(--border)',
                    }}>
                      {profile.bio || 'Chưa có giới thiệu.'}
                    </div>
                  </div>

                  {/* Join date */}
                  {profile.createdAt && (
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
                      padding: '8px', background: 'var(--bg-tertiary)', borderRadius: 8,
                    }}>
                      Tham gia từ {new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: '#fff', padding: 16, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <QRCodeSVG value={profileLink} size={180} fgColor="#1a1a2e" bgColor="#ffffff" level="M"
                      imageSettings={{ src: profile.avatar || '', height: 36, width: 36, excavate: true }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Quét mã để xem hồ sơ của <strong style={{ color: profile.usernameColor || 'var(--text-primary)' }}>{profile.displayName}</strong>
                  </p>
                  <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profileLink}
                    </span>
                    <button onClick={handleCopyLink} style={{
                      background: copied ? '#3ba55c' : 'var(--bg-hover)', border: 'none', borderRadius: 6,
                      padding: '4px 10px', cursor: 'pointer', color: copied ? '#fff' : 'var(--text-secondary)',
                      fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', flexShrink: 0,
                    }}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}