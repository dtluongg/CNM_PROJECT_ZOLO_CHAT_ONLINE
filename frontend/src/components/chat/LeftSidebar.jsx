import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#fee75c', '#ed4245', '#9b59b6', '#e67e22',
];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Avatar = ({ name, avatar, size = 36, online = null }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    {avatar ? (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: getAvatarColor(name),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: size * 0.38,
          userSelect: 'none',
        }}
      >
        {getInitials(name)}
      </div>
    )}
    {online !== null && (
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: Math.round(size * 0.32),
          height: Math.round(size * 0.32),
          borderRadius: '50%',
          background: online ? '#3ba55c' : '#747f8d',
          border: '2px solid var(--bg-secondary)',
        }}
      />
    )}
  </div>
);

const ConversationItem = ({ conv, active, collapsed, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(conv)}
      title={collapsed ? conv.name : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '8px' : '7px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        position: 'relative',
        background: active
          ? 'var(--accent)'
          : hovered
          ? 'var(--bg-hover)'
          : 'transparent',
        transition: 'background 0.12s',
        justifyContent: collapsed ? 'center' : 'flex-start',
        margin: '1px 6px',
      }}
    >
      <Avatar
        name={conv.name}
        avatar={conv.avatar}
        size={34}
        online={conv.type === 'dm' ? conv.online : null}
      />

      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
            <span style={{
              fontWeight: 600,
              fontSize: 14,
              color: active ? '#ffffff' : 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {conv.type === 'group' && (
                <span style={{ opacity: 0.7, marginRight: 3, fontSize: 12 }}>#</span>
              )}
              {conv.name}
            </span>
            <span style={{
              fontSize: 11,
              color: active ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
              flexShrink: 0,
              marginLeft: 4,
            }}>
              {conv.time}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 12,
              color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {conv.lastMessage}
            </span>
            {conv.unread > 0 && (
              <span style={{
                background: active ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
                color: '#fff',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                flexShrink: 0,
                marginLeft: 4,
                minWidth: 18,
                textAlign: 'center',
              }}>
                {conv.unread > 99 ? '99+' : conv.unread}
              </span>
            )}
          </div>
        </div>
      )}

      {collapsed && conv.unread > 0 && (
        <span style={{
          position: 'absolute',
          top: 2,
          right: 2,
          background: '#ed4245',
          color: '#fff',
          borderRadius: 10,
          fontSize: 9,
          fontWeight: 700,
          padding: '1px 4px',
          border: '2px solid var(--bg-secondary)',
          minWidth: 14,
          textAlign: 'center',
        }}>
          {conv.unread > 9 ? '9+' : conv.unread}
        </span>
      )}
    </div>
  );
};

export default function LeftSidebar({ conversations, activeConv, onSelectConv, onOpenSettings }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const dmList = filtered.filter((c) => c.type === 'dm');
  const groupList = filtered.filter((c) => c.type === 'group');

  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <div style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      height: '100%',
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      transition: 'width 0.2s, min-width 0.2s',
      overflow: 'hidden',
    }}>
      {/* Header: Logo + collapse button */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0 16px' : '0 12px 0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <span style={{
            fontWeight: 800,
            fontSize: 16,
            color: 'var(--text-primary)',
            letterSpacing: -0.5,
            userSelect: 'none',
          }}>
            ZoloChat
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 16,
            padding: '4px 6px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Search bar */}
      {!collapsed && (
        <div style={{ padding: '8px 10px 4px', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-primary)',
            borderRadius: 6,
            padding: '5px 10px',
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  padding: 0,
                  lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable conversation list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 4,
        paddingBottom: 4,
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--bg-hover) transparent',
      }}>
        {/* Direct Messages section */}
        {dmList.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px 4px',
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}>
                  Tin nhắn trực tiếp
                </span>
                <button
                  title="Tin nhắn mới"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '0 2px',
                    borderRadius: 4,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >+</button>
              </div>
            )}
            {dmList.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={activeConv?.id === conv.id}
                collapsed={collapsed}
                onClick={onSelectConv}
              />
            ))}
          </div>
        )}

        {/* Groups section */}
        {groupList.length > 0 && (
          <div>
            {!collapsed && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px 4px',
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}>
                  Nhóm
                </span>
                <button
                  title="Tạo nhóm mới"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '0 2px',
                    borderRadius: 4,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >+</button>
              </div>
            )}
            {groupList.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={activeConv?.id === conv.id}
                collapsed={collapsed}
                onClick={onSelectConv}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && !collapsed && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Không tìm thấy cuộc trò chuyện
            </p>
          </div>
        )}
      </div>

      {/* User profile footer */}
      <div style={{
        flexShrink: 0,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        padding: collapsed ? '8px 6px' : '8px',
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.15s',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Avatar
              name={user?.displayName || user?.username || user?.email || 'Me'}
              avatar={user?.avatar}
              size={32}
              online={true}
            />
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 120,
                }}>
                  {user?.displayName || user?.username || 'Người dùng'}
                </div>
                <div style={{ fontSize: 11, color: '#3ba55c', fontWeight: 600 }}>
                  ● Online
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              title="Cài đặt"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 16,
                padding: 4,
                borderRadius: 4,
                flexShrink: 0,
                transition: 'color 0.15s',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
