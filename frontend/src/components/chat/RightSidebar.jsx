import React from 'react';

export default function RightSidebar({ conversation, onClose }) {
  if (!conversation) return null;

  return (
    <div style={{
      width: 240, minWidth: 240,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          {conversation.type === 'dm' ? 'Thông tin' : 'Thành viên'}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
        >✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Profile card */}
        <div style={{
          background: 'var(--bg-tertiary)', borderRadius: 8,
          overflow: 'hidden', marginBottom: 12,
        }}>
          {/* Banner */}
          <div style={{ height: 60, background: 'var(--accent)', opacity: 0.7 }} />
          {/* Avatar */}
          <div style={{ padding: '0 12px 12px', marginTop: -20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent)', border: '4px solid var(--bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 22,
            }}>
              {conversation.name[0].toUpperCase()}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{conversation.name}</div>
              {conversation.type === 'dm' && (
                <div style={{ fontSize: 12, color: conversation.online ? '#3ba55c' : 'var(--text-muted)', marginTop: 2 }}>
                  {conversation.online ? '🟢 Online' : '⚫ Offline'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info sections */}
        {conversation.type === 'dm' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Giới thiệu
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {conversation.bio || 'Chưa có giới thiệu.'}
            </p>
          </div>
        )}

        {/* Shared media */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Media đã chia sẻ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                aspectRatio: 1, borderRadius: 4,
                background: 'var(--bg-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 18,
              }}>🖼️</div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, textAlign: 'center',
          }}>💬 Nhắn tin</button>
          <button style={{
            background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none',
            borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>🔇 Tắt thông báo</button>
          <button style={{
            background: 'var(--bg-hover)', color: '#ed4245', border: 'none',
            borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>🚫 Chặn</button>
        </div>
      </div>
    </div>
  );
}
