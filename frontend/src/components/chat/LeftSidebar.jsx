import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePresence } from '../../context/PresenceContext';
import {
  ChevronLeft, ChevronRight, Search, Plus, Settings,
  Hash, MessageCircle, LogOut, UserSearch,
} from 'lucide-react';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

const STATUS_CONFIG = {
  online:    { color: '#3ba55c', label: 'Online' },
  idle:      { color: '#faa61a', label: 'Vắng mặt' },
  dnd:       { color: '#ed4245', label: 'Không làm phiền' },
  invisible: { color: '#80848e', label: 'Ẩn' },
};

const getStatusColor = (status, online) => {
  if (!online) return '#747f8d';
  return STATUS_CONFIG[status]?.color || '#3ba55c';
};

const Avatar = ({ name, avatar, size = 34, online = null, status = 'online' }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    {avatar
      ? <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      : <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, userSelect: 'none' }}>{getInitials(name)}</div>
    }
    {online !== null && (
      <span style={{
        position: 'absolute', bottom: 1, right: 1,
        width: size * 0.3, height: size * 0.3, borderRadius: '50%',
        background: getStatusColor(status, online),
        border: '2px solid var(--bg-secondary)',
      }} />
    )}
  </div>
);

const ConvItem = ({ conv, active, collapsed, onClick }) => {
  const { isUserOnline, getPresenceStatus } = usePresence();
  const [hovered, setHovered] = useState(false);
  const isOnline = conv.otherUserId ? isUserOnline(conv.otherUserId) : (conv.online ?? false);
  const presStatus = conv.otherUserId ? (getPresenceStatus(conv.otherUserId) || conv.status || 'online') : (conv.status || 'online');

  return (
    <div
      onClick={() => onClick(conv)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? conv.name : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '8px' : '7px 10px',
        borderRadius: 8, cursor: 'pointer', position: 'relative',
        background: active ? 'var(--accent)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s',
        justifyContent: collapsed ? 'center' : 'flex-start',
        margin: '1px 6px',
      }}
    >
      <Avatar name={conv.name} avatar={conv.avatar} size={34} online={conv.type === 'dm' ? isOnline : null} status={presStatus} />
      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: active ? '#fff' : (conv.usernameColor || 'var(--text-primary)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              {conv.type === 'group' && <Hash size={12} style={{ opacity: 0.6, flexShrink: 0 }} />}
              {conv.name}
            </span>
            <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>{conv.time}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{conv.lastMessage}</span>
            {conv.unread > 0 && (
              <span style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '1px 6px', flexShrink: 0, marginLeft: 4, minWidth: 18, textAlign: 'center' }}>
                {conv.unread > 99 ? '99+' : conv.unread}
              </span>
            )}
          </div>
        </div>
      )}
      {collapsed && conv.unread > 0 && (
        <span style={{ position: 'absolute', top: 2, right: 2, background: '#ed4245', color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 4px', border: '2px solid var(--bg-secondary)', minWidth: 14, textAlign: 'center' }}>
          {conv.unread > 9 ? '9+' : conv.unread}
        </span>
      )}
    </div>
  );
};

const IconBtn = ({ icon: Icon, onClick, title, size = 16, danger = false, style: extraStyle = {} }) => {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? (danger ? 'rgba(237,66,69,0.15)' : 'var(--bg-hover)') : 'none',
        border: 'none', cursor: 'pointer',
        color: h ? (danger ? '#ed4245' : 'var(--text-primary)') : 'var(--text-muted)',
        padding: '5px', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s', flexShrink: 0, ...extraStyle,
      }}>
      <Icon size={size} />
    </button>
  );
};

export default function LeftSidebar({ conversations, activeConv, onSelectConv, onOpenSettings, onOpenSearch }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const filtered = conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const dms = filtered.filter(c => c.type === 'dm');
  const groups = filtered.filter(c => c.type === 'group');

  const myStatus = user?.status || 'online';
  const myStatusConfig = STATUS_CONFIG[myStatus] || STATUS_CONFIG.online;

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <div style={{ width: collapsed ? 72 : 240, minWidth: collapsed ? 72 : 240, height: '100%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', transition: 'width 0.2s, min-width 0.2s', overflow: 'hidden', position: 'relative' }}>

      {/* Logout confirm overlay */}
      {showLogoutConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 20, borderRadius: 'inherit',
        }}>
          <div style={{ fontSize: 32 }}>👋</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', textAlign: 'center' }}>
            Đăng xuất?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Bạn sẽ cần đăng nhập lại.
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              style={{ flex: 1, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Hủy
            </button>
            <button
              onClick={handleLogout}
              style={{ flex: 1, background: '#ed4245', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '0 14px' : '0 10px 0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {!collapsed && <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: -0.5, userSelect: 'none' }}>💬 ZoloChat</span>}
        <IconBtn icon={collapsed ? ChevronRight : ChevronLeft} onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'} />
      </div>

      {/* Search conversations + Find users */}
      {!collapsed && (
        <div style={{ padding: '8px 10px 4px', display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', borderRadius: 8, padding: '6px 10px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Lọc hội thoại..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13 }} />
          </div>
          {/* Nút tìm kiếm người dùng */}
          <button
            onClick={onOpenSearch}
            title="Tìm kiếm người dùng"
            style={{
              background: 'var(--bg-primary)', border: 'none', borderRadius: 8,
              padding: '6px 9px', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', flexShrink: 0,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <UserSearch size={15} />
          </button>
        </div>
      )}

      {/* Collapsed: icon tìm kiếm user */}
      {collapsed && (
        <div style={{ padding: '6px 10px' }}>
          <button
            onClick={onOpenSearch}
            title="Tìm kiếm người dùng"
            style={{
              width: '100%', background: 'var(--bg-primary)', border: 'none', borderRadius: 8,
              padding: '7px', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <UserSearch size={16} />
          </button>
        </div>
      )}

      {/* Lists */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tin nhắn</span>
            <IconBtn icon={Plus} title="Tin nhắn mới" size={14} />
          </div>
        )}
        {dms.map(conv => <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} collapsed={collapsed} onClick={onSelectConv} />)}

        {groups.length > 0 && (
          <>
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 4px', marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Nhóm</span>
                <IconBtn icon={Plus} title="Tạo nhóm" size={14} />
              </div>
            )}
            {collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />}
            {groups.map(conv => <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} collapsed={collapsed} onClick={onSelectConv} />)}
          </>
        )}
      </div>

      {/* Bottom: current user + actions */}
      <div style={{
        padding: collapsed ? '6px 8px' : '6px 10px',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {/* Avatar với status dot */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.displayName}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: getAvatarColor(user?.displayName || user?.email),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13, userSelect: 'none',
                }}>
                  {getInitials(user?.displayName || user?.email || '?')}
                </div>
              )}
              <span style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 10, height: 10, borderRadius: '50%',
                background: myStatusConfig.color,
                border: '2px solid var(--bg-primary)',
              }} />
            </div>

            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
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
              <IconBtn icon={Settings} onClick={onOpenSettings} title="Cài đặt hồ sơ" size={15} />
              <IconBtn icon={LogOut} onClick={() => setShowLogoutConfirm(true)} title="Đăng xuất" size={15} danger />
            </div>
          )}
        </div>

        {/* Collapsed: nút settings + logout xếp dọc */}
        {collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <IconBtn icon={Settings} onClick={onOpenSettings} title="Cài đặt" size={15} />
            <IconBtn icon={LogOut} onClick={() => setShowLogoutConfirm(true)} title="Đăng xuất" size={15} danger />
          </div>
        )}
      </div>
    </div>
  );
}
