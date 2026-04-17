const DateDivider = ({ label }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '16px 16px 8px', pointerEvents: 'none',
  }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    <span style={{
      fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
      whiteSpace: 'nowrap', padding: '0 8px',
    }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
);

export default DateDivider;