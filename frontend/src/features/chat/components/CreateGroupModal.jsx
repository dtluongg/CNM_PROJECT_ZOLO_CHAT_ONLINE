import React from 'react';

const CreateGroupModal = ({
  groupName,
  setGroupName,
  selectedFriendIds,
  friendsForGroup,
  loadingFriends,
  creatingGroup,
  onToggleSelectFriend,
  onCreateGroup,
  onClose,
}) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
    onClick={(e) => { if (e.target === e.currentTarget && !creatingGroup) onClose(); }}
  >
    <div style={{
      width: '100%', maxWidth: 540, maxHeight: '80vh',
      overflow: 'hidden', borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 18 }}>Tạo nhóm chat</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
          Chọn tối thiểu 2 người bạn để tạo nhóm
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          placeholder="Nhập tên nhóm..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={{
            width: '100%', border: '1px solid var(--border)',
            borderRadius: 10, background: 'var(--bg-primary)',
            color: 'var(--text-primary)', padding: '10px 12px',
            outline: 'none', fontSize: 14,
          }}
        />

        <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>
          Bạn bè đã chọn: {selectedFriendIds.length}
        </div>

        <div style={{
          maxHeight: 320, overflowY: 'auto',
          border: '1px solid var(--border)', borderRadius: 10,
          padding: 8, background: 'var(--bg-primary)',
        }}>
          {loadingFriends && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>
              Đang tải danh sách bạn bè...
            </div>
          )}

          {!loadingFriends && friendsForGroup.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>
              Bạn chưa có bạn bè để tạo nhóm.
            </div>
          )}

          {!loadingFriends && friendsForGroup.map((f) => {
            const checked = selectedFriendIds.includes(f.friendId);
            return (
              <label
                key={f.friendshipId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                  background: checked ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleSelectFriend(f.friendId)}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
                    {f.displayName}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.email}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: 14, borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <button
          onClick={onClose}
          disabled={creatingGroup}
          style={{
            border: 'none', borderRadius: 8, cursor: 'pointer',
            padding: '9px 14px', background: 'var(--bg-hover)',
            color: 'var(--text-primary)', fontWeight: 600,
          }}
        >
          Hủy
        </button>
        <button
          onClick={onCreateGroup}
          disabled={creatingGroup || !groupName.trim() || selectedFriendIds.length < 2}
          style={{
            border: 'none', borderRadius: 8, cursor: 'pointer',
            padding: '9px 14px', background: 'var(--accent)',
            color: '#fff', fontWeight: 700,
            opacity: (creatingGroup || !groupName.trim() || selectedFriendIds.length < 2) ? 0.6 : 1,
          }}
        >
          {creatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
        </button>
      </div>
    </div>
  </div>
);

export default CreateGroupModal;