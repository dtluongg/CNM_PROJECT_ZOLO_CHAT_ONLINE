// Discord-like dark theme for React Native
export const THEME = {
  // Backgrounds
  bgPrimary:   '#1e1f22',
  bgSecondary: '#2b2d31',
  bgTertiary:  '#313338',
  bgHover:     '#35373c',
  bgInput:     '#383a40',

  // Text
  textPrimary:   '#f2f3f5',
  textSecondary: '#b5bac1',
  textMuted:     '#80848e',

  // Accent
  accent:      '#5865f2',
  accentHover: '#4752c4',

  // Bubbles
  bubbleSelf:  '#5865f2',
  bubbleOther: '#3a3c43',

  // Border
  border: '#1e1f22',

  // Status
  statusOnline:    '#3ba55c',
  statusIdle:      '#faa61a',
  statusDnd:       '#ed4245',
  statusOffline:   '#747f8d',
  statusInvisible: '#747f8d',

  // Danger
  danger: '#ed4245',

  // Avatar palette
  avatarColors: ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'],
};

export const STATUS_CONFIG = {
  online:    { color: THEME.statusOnline,    label: 'Đang hoạt động' },
  idle:      { color: THEME.statusIdle,      label: 'Vắng mặt' },
  dnd:       { color: THEME.statusDnd,       label: 'Không làm phiền' },
  invisible: { color: THEME.statusInvisible, label: 'Ẩn' },
  offline:   { color: THEME.statusOffline,   label: 'Ngoại tuyến' },
};

export const getAvatarColor = (name) => {
  if (!name) return THEME.avatarColors[0];
  return THEME.avatarColors[name.charCodeAt(0) % THEME.avatarColors.length];
};

export const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};
