import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft, ChevronRight, Search, Plus, Settings,
  Hash, MessageCircle,
} from 'lucide-react';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

const Avatar = ({ name, avatar, size = 34, online = null }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    {avatar
      ? <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      : <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, userSelect: 'none' }}>{getInitials(name)}</div>
    }
    {online !== null && (
      <span style={{ position: 'absolute', bottom: 1, right: 1, width: size * 0.3, height: size * 0.3, borderRadius: '50%', background: online ? '#3ba55c' : '#747f8d', border: '2px solid var(--bg-secondary)' }} />
    )}
  </div>
);

const ConvItem = ({ conv, active, collapsed, onClick }) => {
  const [hovered, setHovered] = useState(false);
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
      <Avatar name={conv.name} avatar={conv.avatar} size={34} online={conv.type === 'dm' ? conv.online : null} />
      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: active ? '#fff' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
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

const SectionLabel = ({ label, collapsed }) => !collapsed && (
  <div style={{ padding: '12px 16px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', userSelect: 'none' }}>
    {label}
  </div>
);

const IconBtn = ({ icon: Icon, onClick, title, size = 16, style = {} }) => {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? 'var(--bg-hover)' : 'none', border: 'none', cursor: 'pointer', color: h ? 'var(--text-primary)' : 'var(--text-muted)', padding: '5px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0, ...style }}>
      <Icon size={size} />
    </button>
  );
};

export default function LeftSidebar({ conversations, activeConv, onSelectConv, onOpenSettings }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const dms = filtered.filter(c => c.type === 'dm');
  const groups = filtered.filter(c => c.type === 'group');

  return (
    <div style={{ width: collapsed ? 72 : 240, minWidth: collapsed ? 72 : 240, height: '100%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', transition: 'width 0.2s, min-width 0.2s', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '0 14px' : '0 10px 0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {!collapsed && <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: -0.5, userSelect: 'none' }}>💬 ZoloChat</span>}
        <IconBtn icon={collapsed ? ChevronRight : ChevronLeft} onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'} />
      </div>

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: '8px 10px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', borderRadius: 8, padding: '6px 10px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13 }} />
          </div>
        </div>
      )}

      {/* Lists */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent' }}>
        {/* DM section */}
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tin nhắn</span>
            <IconBtn icon={Plus} title="Tin nhắn mới" size={14} />
          </div>
        )}
        {dms.map(conv => <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} collapsed={collapsed} onClick={onSelectConv} />)}

        {/* Group section */}
        {groups.length > 0 && (
          <>
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px', marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Nhóm</span>
                <IconBtn icon={Plus} title="Tạo nhóm" size={14} />
              </div>
            )}
            {collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />}
            {groups.map(conv => <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} collapsed={collapsed} onClick={onSelectConv} />)}
          </>
        )}
      </div>

      {/* User profile bottom */}
      <div style={{ padding: collapsed ? '8px' : '8px 10px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Avatar name={user?.displayName || user?.email} avatar={user?.avatar} size={32} online={true} />
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: user?.usernameColor || 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName || 'User'}
              </div>
              <div style={{ fontSize: 11, color: '#3ba55c' }}>● Online</div>
            </div>
          )}
        </div>
        {!collapsed && <IconBtn icon={Settings} onClick={onOpenSettings} title="Cài đặt" size={16} />}
      </div>
    </div>
  );
}
