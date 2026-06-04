import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, X, MessageCircle, Phone,
  UserPlus, UserCheck, Clock, AtSign, BellOff, Users, Flag,
} from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';

/* ── helpers ─────────────────────────────────────────────── */
const getTypeMeta = (t) => ({
  message: { icon: MessageCircle, color: '#58a6ff', cat: 'message', label: t('notification_center.types.message') },
  mention: { icon: AtSign, color: '#a78bfa', cat: 'message', label: t('notification_center.types.mention') },
  reminder: { icon: Clock, color: '#fbbf24', cat: 'system', label: t('notification_center.types.reminder') },
  friend_request: { icon: UserPlus, color: '#34d399', cat: 'system', label: t('notification_center.types.friend_request') },
  friend_accepted: { icon: UserCheck, color: '#34d399', cat: 'system', label: t('notification_center.types.friend_accepted') },
  call_incoming: { icon: Phone, color: '#3ba55c', cat: 'call', label: t('notification_center.types.call_incoming') },
  call_rejected: { icon: Phone, color: '#ed4245', cat: 'call', label: t('notification_center.types.call_rejected') },
  call_missed: { icon: Phone, color: '#ed4245', cat: 'call', label: t('notification_center.types.call_missed') },
  report: { icon: Flag, color: '#f59e0b', cat: 'system', label: t('notification_center.types.report') },
});

const getCats = (t) => [
  { key: 'all', label: t('notification_center.categories.all') },
  { key: 'message', label: t('notification_center.categories.message') },
  { key: 'call', label: t('notification_center.categories.call') },
  { key: 'system', label: t('notification_center.categories.system') },
];

const fmt = (iso, language, t) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso);
  if (diff < 60000) return t('notification_center.time.just_now');
  if (diff < 3600000) return t('notification_center.time.minutes_ago', { count: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('notification_center.time.hours_ago', { count: Math.floor(diff / 3600000) });
  const locale = language?.startsWith('vi') ? 'vi-VN' : 'en-US';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

const AVATAR_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#faa61a', '#ed4245', '#9b59b6', '#e67e22'];
const avatarBg = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

/* ── Avatar người gửi với badge loại thông báo ───────────── */
function ActorAvatar({ actor, convName, isGroup, Icon, iconColor, size = 42 }) {
  const name = actor?.displayName || convName || '?';
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Avatar chính */}
      {actor?.avatar ? (
        <img src={actor.avatar} alt={name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: avatarBg(name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: size * 0.36,
        }}>
          {isGroup ? <Users size={size * 0.42} /> : initials(name)}
        </div>
      )}
      {/* Badge loại thông báo */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        width: 18, height: 18, borderRadius: '50%',
        background: iconColor, border: '2px solid var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={9} style={{ color: '#fff' }} strokeWidth={2.5} />
      </div>
    </div>
  );
}

/* ── component ───────────────────────────────────────────── */
export default function NotificationCenter({ open, onClose }) {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [cat, setCat] = useState('all');
  const overlayRef = useRef(null);
  const typeMeta = useMemo(() => getTypeMeta(t), [t]);
  const cats = useMemo(() => getCats(t), [t]);

  const formatTime = useCallback((iso) => fmt(iso, language, t), [language, t]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (overlayRef.current === e.target) onClose?.(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [items],
  );

  const filtered = useMemo(() => {
    if (cat === 'all') return sorted;

    return sorted.filter(
      n => (typeMeta[n.type]?.cat || 'system') === cat
    );
  }, [sorted, cat, typeMeta]);

  const catCount = useCallback((key) => {
    const base =
      key === 'all'
        ? sorted
        : sorted.filter(
          n => (typeMeta[n.type]?.cat || 'system') === key
        );

    return base.filter(n => !n.isRead).length;
  }, [sorted, typeMeta]);

  const handleOpen = useCallback(async (item) => {
    if (!item?._id) return;
    await markRead(item._id);
    if (item.type === 'report') {
      // không điều hướng, chỉ đánh dấu đã đọc
    } else if (item.type === 'friend_request' || item.type === 'friend_accepted') {
      navigate('/friends', { state: { activeTab: 'friend_requests' } });
    } else if (item.conversationId) {
      navigate('/chat', { state: { openConversationId: item.conversationId } });
    }
    onClose?.();
  }, [markRead, navigate, onClose]);

  if (!open) return null;

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 18,
        width: 460, maxWidth: '96vw', maxHeight: '82vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
        animation: 'modalIn 0.2s ease', overflow: 'hidden',
        border: '1px solid var(--glass-border, var(--border))',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{t('notification_center.title')}</span>
            {unreadCount > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff',
                borderRadius: 10, fontSize: 11, fontWeight: 800, padding: '1px 8px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--bg-hover)', border: 'none', borderRadius: 8,
                padding: '5px 10px', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
              }}>
                <CheckCheck size={13} /> {t('notification_center.mark_all_read')}
              </button>
            )}
            <button onClick={onClose} style={{
              background: 'var(--bg-hover)', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 14px',
          borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto',
        }}>
          {cats.map(({ key, label }) => {
            const count = catCount(key);
            const active = cat === key;
            return (
              <button key={key} onClick={() => setCat(key)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: active ? 'var(--accent)' : 'var(--bg-hover)',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 500, fontSize: 12, flexShrink: 0,
                transition: 'all 0.15s',
                boxShadow: active ? '0 2px 8px rgba(var(--accent-rgb),0.3)' : 'none',
              }}>
                {label}
                {count > 0 && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.25)' : '#ef4444',
                    color: '#fff', borderRadius: 8, fontSize: 10, fontWeight: 800,
                    padding: '0 5px', minWidth: 16, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── List ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {loading && filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('notification_center.loading')}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <BellOff size={36} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('notification_center.empty')}</div>
            </div>
          )}

          {filtered.map((item) => {
            const meta = typeMeta[item.type] || typeMeta.reminder;
            const Icon = meta.icon;
            const actor = item.actorId; // { displayName, avatar, username }
            const convName = item.data?.conversationName || item.data?.groupName || null;
            const isGroup = item.data?.conversationType === 'group' || !!item.data?.groupName;

            return (
              <button
                key={item._id}
                onClick={() => handleOpen(item)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none',
                  background: item.isRead ? 'transparent' : 'rgba(var(--accent-rgb,88,166,255),0.07)',
                  borderRadius: 12, padding: '10px 12px', marginBottom: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12,
                  transition: 'background 0.12s', outline: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = item.isRead ? 'transparent' : 'rgba(var(--accent-rgb,88,166,255),0.07)'}
              >
                {/* Avatar + badge */}
                <ActorAvatar
                  actor={actor}
                  convName={convName}
                  isGroup={isGroup}
                  Icon={Icon}
                  iconColor={meta.color}
                />

                {/* Nội dung */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Dòng 1: tên người gửi + tên cuộc trò chuyện */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
                    {actor?.displayName && (
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: 'var(--accent)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130,
                      }}>
                        {actor.displayName}
                      </span>
                    )}
                    {convName && (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('notification_center.within')}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: 'var(--text-secondary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130,
                        }}>
                          {convName}
                        </span>
                      </>
                    )}
                    {/* Unread dot */}
                    {!item.isRead && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0, marginLeft: 'auto',
                      }} />
                    )}
                  </div>

                  {/* Dòng 2: title (nội dung tin nhắn) */}
                  <div style={{
                    fontSize: 13, fontWeight: item.isRead ? 500 : 600,
                    color: 'var(--text-primary)', lineHeight: 1.35,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </div>

                  {/* Dòng 3: body (preview chi tiết) */}
                  {item.body && (
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {item.body}
                    </div>
                  )}

                  {/* Dòng 4: loại + thời gian */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <span style={{
                      background: `${meta.color}22`, color: meta.color,
                      borderRadius: 5, padding: '1px 6px', fontWeight: 600, fontSize: 10,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(item.createdAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}