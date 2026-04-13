import React from 'react';

const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#faa61a', '#ed4245', '#9b59b6', '#e67e22'
];

export const getAvatarColor = (name) =>
  AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const STATUS_CONFIG = {
  online:    { color: '#3ba55c', label: 'Online' },
  idle:      { color: '#faa61a', label: 'Vắng mặt' },
  dnd:       { color: '#ed4245', label: 'Không làm phiền' },
  invisible: { color: '#80848e', label: 'Ẩn' },
};

export const getStatusColor = (status, online) =>
  !online ? '#747f8d' : (STATUS_CONFIG[status]?.color || '#3ba55c');

const Avatar = ({
  name,
  avatar,
  size = 36,
  online = null,
  status = 'online'
}) => {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {avatar ? (
        <img
          src={avatar}
          alt={name || 'User'}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: getAvatarColor(name),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: Math.floor(size * 0.38),
            userSelect: 'none',
          }}
        >
          {getInitials(name)}
        </div>
      )}

      {online !== null && (
        <span
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            background: getStatusColor(status, online),
            border: `2px solid var(--bg-secondary)`,
          }}
        />
      )}
    </div>
  );
};

export default Avatar;