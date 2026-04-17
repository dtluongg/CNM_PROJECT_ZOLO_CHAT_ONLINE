import { useState, useCallback } from 'react';
import friendApi from '../../friends/api/friendApi';

export const useBlockStatus = () => {
  const [dmBlockStatus, setDmBlockStatus] = useState(null); // { iBlocked, theyBlockedMe }

  const fetchDmBlockStatus = useCallback(async (otherUserId) => {
    if (!otherUserId) { setDmBlockStatus(null); return; }
    try {
      const res = await friendApi.getFriendStatus(otherUserId);
      const d   = res?.data?.data;
      setDmBlockStatus(d ? { iBlocked: !!d.iBlocked, theyBlockedMe: !!d.theyBlockedMe } : null);
    } catch {
      setDmBlockStatus(null);
    }
  }, []);

  return { dmBlockStatus, setDmBlockStatus, fetchDmBlockStatus };
};