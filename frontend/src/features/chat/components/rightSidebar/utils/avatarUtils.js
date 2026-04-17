const AVATAR_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#fee75c', '#ed4245', '#9b59b6', '#e67e22'];

export const getAvatarColor = (name) =>
  AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const STATUS_CONFIG = {
  online:    { color: '#3ba55c', label: 'Đang hoạt động', dot: '#3ba55c' },
  idle:      { color: '#faa61a', label: 'Vắng mặt', dot: '#faa61a' },
  dnd:       { color: '#ed4245', label: 'Không làm phiền', dot: '#ed4245' },
  invisible: { color: '#80848e', label: 'Ẩn', dot: '#80848e' },
};