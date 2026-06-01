/**
 * turnUtils.js
 * Fetch TURN credentials từ backend – giấu API key khỏi client.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2026';

const FALLBACK_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export async function getIceServers(token) {
  try {
    if (!token) throw new Error('no token');

    const res = await fetch(`${API_URL}/api/calls/turn-credentials`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const servers = await res.json();
    console.log('[TURN] fetched:', servers.length, 'servers');
    return servers;
  } catch (err) {
    console.warn('[TURN] fallback to STUN only:', err.message);
    return FALLBACK_ICE;
  }
}