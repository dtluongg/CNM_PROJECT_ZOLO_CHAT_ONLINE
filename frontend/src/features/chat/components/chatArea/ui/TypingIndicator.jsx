const TypingIndicator = ({ name }) => (
  <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{
      background: 'var(--bubble-other)', padding: '10px 14px',
      borderRadius: '4px 16px 16px 16px',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--text-muted)', display: 'inline-block',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {name} đang nhập...
    </span>
  </div>
);

export default TypingIndicator;