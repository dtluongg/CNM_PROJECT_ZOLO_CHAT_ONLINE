export const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#fee75c', '#ed4245', '#9b59b6', '#e67e22',
];

export const getAvatarColor = (name) =>
  name ? AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] : AVATAR_COLORS[0];

export const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};