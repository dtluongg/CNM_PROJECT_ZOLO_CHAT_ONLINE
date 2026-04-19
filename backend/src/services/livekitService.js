const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const createVoiceRoomToken = async (roomName, userId, displayName, avatar = null) => {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId.toString(),
    name: displayName,
    metadata: JSON.stringify({ avatar }),
    ttl: '4h',
  });

  // livekitService.js — thêm vào addGrant:
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
};

module.exports = { createVoiceRoomToken };