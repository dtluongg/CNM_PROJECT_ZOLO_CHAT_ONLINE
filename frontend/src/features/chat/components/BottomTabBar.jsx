import React from 'react';
import { MessageCircle, Search, User } from 'lucide-react';

const BOTTOM_TABS = [
  { key: 'messages', icon: MessageCircle, label: 'Tin nhắn' },
  { key: 'search',   icon: Search,        label: 'Tìm kiếm' },
  { key: 'profile',  icon: User,          label: 'Hồ sơ' },
];

const BottomTabBar = ({ activeTab, onTabChange, unreadTotal }) => (
  <div style={{
    height: 56,
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'stretch',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    flexShrink: 0,
    zIndex: 20,
  }}>
    {BOTTOM_TABS.map(({ key, icon: Icon, label }) => {
      const active = activeTab === key;
      return (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'color 0.15s',
            position: 'relative',
            minHeight: 0,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
              fill={active && key === 'messages' ? 'var(--accent)' : 'none'}
            />
            {key === 'messages' && unreadTotal > 0 && !active && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                minWidth: 16, height: 16, background: '#ed4245', color: '#fff',
                borderRadius: 8, fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', border: '2px solid var(--bg-secondary)',
              }}>
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.2 }}>
            {label}
          </span>
          {active && (
            <span style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 32, height: 3, background: 'var(--accent)', borderRadius: '0 0 4px 4px',
            }} />
          )}
        </button>
      );
    })}
  </div>
);

export default BottomTabBar;