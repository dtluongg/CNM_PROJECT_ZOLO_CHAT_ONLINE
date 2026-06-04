import { THEME, STATUS_CONFIG } from '../../../theme';

export const COLOR_PALETTE = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#faa61a', '#ed4245', '#9b59b6', '#e67e22',
  '#1abc9c', '#3498db', '#e91e63', '#ff5722',
];

export const STATUS_OPTIONS = ['online', 'idle', 'dnd', 'invisible'];

export const getMyLiveStatus = ({ profile, user, isUserOnline, getPresenceStatus }) => {
  const myId = profile?._id || user?._id;
  if (!myId) {
    return STATUS_CONFIG.online;
  }

  // Với CHÍNH mình: hiển thị đúng trạng thái đã lưu (kể cả 'invisible' — chỉ mình thấy),
  // KHÔNG lấy từ presence vì presence có thể bị reset về 'online' khi reconnect.
  const saved = profile?.status || user?.status;
  if (saved) {
    return STATUS_CONFIG[saved] || STATUS_CONFIG.online;
  }

  // Chưa có dữ liệu user (đang tải) → suy ra từ presence như cũ.
  const online = isUserOnline(myId);
  const presStatus = online ? getPresenceStatus(myId) : null;
  return STATUS_CONFIG[presStatus || 'offline'] || STATUS_CONFIG.online;
};