import React from 'react';
import { Users, UserPlus, ShieldOff, UsersRound, Search } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const TABS = [
  { key: 'friends_list',    icon: Users,       labelKey: 'friends.list_title',   badgeKey: null },
  { key: 'friend_requests', icon: UserPlus,    labelKey: 'friends.requests',     badgeKey: 'incoming' },
  { key: 'blocked_list',    icon: ShieldOff,   labelKey: 'friends.blocked_list', badgeKey: 'blocked' },
];

const FriendsSidebar = ({
  activeTab, onTabChange,
  friendFilterText, onFilterChange,
  incomingCount, blockedCount,
}) => {
  const { t } = useLanguage();

  const badge = { incoming: incomingCount, blocked: blockedCount };

  return (
    <div style={{
      width: 260, minWidth: 260,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-secondary)',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 16px 12px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>
          {t('friends.list_title')}
        </div>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-primary)',
          borderRadius: 10, padding: '7px 11px',
          border: '1px solid transparent', transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.4)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
        >
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13 }}
            placeholder={t('friends.search_placeholder')}
            value={friendFilterText}
            onChange={e => onFilterChange(e.target.value)}
          />
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {TABS.map(({ key, icon: Icon, labelKey, badgeKey }) => {
          const active = activeTab === key;
          const count = badgeKey ? badge[badgeKey] : 0;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                background: active ? 'linear-gradient(135deg,var(--accent),var(--accent-hover))' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontWeight: active ? 700 : 500, fontSize: 14,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: active ? 'rgba(255,255,255,0.18)' : 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} style={{ color: active ? '#fff' : 'var(--accent)' }} strokeWidth={1.8} />
              </div>
              <span style={{ flex: 1 }}>{t(labelKey)}</span>
              {count > 0 && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.25)' : '#ef4444',
                  color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  padding: '1px 7px', minWidth: 20, textAlign: 'center', flexShrink: 0,
                }}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}

        {/* Groups placeholder */}
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'transparent', color: 'var(--text-muted)',
          border: 'none', cursor: 'not-allowed', textAlign: 'left',
          fontWeight: 500, fontSize: 14, opacity: 0.5,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'var(--bg-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UsersRound size={16} style={{ color: 'var(--text-muted)' }} strokeWidth={1.8} />
          </div>
          <span>{t('friends.group_list')}</span>
        </button>
      </div>
    </div>
  );
};

export default FriendsSidebar;