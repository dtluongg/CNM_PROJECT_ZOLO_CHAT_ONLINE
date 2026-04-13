import React, { useState } from 'react';

const IconBtn = ({ icon: Icon, onClick, title, size = 16, danger = false }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? (danger ? 'rgba(237,66,69,0.15)' : 'var(--bg-hover)')
          : 'none',
        border: 'none',
        cursor: 'pointer',
        color: hovered
          ? (danger ? '#ed4245' : 'var(--text-primary)')
          : 'var(--text-muted)',
        padding: '6px',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
        flexShrink: 0,
        minWidth: 32,
        minHeight: 32,
      }}
    >
      <Icon size={size} />
    </button>
  );
};

export default IconBtn;