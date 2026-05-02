const ACCESS_TOKEN_KEY = 'accessToken';
const CURRENT_USER_KEY = 'currentUser';
const SESSION_ID_KEY = 'sessionId';

const hasWindow = () => typeof window !== 'undefined';

const safeGet = (storage, key) => {
  if (!hasWindow()) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage, key, value) => {
  if (!hasWindow()) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write errors (private mode/quota)
  }
};

const safeRemove = (storage, key) => {
  if (!hasWindow()) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage remove errors
  }
};

export const migrateLegacyAuthStorage = () => {
  if (!hasWindow()) return;

  const sessionToken = safeGet(window.sessionStorage, ACCESS_TOKEN_KEY);
  const legacyToken = safeGet(window.localStorage, ACCESS_TOKEN_KEY);
  if (!sessionToken && legacyToken) {
    safeSet(window.sessionStorage, ACCESS_TOKEN_KEY, legacyToken);
  }
  if (legacyToken) {
    safeRemove(window.localStorage, ACCESS_TOKEN_KEY);
  }

  const sessionUser = safeGet(window.sessionStorage, CURRENT_USER_KEY);
  const legacyUser = safeGet(window.localStorage, CURRENT_USER_KEY);
  if (!sessionUser && legacyUser) {
    safeSet(window.sessionStorage, CURRENT_USER_KEY, legacyUser);
  }
  if (legacyUser) {
    safeRemove(window.localStorage, CURRENT_USER_KEY);
  }
};

export const getAccessToken = () => {
  if (!hasWindow()) return null;
  return safeGet(window.sessionStorage, ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token) => {
  if (!hasWindow()) return;
  if (!token) {
    safeRemove(window.sessionStorage, ACCESS_TOKEN_KEY);
    return;
  }
  safeSet(window.sessionStorage, ACCESS_TOKEN_KEY, token);
};

export const removeAccessToken = () => {
  if (!hasWindow()) return;
  safeRemove(window.sessionStorage, ACCESS_TOKEN_KEY);
};

export const getCurrentUserRaw = () => {
  if (!hasWindow()) return null;
  return safeGet(window.sessionStorage, CURRENT_USER_KEY);
};

export const setCurrentUserRaw = (userRaw) => {
  if (!hasWindow()) return;
  if (!userRaw) {
    safeRemove(window.sessionStorage, CURRENT_USER_KEY);
    return;
  }
  safeSet(window.sessionStorage, CURRENT_USER_KEY, userRaw);
};

export const removeCurrentUserRaw = () => {
  if (!hasWindow()) return;
  safeRemove(window.sessionStorage, CURRENT_USER_KEY);
};

export const getSessionId = () => {
  if (!hasWindow()) return null;
  // Thử lấy từ localStorage (mới) trước
  let sid = safeGet(window.localStorage, SESSION_ID_KEY);
  // Nếu không có, thử fallback sang sessionStorage (cũ)
  if (!sid) {
    sid = safeGet(window.sessionStorage, SESSION_ID_KEY);
  }
  return sid;
};

export const setSessionId = (sid) => {
  if (!hasWindow()) return;
  if (!sid) {
    safeRemove(window.localStorage, SESSION_ID_KEY);
    return;
  }
  safeSet(window.localStorage, SESSION_ID_KEY, sid);
};

export const removeSessionId = () => {
  if (!hasWindow()) return;
  safeRemove(window.localStorage, SESSION_ID_KEY);
};
