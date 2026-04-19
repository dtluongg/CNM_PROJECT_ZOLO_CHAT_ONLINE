import React from 'react';

/**
 * UnreadDivider — Dòng phân cách "Tin nhắn chưa đọc"
 * Xuất hiện ngay trước tin nhắn đầu tiên chưa được đọc.
 */
export default function UnreadDivider() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '12px 16px 4px',
      userSelect: 'none',
    }}>
      <div style={{ flex: 1, height: 1, background: '#ed4245aa' }} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#ed4245cc',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      }}>
        Tin nhắn chưa đọc
      </span>
      <div style={{ flex: 1, height: 1, background: '#ed4245aa' }} />
    </div>
  );
}
