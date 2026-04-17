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

  const online = isUserOnline(myId);
  const presStatus = getPresenceStatus(myId);

  let statusKey = 'offline';

  if (online && presStatus) {
    statusKey = presStatus;
  } else if (profile?.status && profile.status !== 'invisible') {
    statusKey = profile.status;
  } else {
    statusKey = 'offline';
  }

  return STATUS_CONFIG[statusKey] || STATUS_CONFIG.online;
};