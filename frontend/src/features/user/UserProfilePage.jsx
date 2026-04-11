import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Check, MessageCircle, Mail, AtSign, Calendar, UserPlus, Phone, ExternalLink, Shield } from 'lucide-react';
import userApi from './api/userApi';
import friendApi from '../friends/api/friendApi';
import conversationApi from '../chat/api/conversationApi';
import { usePresence } from '../../context/PresenceContext';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  online:  { color: '#3ba55c', label: 'Đang hoạt động', bg: 'rgba(59,165,92,0.12)' },
  idle:    { color: '#faa61a', label: 'Vắng mặt',       bg: 'rgba(250,166,26,0.12)' },
  dnd:     { color: '#ed4245', label: 'Không làm phiền', bg: 'rgba(237,66,69,0.12)' },
  offline: { color: '#80848e', label: 'Offline',         bg: 'rgba(128,132,142,0.12)' },
};

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

function InfoRow({ icon, label, value, mono = false }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--bg-tertiary)', borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{
          fontSize: 14, color: 'var(--text-primary)', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: mono ? 'monospace' : 'inherit',
        }}>
          {value}
        </div>
      </div>
      <button
        onClick={handleCopy}
        title="Sao chép"
        style={{
          background: copied ? 'rgba(59,165,92,0.15)' : 'none', border: 'none',
          cursor: 'pointer', color: copied ? '#3ba55c' : 'var(--text-muted)',
          padding: '4px 6px', borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', transition: 'all 0.15s',
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { isUserOnline, getPresenceStatus } = usePresence();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'qr'
  const [isBlocked, setIsBlocked] = useState(false); // Nếu mình bị người này chặn
  const [friendState, setFriendState] = useState({
    relation: 'none', // none | friend | incoming | outgoing
    incomingRequestId: null,
    outgoingRequestId: null,
  });
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const profileLink = `${window.location.origin}/user/${userId}`;
  const isOwnProfile = me?._id === userId || me?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    userApi.getUserProfile(userId)
      .then(res => setProfile(res.data.user))
      .catch(() => setError('Không thể tải thông tin người dùng.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const fetchFriendState = async () => {
    if (!userId || isOwnProfile) return;

    try {
      const [friendRes, incomingRes, outgoingRes] = await Promise.all([
        friendApi.getFriendList(true).catch(() => ({ data: { success: false } })), // includeBlocked=true để kiểm tra xem mình có bị chặn không
        friendApi.getIncomingRequests().catch(() => ({ data: { success: false } })),
        friendApi.getOutgoingRequests().catch(() => ({ data: { success: false } })),
      ]);

      const friends = friendRes.data?.success ? (friendRes.data.data || []) : [];
      const incoming = incomingRes.data?.success ? (incomingRes.data.data || []) : [];
      const outgoing = outgoingRes.data?.success ? (outgoingRes.data.data || []) : [];

      // Kiểm tra xem mình có bị người này chặn không
      const friendRecord = friends.find((f) => f.friendId === userId);
      if (friendRecord && friendRecord.theyBlockedMe) {
        setIsBlocked(true);
        setFriendState({ relation: 'none', incomingRequestId: null, outgoingRequestId: null });
        return;
      }

      setIsBlocked(false);

      const isFriend = friends.some((f) => f.friendId === userId && !f.theyBlockedMe);
      if (isFriend) {
        setFriendState({ relation: 'friend', incomingRequestId: null, outgoingRequestId: null });
        return;
      }

      const incomingReq = incoming.find((r) => r.fromUserId?._id === userId);
      if (incomingReq) {
        setFriendState({ relation: 'incoming', incomingRequestId: incomingReq._id, outgoingRequestId: null });
        return;
      }

      const outgoingReq = outgoing.find((r) => r.toUserId?._id === userId);
      if (outgoingReq) {
        setFriendState({ relation: 'outgoing', incomingRequestId: null, outgoingRequestId: outgoingReq._id });
        return;
      }

      setFriendState({ relation: 'none', incomingRequestId: null, outgoingRequestId: null });
    } catch {
      setFriendState({ relation: 'none', incomingRequestId: null, outgoingRequestId: null });
    }
  };

  useEffect(() => {
    fetchFriendState();
  }, [userId, isOwnProfile]);

  const handleFriendAction = async () => {
    if (!userId || isOwnProfile) return;

    try {
      setFriendActionLoading(true);

      if (friendState.relation === 'none') {
        await friendApi.sendRequest(userId);
      } else if (friendState.relation === 'incoming' && friendState.incomingRequestId) {
        await friendApi.acceptRequest(friendState.incomingRequestId);
      } else if (friendState.relation === 'outgoing' && friendState.outgoingRequestId) {
        await friendApi.cancelRequest(friendState.outgoingRequestId);
      }

      await fetchFriendState();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể thực hiện thao tác kết bạn');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCreateDm = async () => {
    if (!userId || !profile) return;

    try {
      setMessageLoading(true);
      navigate('/chat', {
        state: {
          pendingPeer: {
            id: userId,
            name: profile.displayName,
            avatar: profile.avatar || '',
          },
        },
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể mở đoạn chat');
    } finally {
      setMessageLoading(false);
    }
  };

  const friendButtonLabel =
    friendState.relation === 'friend' ? 'Bạn bè' :
    friendState.relation === 'incoming' ? 'Đồng ý kết bạn' :
    friendState.relation === 'outgoing' ? 'Thu hồi lời mời' :
    'Kết bạn';

  const isOnline = isUserOnline(userId);
  const presStatus = getPresenceStatus(userId);
  const displayStatus = presStatus || (isOnline ? 'online' : profile?.status || 'offline');
  const statusInfo = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.offline;
  const accentColor = profile?.usernameColor || getAvatarColor(profile?.displayName);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Đang tải hồ sơ...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <p style={{ color: '#ed4245', fontWeight: 700 }}>{error || 'Không tìm thấy người dùng'}</p>
        <button onClick={() => navigate(-1)} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600,
        }}>
          Quay lại
        </button>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16 }}>Không thể xem thông tin của người dùng này</p>
        <button onClick={() => navigate(-1)} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600,
        }}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            gap: 6, fontSize: 14, fontWeight: 600, padding: '6px 8px', borderRadius: 8,
            transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
          {isOwnProfile ? 'Hồ sơ của tôi' : 'Hồ sơ người dùng'}
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 40px' }}>
        {/* Banner */}
        <div style={{
          height: 160,
          background: profile.banner
            ? `url(${profile.banner}) center/cover no-repeat`
            : `linear-gradient(135deg, ${accentColor}ee, ${accentColor}44)`,
          borderRadius: '0 0 16px 16px',
          marginBottom: 0,
          position: 'relative',
        }} />

        {/* Avatar + basic info */}
        <div style={{ position: 'relative', marginTop: -50, padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.displayName} style={{
                  width: 96, height: 96, borderRadius: '50%', objectFit: 'cover',
                  border: '5px solid var(--bg-primary)', display: 'block',
                }} />
              ) : (
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: accentColor, border: '5px solid var(--bg-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 36, userSelect: 'none',
                }}>
                  {getInitials(profile.displayName)}
                </div>
              )}
              {/* Status dot */}
              <span style={{
                position: 'absolute', bottom: 6, right: 6,
                width: 18, height: 18, borderRadius: '50%',
                background: statusInfo.color, border: '3px solid var(--bg-primary)',
              }} />
            </div>

            {/* Name + status pill */}
            <div style={{ paddingBottom: 4, flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 800, fontSize: 24, lineHeight: 1.2,
                color: profile.usernameColor || 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.displayName}
              </div>
              {profile.username && (
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
                  @{profile.username}
                </div>
              )}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 6, padding: '4px 10px',
                background: statusInfo.bg, borderRadius: 20,
                border: `1px solid ${statusInfo.color}40`,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Status text */}
          {profile.statusText && (
            <div style={{
              fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic',
              background: 'var(--bg-tertiary)', borderRadius: 8,
              padding: '8px 14px', marginBottom: 16,
              borderLeft: `3px solid ${accentColor}`,
            }}>
              {profile.statusText}
            </div>
          )}

          {/* Action buttons (không phải profile bản thân) */}
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <button
                onClick={handleCreateDm}
                disabled={messageLoading}
                style={{
                  flex: 1, minWidth: 100,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '11px 12px', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.12s', opacity: messageLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >
                <MessageCircle size={15} />
                {messageLoading ? 'Đang mở chat...' : 'Nhắn tin'}
              </button>
              <button
                onClick={handleFriendAction}
                disabled={friendActionLoading || friendState.relation === 'friend'}
                style={{
                  flex: 1, minWidth: 100,
                  background: friendState.relation === 'friend' ? 'var(--bg-tertiary)' : 'rgba(88,101,242,0.15)',
                  color: friendState.relation === 'friend' ? 'var(--text-muted)' : '#5865f2',
                  border: friendState.relation === 'friend' ? '1.5px solid var(--border)' : '1.5px solid rgba(88,101,242,0.35)',
                  borderRadius: 10, padding: '11px 12px', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.12s',
                  opacity: friendActionLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (friendState.relation !== 'friend') {
                    e.currentTarget.style.background = 'rgba(88,101,242,0.25)';
                  }
                }}
                onMouseLeave={e => {
                  if (friendState.relation !== 'friend') {
                    e.currentTarget.style.background = 'rgba(88,101,242,0.15)';
                  }
                }}
              >
                <UserPlus size={15} />
                {friendActionLoading ? 'Đang xử lý...' : friendButtonLabel}
              </button>
              <button
                onClick={() => alert('Tính năng gọi điện sắp ra mắt!')}
                style={{
                  flex: 1, minWidth: 100,
                  background: 'rgba(59,165,92,0.15)', color: '#3ba55c',
                  border: '1.5px solid rgba(59,165,92,0.35)',
                  borderRadius: 10, padding: '11px 12px', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,165,92,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,165,92,0.15)'}
              >
                <Phone size={15} />
                Gọi điện
              </button>
            </div>
          )}

          {/* Own profile: view public link button */}
          {isOwnProfile && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={handleCopyLink}
                style={{
                  flex: 1,
                  background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                {copiedLink ? <Check size={14} style={{ color: '#3ba55c' }} /> : <Copy size={14} />}
                {copiedLink ? 'Đã sao chép link' : 'Sao chép link hồ sơ'}
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                style={{
                  background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <ExternalLink size={14} />
                Xem QR
              </button>
              <button
                onClick={() => navigate('/change-password')}
                style={{
                  background: 'rgba(237,66,69,0.12)', color: '#ed4245',
                  border: '1px solid rgba(237,66,69,0.35)',
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(237,66,69,0.12)'}
              >
                <Shield size={14} />
                Đổi mật khẩu
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, margin: '0 20px 16px',
          background: 'var(--bg-secondary)', borderRadius: 10, padding: 4,
          border: '1px solid var(--border)',
        }}>
          {[
            { key: 'info', label: '👤 Thông tin' },
            { key: 'qr',   label: '📱 QR & Link' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, background: activeTab === t.key ? 'var(--accent)' : 'none',
              border: 'none', cursor: 'pointer', padding: '8px 4px', borderRadius: 8,
              color: activeTab === t.key ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === t.key ? 700 : 500, fontSize: 14,
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Thông tin */}
        {activeTab === 'info' && (
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
              Thông tin cá nhân
            </div>

            <InfoRow icon={<Mail size={16} />} label="Email" value={profile.email} />
            {profile.username && (
              <InfoRow icon={<AtSign size={16} />} label="Tên đăng nhập" value={`@${profile.username}`} mono />
            )}
            {profile.createdAt && (
              <InfoRow
                icon={<Calendar size={16} />}
                label="Tham gia từ"
                value={new Date(profile.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
            )}
            {profile.phone && (
              <InfoRow icon={<Phone size={16} />} label="Số điện thoại" value={profile.phone} />
            )}
            {profile.authProvider && (
              <InfoRow icon={<Shield size={16} />} label="Loại tài khoản" value={profile.authProvider === 'local' ? 'Tài khoản local' : `OAuth (${profile.authProvider})`} />
            )}

            {/* Bio */}
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                Giới thiệu bản thân
              </div>
              <div style={{
                background: 'var(--bg-tertiary)', borderRadius: 10,
                padding: '14px 16px', fontSize: 14, lineHeight: 1.7,
                color: profile.bio ? 'var(--text-secondary)' : 'var(--text-muted)',
                fontStyle: profile.bio ? 'normal' : 'italic',
                borderLeft: profile.bio ? `3px solid ${accentColor}` : '3px solid var(--border)',
                minHeight: 60,
              }}>
                {profile.bio || 'Người dùng chưa thêm giới thiệu.'}
              </div>
            </div>
          </div>
        )}

        {/* Tab: QR & Link */}
        {activeTab === 'qr' && (
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              Chia sẻ mã QR này để người khác tìm thấy hồ sơ của{' '}
              <strong style={{ color: profile.usernameColor || 'var(--text-primary)' }}>{profile.displayName}</strong>
            </p>

            {/* QR Code */}
            <div style={{
              background: '#fff', padding: 20, borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}>
              <QRCodeSVG
                value={profileLink}
                size={220}
                fgColor="#111827"
                bgColor="#ffffff"
                level="M"
                imageSettings={profile.avatar ? {
                  src: profile.avatar,
                  height: 44, width: 44, excavate: true,
                } : undefined}
              />
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '0 20px' }}>
              Người dùng có thể scan mã hoặc dùng tính năng "Quét QR" trong phần tìm kiếm
            </div>

            {/* Link + copy */}
            <div style={{
              width: '100%', background: 'var(--bg-secondary)', borderRadius: 10,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '1px solid var(--border)' }}>
                Link hồ sơ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10 }}>
                <span style={{
                  flex: 1, fontSize: 13, color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}>
                  {profileLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: copiedLink ? 'rgba(59,165,92,0.15)' : 'var(--bg-hover)',
                    border: 'none', borderRadius: 8,
                    padding: '6px 12px', cursor: 'pointer',
                    color: copiedLink ? '#3ba55c' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                >
                  {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                  {copiedLink ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
