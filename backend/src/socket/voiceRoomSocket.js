const VoiceRoom = require('../models/voiceRoomModel');

module.exports = (io, socket) => {
  // Client notifies server they're speaking (from LiveKit active speaker event)
  socket.on('voice-room:speaking', ({ conversationId, isSpeaking }) => {
    const userId = socket.user._id.toString();
    socket.to(`conv:${conversationId}`).emit('voice-room:speaking', {
      userId,
      isSpeaking,
    });
  });
};
