import React from 'react';

const FriendsSidebar = ({
  activeTab,
  onTabChange,
  friendFilterText,
  onFilterChange,
  incomingCount,
  blockedCount,
}) => (
  <div className="w-[300px] border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
    {/* Search filter */}
    <div className="p-4 flex items-center gap-3">
      <div className="w-full relative">
        <span className="absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }}>🔍</span>
        <input
          type="text"
          className="w-full border-none rounded-md py-2 pl-9 pr-3 text-sm outline-none"
          style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
          placeholder="Tìm bạn bè..."
          value={friendFilterText}
          onChange={(e) => onFilterChange(e.target.value)}
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      {/* Danh sách bạn bè */}
      <button
        onClick={() => onTabChange('friends_list')}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${activeTab === 'friends_list' ? 'font-semibold' : ''}`}
        style={{
          backgroundColor: activeTab === 'friends_list' ? 'var(--bg-hover)' : 'transparent',
          color: activeTab === 'friends_list' ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>👥</span>
        <span>Danh sách bạn bè</span>
      </button>

      {/* Lời mời kết bạn */}
      <button
        onClick={() => onTabChange('friend_requests')}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${activeTab === 'friend_requests' ? 'font-semibold' : ''}`}
        style={{
          backgroundColor: activeTab === 'friend_requests' ? 'var(--bg-hover)' : 'transparent',
          color: activeTab === 'friend_requests' ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>📥</span>
          <span>Lời mời kết bạn</span>
        </div>
        {incomingCount > 0 && (
          <span className="text-white text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#ef4444' }}>
            {incomingCount}
          </span>
        )}
      </button>

      {/* Danh sách chặn */}
      <button
        onClick={() => onTabChange('blocked_list')}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${activeTab === 'blocked_list' ? 'font-semibold' : ''}`}
        style={{
          backgroundColor: activeTab === 'blocked_list' ? 'var(--bg-hover)' : 'transparent',
          color: activeTab === 'blocked_list' ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>🚫</span>
          <span>Danh sách chặn</span>
        </div>
        {blockedCount > 0 && (
          <span className="text-white text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#f97316' }}>
            {blockedCount}
          </span>
        )}
      </button>

      {/* Danh sách nhóm — placeholder */}
      <button className="w-full flex items-center gap-3 px-4 py-3 opacity-60" style={{ color: 'var(--text-primary)' }}>
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>👨‍👩‍👧‍👦</span>
        <span>Danh sách nhóm</span>
      </button>
    </div>
  </div>
);

export default FriendsSidebar;