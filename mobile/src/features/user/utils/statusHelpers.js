import { STATUS_CONFIG } from '../../../theme';

export const getLiveStatusInfo = (user, isUserOnline, getPresenceStatus) => {
  const online = isUserOnline(user._id);
  const presStatus = getPresenceStatus(user._id);
  if (online && presStatus) {
    const cfg = STATUS_CONFIG[presStatus] || STATUS_CONFIG.online;
    return { ...cfg, statusKey: presStatus };
  }
  return { ...STATUS_CONFIG.offline, statusKey: 'offline' };
};