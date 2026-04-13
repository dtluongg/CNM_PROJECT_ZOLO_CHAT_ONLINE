import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usePresence } from '../../../context/PresenceContext';
import { 
  ChevronLeft, ChevronRight, Search, Plus, Settings, 
  Hash, MessageCircle, LogOut, UserSearch, X 
} from 'lucide-react';

// Import từ thư mục leftSidebar (cùng cấp)
import Avatar, { getAvatarColor, getInitials } from './leftSidebar/ui/Avatar';
import ConvItem from './leftSidebar/ui/ConvItem';
import IconBtn from './leftSidebar/ui/IconBtn';

export default function LeftSidebar({
  conversations,
  activeConv,
  onSelectConv,
  onOpenSettings,
  onOpenSearch,
  onOpenCreateGroup,
  isMobile = false,
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
  const STATUS_CONFIG = {
    online:    { color: '#3ba55c', label: 'Online' },
    idle:      { color: '#faa61a', label: 'Vắng mặt' },
    dnd:       { color: '#ed4245', label: 'Không làm phiền' },
    invisible: { color: '#80848e', label: 'Ẩn' },
  };
  const myStatusConfig = STATUS_CONFIG[myStatus] || STATUS_CONFIG.online;

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    logout();
  }, [logout]);

  const sidebarWidth = isMobile ? '100%' : collapsed ? 72 : 260;

  return (
    <div style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      height: '100%',
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      transition: isMobile ? 'none' : 'width 0.2s, min-width 0.2s',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Logout confirm overlay */}
      {showLogoutConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28,
        }}>
          <div style={{ fontSize: 40 }}>👋</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', textAlign: 'center' }}>
            Đăng xuất?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            Bạn sẽ cần đăng nhập lại để sử dụng ZoloChat.
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 260 }}>
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              style={{ flex: 1, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              Hủy
            </button>
            <button 
              onClick={handleLogout}
              style={{ flex: 1, background: '#ed4245', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        height: isMobile ? 56 : 52,
        display: 'flex',
        alignItems: 'center',
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

      {/* Search bar */}
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
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>
          <button 
            onClick={onOpenSearch}
            title="Tìm kiếm người dùng"
            style={{
              background: 'var(--bg-primary)', border: 'none', borderRadius: 10,
              padding: isMobile ? '9px 12px' : '6px 9px', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}
          >
            <UserSearch size={isMobile ? 18 : 15} />
          </button>
        </div>
      )}

      {/* Collapsed search icon */}
      {collapsed && (
        <div style={{ padding: '6px 10px', flexShrink: 0 }}>
          <button 
            onClick={onOpenSearch}
            title="Tìm kiếm"
            style={{
              width: '100%', background: 'var(--bg-primary)', border: 'none',
              borderRadius: 8, padding: '7px', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <UserSearch size={16} />
          </button>
        </div>
      )}

      {/* Conversation List */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent',
      }}>
        {/* DMs */}
        {!collapsed && dms.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '14px 16px 6px' : '10px 16px 4px' }}>
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

        {/* Groups */}
        {(groups.length > 0 || !collapsed) && (
          <>
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '14px 16px 6px' : '10px 16px 4px', marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Nhóm ({groups.length})
                </span>
                {!isMobile && <IconBtn icon={Plus} title="Tạo nhóm" size={14} onClick={onOpenCreateGroup} />}
              </div>
            )}
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

      {/* Bottom - Current User */}
      <div style={{
        padding: collapsed ? '8px' : isMobile ? '10px 16px' : '6px 10px',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 8, minWidth: 0, flex: 1 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.displayName} 
                  style={{ width: isMobile ? 40 : 34, height: isMobile ? 40 : 34, borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{
                  width: isMobile ? 40 : 34,
                  height: isMobile ? 40 : 34,
                  borderRadius: '50%',
                  background: getAvatarColor(user?.displayName || user?.email),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 13,
                }}>
                  {getInitials(user?.displayName || user?.email || '?')}
                </div>
              )}
              <span style={{
                position: 'absolute', bottom: 1, right: 1,
                width: isMobile ? 12 : 10, height: isMobile ? 12 : 10,
                borderRadius: '50%', background: myStatusConfig.color,
                border: `2px solid var(--bg-primary)`,
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