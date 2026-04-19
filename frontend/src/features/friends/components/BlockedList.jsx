import React from 'react';

const BlockedList = ({ blockedList, onUnblock }) => (
  <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
    <div className="px-6 py-4 border-b flex items-center gap-4 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Danh sách chặn ({blockedList.length})
      </span>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-4">
      {blockedList.length === 0 && (
        <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Bạn chưa chặn ai.</p>
      )}

      <div className="space-y-4 max-w-3xl">
        {blockedList.map((user) => (
          <div key={user.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl shadow-sm gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--bg-primary)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                  {user.displayName?.[0]?.toUpperCase() || 'N'}
                </div>
              )}
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{user.displayName || 'Người lạ'}</p>
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 600, color: '#ed4245', backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 6, padding: '2px 8px' }}>
                  Đã chặn
                </span>
              </div>
            </div>
            <button
              onClick={() => onUnblock(user.userId)}
              className="px-5 py-2 text-sm font-semibold rounded-lg self-end sm:self-auto"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Bỏ chặn
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default BlockedList;