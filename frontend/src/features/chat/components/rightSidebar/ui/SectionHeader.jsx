import React from 'react';

const SectionHeader = ({ title }) => (
  <div style={{
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 8,
    marginTop: 4,
  }}>
    {title}
  </div>
);

export default SectionHeader;