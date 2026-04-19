import React from 'react';
import { Crown } from 'lucide-react';

const RoleChip = ({ role }) => {
  const cfg = role === 'owner'
    ? { label: 'Owner', bg: 'rgba(250,166,26,0.2)', color: '#faa61a' }
    : role === 'admin'
    ? { label: 'Admin', bg: 'rgba(88,101,242,0.2)', color: '#5865f2' }
    : { label: 'Member', bg: 'rgba(128,132,142,0.2)', color: '#c0c4cc' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 999,
      padding: '3px 8px',
      background: cfg.bg,
      color: cfg.color,
    }}>
      {role === 'owner' && <Crown size={11} />}
      {cfg.label}
    </span>
  );
};

export default RoleChip;