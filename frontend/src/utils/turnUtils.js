const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';
const API_URL = SOCKET_URL.replace(/\/socket\.io.*/, '');

const FALLBACK_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export async function getIceServers(token) {
  try {
    const res = await fetch(`${API_URL}/api/calls/turn-credentials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('fetch failed');
    const servers = await res.json();
    console.log('[TURN] credentials fetched:', servers.length, 'servers');
    return servers;
  } catch (err) {
    console.warn('[TURN] fallback to STUN only:', err.message);
    return FALLBACK_ICE;
  }
}