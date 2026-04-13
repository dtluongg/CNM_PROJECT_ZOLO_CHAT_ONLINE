import React from 'react';

const CreateGroupModal = ({
  groupName,
  setGroupName,
  selectedFriendIds,
  filteredFriends,
  creatingChat,
  onToggleSelectFriend,
  onConfirm,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    onClick={(e) => { if (e.target === e.currentTarget && !creatingChat) onClose(); }}
  >
    <div className="w-full max-w-xl rounded-xl border p-5 max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Tạo nhóm chat</h3>

      <input
        type="text"
        placeholder="Nhập tên nhóm..."
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full mb-4 p-2.5 rounded-lg border text-sm outline-none"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />

      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Chọn bạn bè ({selectedFriendIds.length}) - tối thiểu 2 người
      </p>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
        {filteredFriends.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Không có bạn bè để chọn.</p>
        )}
        {filteredFriends.map((f) => {
          const checked = selectedFriendIds.includes(f.friendId);
          return (
            <label
              key={f.friendshipId}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer"
              style={{
                borderColor:     checked ? 'var(--accent)' : 'var(--border)',
                backgroundColor: checked ? 'var(--bg-hover)' : 'var(--bg-primary)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input type="checkbox" checked={checked} onChange={() => onToggleSelectFriend(f.friendId)} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{f.displayName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{f.email}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          disabled={creatingChat}
          className="px-4 py-2 text-sm font-semibold rounded-lg"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', opacity: creatingChat ? 0.7 : 1 }}
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={creatingChat || !groupName.trim() || selectedFriendIds.length < 2}
          className="px-4 py-2 text-sm font-semibold rounded-lg"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: (creatingChat || !groupName.trim() || selectedFriendIds.length < 2) ? 0.6 : 1 }}
        >
          {creatingChat ? 'Đang tạo...' : 'Tạo nhóm'}
        </button>
      </div>
    </div>
  </div>
);

export default CreateGroupModal;