export const STATUS_CONFIG = {
  online:  { color: '#3ba55c', label: 'Đang hoạt động' },
  idle:    { color: '#faa61a', label: 'Vắng mặt' },
  dnd:     { color: '#ed4245', label: 'Không làm phiền' },
  offline: { color: '#80848e', label: 'Ngoại tuyến' },
};

export const getFriendStatus = (friendId, isUserOnline, getPresenceStatus) => {
  const isOnline   = isUserOnline(friendId);
  const presStatus = isOnline ? (getPresenceStatus(friendId) || 'online') : 'offline';
  return STATUS_CONFIG[presStatus] || STATUS_CONFIG.offline;
};

export const filterFriends = (friends, filterText) =>
  friends.filter(
    (f) =>
      (f.displayName || '').toLowerCase().includes(filterText.toLowerCase()) &&
      !f.iBlocked &&
      !f.theyBlockedMe
  );

export const groupFriendsAlphabetically = (friendsList) => {
  const grouped = friendsList.reduce((acc, f) => {
    const firstLetter = f.displayName ? f.displayName[0].toUpperCase() : '#';
    const group = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
    if (!acc[group]) acc[group] = [];
    acc[group].push(f);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return { grouped, sortedKeys };
};