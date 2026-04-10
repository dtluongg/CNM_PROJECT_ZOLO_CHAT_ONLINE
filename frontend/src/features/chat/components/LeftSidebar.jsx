import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usePresence } from '../../../context/PresenceContext';
import {
  ChevronLeft, ChevronRight, Search, Plus, Settings,
  Hash, MessageCircle, LogOut, UserSearch, X,
} from 'lucide-react';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const STATUS_CONFIG = {
  online:    { color: '#3ba55c', label: 'Online' },
  idle:      { color: '#faa61a', label: 'Vắng mặt' },
  dnd:       { color: '#ed4245', label: 'Không làm phiền' },
  invisible: { color: '#80848e', label: 'Ẩn' },
};

const getStatusColor = (status, online) =>
  !online ? '#747f8d' : (STATUS_CONFIG[status]?.color || '#3ba55c');

const Avatar = ({ name, avatar, size = 36, online = null, status = 'online' }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    {avatar
      ? <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      : <div style={{
          width: size, height: size, borderRadius: '50%',
          background: getAvatarColor(name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: size * 0.38, userSelect: 'none',
        }}>{getInitials(name)}</div>
    }
    {online !== null && (
      <span style={{
        position: 'absolute', bottom: 1, right: 1,
        width: size * 0.28, height: size * 0.28, borderRadius: '50%',
        background: getStatusColor(status, online),
        border: `2px solid var(--bg-secondary)`,
      }} />
    )}
  </div>
);

const ConvItem = ({ conv, active, collapsed, isMobile, onClick }) => {
  const { isUserOnline, getPresenceStatus } = usePresence();
  const [hovered, setHovered] = useState(false);
  const isOnline = conv.otherUserId ? isUserOnline(conv.otherUserId) : (conv.online ?? false);
  const presStatus = conv.otherUserId
    ? (getPresenceStatus(conv.otherUserId) || conv.status || 'online')
    : (conv.status || 'online');

  const itemHeight = isMobile ? 68 : 'auto';

  return (
    <div
      onClick={() => onClick(conv)}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onTouchStart={() => isMobile && setHovered(true)}
      onTouchEnd={() => isMobile && setHovered(false)}
      title={collapsed ? conv.name : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 10,
        padding: collapsed ? '8px' : isMobile ? '12px 16px' : '7px 10px',
        minHeight: itemHeight,
        borderRadius: isMobile ? 0 : 8,
        cursor: 'pointer', position: 'relative',
        background: active
          ? (isMobile ? 'var(--bg-hover)' : 'var(--accent)')
          : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s',
        justifyContent: collapsed ? 'center' : 'flex-start',
        margin: isMobile ? 0 : '1px 6px',
        borderLeft: isMobile && active ? '3px solid var(--accent)' : isMobile ? '3px solid transparent' : 'none',
      }}
    >
      <Avatar
        name={conv.name}
        avatar={conv.avatar}
        size={isMobile ? 48 : 36}
        online={conv.type === 'dm' ? isOnline : null}
        status={presStatus}
      />
      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontWeight: 600, fontSize: isMobile ? 15 : 14,
              color: active && !isMobile ? '#fff' : (conv.usernameColor || 'var(--text-primary)'),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, display: 'flex', alignItems: 'center', gap: 3,
            }}>
              {conv.type === 'group' && <Hash size={12} style={{ opacity: 0.6, flexShrink: 0 }} />}
              {conv.name}
            </span>
            <span style={{
              fontSize: 11,
              color: active && !isMobile ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
              flexShrink: 0, marginLeft: 6,
            }}>{conv.time}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 13,
              color: active && !isMobile ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{conv.lastMessage}</span>
            {conv.unread > 0 && (
              <span style={{
                background: active && !isMobile ? 'rgba(255,255,255,0.25)' : '#ed4245',
                color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700,
                padding: '2px 6px', flexShrink: 0, marginLeft: 6,
                minWidth: 20, textAlign: 'center',
              }}>
                {conv.unread > 99 ? '99+' : conv.unread}
              </span>
            )}
          </div>
        </div>
      )}
      {collapsed && conv.unread > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: '#ed4245', color: '#fff', borderRadius: 10,
          fontSize: 9, fontWeight: 700, padding: '1px 4px',
          border: '2px solid var(--bg-secondary)', minWidth: 14, textAlign: 'center',
        }}>
          {conv.unread > 9 ? '9+' : conv.unread}
        </span>
      )}
    </div>
  );
};

const IconBtn = ({ icon: Icon, onClick, title, size = 16, danger = false }) => {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? (danger ? 'rgba(237,66,69,0.15)' : 'var(--bg-hover)') : 'none',
        border: 'none', cursor: 'pointer',
        color: h ? (danger ? '#ed4245' : 'var(--text-primary)') : 'var(--text-muted)',
        padding: '6px', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s', flexShrink: 0,
        minWidth: 32, minHeight: 32,
      }}>
      <Icon size={size} />
    </button>
  );
};

export default function LeftSidebar({
  conversations, activeConv, onSelectConv,
  onOpenSettings, onOpenSearch, onOpenCreateGroup, isMobile = false,
}) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const dms = filtered.filter(c => c.type === 'dm');
  const groups = filtered.filter(c => c.type === 'group');

  const myStatus = user?.status || 'online';
  const myStatusConfig = STATUS_CONFIG[myStatus] || STATUS_CONFIG.online;

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    logout();
  }, [logout]);

  const sidebarWidth = isMobile ? '100%' : collapsed ? 72 : 260;

  return (
    <div style={{
      width: sidebarWidth, minWidth: sidebarWidth, height: '100%',
      background: 'var(--bg-secondary)',
      display: 'flex', flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      transition: isMobile ? 'none' : 'width 0.2s, min-width 0.2s',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Logout confirm overlay */}
      {showLogoutConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: 28,
        }}>
          <div style={{ fontSize: 40 }}>👋</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', textAlign: 'center' }}>
            Đăng xuất?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            Bạn sẽ cần đăng nhập lại để sử dụng ZoloChat.
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 260 }}>
            <button onClick={() => setShowLogoutConfirm(false)}
              style={{ flex: 1, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Hủy
            </button>
            <button onClick={handleLogout}
              style={{ flex: 1, background: '#ed4245', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        height: isMobile ? 56 : 52,
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0 14px' : isMobile ? '0 16px' : '0 10px 0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'var(--bg-secondary)',
      }}>
        {!collapsed && (
          <span style={{
            fontWeight: 800, fontSize: isMobile ? 18 : 16,
            color: 'var(--text-primary)', letterSpacing: -0.5, userSelect: 'none',
          }}>
            💬 ZoloChat
          </span>
        )}
        {!isMobile && (
          <IconBtn
            icon={collapsed ? ChevronRight : ChevronLeft}
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          />
        )}
      </div>

      {/* ── Search bar + Find users ── */}
      {!collapsed && (
        <div style={{ padding: isMobile ? '10px 12px 6px' : '8px 10px 4px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-primary)', borderRadius: 10,
            padding: isMobile ? '9px 12px' : '6px 10px',
          }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm hội thoại..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: isMobile ? 15 : 13,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', lineHeight: 1 }}>
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={onOpenSearch}
            title="Tìm kiếm người dùng"
            style={{
              background: 'var(--bg-primary)', border: 'none', borderRadius: 10,
              padding: isMobile ? '9px 12px' : '6px 9px',
              cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', flexShrink: 0,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <UserSearch size={isMobile ? 18 : 15} />
          </button>
        </div>
      )}

      {/* Collapsed: search icon */}
      {collapsed && (
        <div style={{ padding: '6px 10px', flexShrink: 0 }}>
          <button onClick={onOpenSearch} title="Tìm kiếm"
            style={{ width: '100%', background: 'var(--bg-primary)', border: 'none', borderRadius: 8, padding: '7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserSearch size={16} />
          </button>
        </div>
      )}

      {/* ── Conversation Lists ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* DMs section */}
        {!collapsed && dms.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: isMobile ? '14px 16px 6px' : '10px 16px 4px',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Tin nhắn ({dms.length})
            </span>
            {!isMobile && <IconBtn icon={Plus} title="Tin nhắn mới" size={14} />}
          </div>
        )}
        {dms.map(conv => (
          <ConvItem
            key={conv.id}
            conv={conv}
            active={activeConv?.id === conv.id}
            collapsed={collapsed}
            isMobile={isMobile}
            onClick={onSelectConv}
          />
        ))}

        {/* Groups section */}
        {(groups.length > 0 || !collapsed) && (
          <>
            {!collapsed && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: isMobile ? '14px 16px 6px' : '10px 16px 4px',
                marginTop: 4,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Nhóm ({groups.length})
                </span>
                {!isMobile && <IconBtn icon={Plus} title="Tạo nhóm" size={14} onClick={onOpenCreateGroup} />}
              </div>
            )}
            {collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />}
            {groups.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={activeConv?.id === conv.id}
                collapsed={collapsed}
                isMobile={isMobile}
                onClick={onSelectConv}
              />
            ))}
          </>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            Không tìm thấy hội thoại
          </div>
        )}
      </div>

      {/* ── Bottom: current user ── */}
      <div style={{
        padding: collapsed ? '8px' : isMobile ? '10px 16px' : '6px 10px',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 8, minWidth: 0, flex: 1 }}>
            {/* Avatar with status */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user?.avatar
                ? <img src={user.avatar} alt={user.displayName} style={{ width: isMobile ? 40 : 34, height: isMobile ? 40 : 34, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{
                    width: isMobile ? 40 : 34, height: isMobile ? 40 : 34, borderRadius: '50%',
                    background: getAvatarColor(user?.displayName || user?.email),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 13, userSelect: 'none',
                  }}>
                    {getInitials(user?.displayName || user?.email || '?')}
                  </div>
              }
              <span style={{
                position: 'absolute', bottom: 1, right: 1,
                width: isMobile ? 12 : 10, height: isMobile ? 12 : 10,
                borderRadius: '50%', background: myStatusConfig.color,
                border: '2px solid var(--bg-primary)',
              }} />
            </div>

            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 14 : 13, fontWeight: 700,
                  color: user?.usernameColor || 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.displayName || 'User'}
                </div>
                <div style={{ fontSize: 11, color: myStatusConfig.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span>●</span><span>{myStatusConfig.label}</span>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <IconBtn icon={Settings} onClick={onOpenSettings} title="Cài đặt hồ sơ" size={isMobile ? 18 : 15} />
              <IconBtn icon={LogOut} onClick={() => setShowLogoutConfirm(true)} title="Đăng xuất" size={isMobile ? 18 : 15} danger />
            </div>
          )}
        </div>

        {collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', marginTop: 4 }}>
            <IconBtn icon={Settings} onClick={onOpenSettings} title="Cài đặt" size={15} />
            <IconBtn icon={LogOut} onClick={() => setShowLogoutConfirm(true)} title="Đăng xuất" size={15} danger />
          </div>
        )}
      </div>
    </div>
  );
}
