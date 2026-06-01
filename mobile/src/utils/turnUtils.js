/**
 * turnUtils.js (React Native)
 * Fetch TURN credentials từ backend – giống frontend turnUtils.js
 */
import apiClient from '../services/apiClient';

const FALLBACK_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export async function getIceServers() {
  try {
    const res = await apiClient.get('/calls/turn-credentials');
    const servers = res.data;
    if (Array.isArray(servers) && servers.length > 0) {
      console.log('[TURN] fetched:', servers.length, 'servers');
      return servers;
    }
    throw new Error('empty response');
  } catch (err) {
    console.warn('[TURN] fallback to STUN only:', err.message);
    return FALLBACK_ICE;
  }
}