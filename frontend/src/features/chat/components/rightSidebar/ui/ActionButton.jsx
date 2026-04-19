import React, { useState } from 'react';

const ActionButton = ({
  icon,
  label,
  variant = 'default',
  onClick,
  disabled = false
}) => {
  const [hovered, setHovered] = useState(false);

  const bg = variant === 'primary'
    ? hovered ? 'var(--accent-hover)' : 'var(--accent)'
    : variant === 'danger'
    ? hovered ? '#c0282b' : '#ed424520'
    : hovered ? 'var(--bg-hover)' : 'var(--bg-primary)';

  const color = variant === 'primary'
    ? '#fff'
    : variant === 'danger'
    ? '#ed4245'
    : 'var(--text-secondary)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        color,
        border: 'none',
        borderRadius: 8,
        padding: '9px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'left',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export default ActionButton;