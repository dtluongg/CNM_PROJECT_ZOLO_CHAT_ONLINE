import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresence } from '../../../context/PresenceContext';
import { getFriendStatus, filterFriends, groupFriendsAlphabetically } from '../utils/friendHelpers';

const FriendsList = ({
  friends,
  friendFilterText,
  onOpenCreateGroup,
  onMessage,
  onUpdateNickname,
  onBlock,
  onUnfriend,
}) => {
  const navigate = useNavigate();
  const { isUserOnline, getPresenceStatus } = usePresence();

  const filtered = filterFriends(friends, friendFilterText);
  const { grouped, sortedKeys } = groupFriendsAlphabetically(filtered);

  return (
    <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Bạn bè ({friends.length})
        </span>
        <button
          onClick={onOpenCreateGroup}
          className="px-4 py-2 text-sm font-semibold rounded-lg"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          Tạo nhóm chat
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {sortedKeys.length === 0 && (
          <p className="text-center mt-10" style={{ color: 'var(--text-muted)' }}>
            Không tìm thấy bạn bè nào.
          </p>
        )}

        {sortedKeys.map((letter) => (
          <div key={letter} className="mb-6">
            <h3 className="text-lg font-bold mb-3 ml-2" style={{ color: 'var(--text-primary)' }}>{letter}</h3>
            <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              {grouped[letter].map((f, idx) => {
                const status = getFriendStatus(f.friendId, isUserOnline, getPresenceStatus);
                return (
                  <div
                    key={f.friendshipId}
                    className={`flex items-center justify-between p-3 px-5 transition ${idx !== grouped[letter].length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Avatar + info */}
                    <div
                      className="flex items-center gap-4 cursor-pointer flex-1 min-w-0"
                      onClick={() => navigate(`/user/${f.friendId}`)}
                    >
                      <div className="relative flex-shrink-0">
                        {f.avatar ? (
                          <img src={f.avatar} alt={f.displayName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--bg-primary)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                            {f.displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span style={{
                          position: 'absolute', bottom: 1, right: 1,
                          width: 11, height: 11, borderRadius: '50%',
                          backgroundColor: status.color,
                          border: '2px solid var(--bg-secondary)',
                        }} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>{f.displayName}</p>
                        {f.originalName && f.originalName !== f.displayName && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{f.originalName}</p>
                        )}
                        <p className="text-xs" style={{ color: status.color }}>{status.label}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); onMessage(f); }} className="px-3 py-1.5 text-xs font-semibold rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                        Nhắn tin
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onUpdateNickname(f.friendId); }} className="px-3 py-1.5 text-xs font-semibold rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                        Biệt danh
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onBlock(f.friendId, f.iBlocked); }} className={`px-3 py-1.5 text-xs font-semibold rounded ${f.iBlocked ? 'text-gray-600 bg-gray-200' : 'text-orange-600 bg-orange-50'}`}>
                        {f.iBlocked ? 'Bỏ chặn' : 'Chặn'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onUnfriend(f.friendId); }} className="px-3 py-1.5 text-xs font-semibold bg-red-50 rounded text-red-600">
                        Xoá
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;