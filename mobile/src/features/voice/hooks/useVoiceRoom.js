/**
 * useVoiceRoom – LiveKit hook cho React Native.
 * Stack: @livekit/react-native + react-native-incall-manager
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Room, RoomEvent, Track } from 'livekit-client';

let InCallManager = null;
if (Platform.OS !== 'web') {
  try { InCallManager = require('react-native-incall-manager').default; } catch {}
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function useVoiceRoom() {
  const roomRef = useRef(null);

  const [connected,             setConnected]             = useState(false);
  const [isMuted,               setIsMuted]               = useState(false);
  const [isCameraOff,           setIsCameraOff]           = useState(true);
  const [isScreenSharing,       setIsScreenSharing]       = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [speaking,              setSpeaking]              = useState(new Set());
  const [liveParts,             setLiveParts]             = useState([]);
  const [localVideoTrack,       setLocalVideoTrack]       = useState(null);
  const [remoteVideoTracks,     setRemoteVideoTracks]     = useState({});
  const [screenTrack,           setScreenTrack]           = useState(null);

  const refreshParticipants = useCallback((room) => {
    const snap = [
      {
        identity:   room.localParticipant.identity,
        name:       room.localParticipant.name,
        metadata:   safeParse(room.localParticipant.metadata),
        isLocal:    true,
        hasCamera:  room.localParticipant.isCameraEnabled,
        isSpeaking: room.localParticipant.isSpeaking,
        isMuted:    !room.localParticipant.isMicrophoneEnabled,
      },
      ...Array.from(room.remoteParticipants.values()).map(p => ({
        identity:   p.identity,
        name:       p.name,
        metadata:   safeParse(p.metadata),
        isLocal:    false,
        hasCamera:  p.isCameraEnabled,
        isSpeaking: p.isSpeaking,
        isMuted:    !p.isMicrophoneEnabled,
      })),
    ];
    setLiveParts(snap);
  }, []);

  const connect = useCallback(async ({ livekitUrl, token, callType }) => {
    if (roomRef.current) return;

    if (InCallManager) {
      try {
        InCallManager.start({ media: 'audio' });
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (e) {
        console.warn('[VoiceRoom] InCallManager.start failed:', e?.message);
      }
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: false,
        videoSimulcastLayers: [],
      },
      audioCaptureDefaults: {
        autoGainControl:  true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        setScreenTrack(track);
        setIsRemoteScreenSharing(true);
      } else if (track.source === Track.Source.Camera) {
        setRemoteVideoTracks(prev => ({ ...prev, [participant.identity]: track }));
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        setScreenTrack(null);
        setIsRemoteScreenSharing(false);
      } else if (track.source === Track.Source.Camera) {
        setRemoteVideoTracks(prev => {
          const next = { ...prev };
          delete next[participant.identity];
          return next;
        });
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === Track.Source.Camera) {
        const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
        setLocalVideoTrack(cam?.videoTrack || null);
        setIsCameraOff(!room.localParticipant.isCameraEnabled);
      }
      if (pub.source === Track.Source.ScreenShare) {
        setIsScreenSharing(true);
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.source === Track.Source.Camera) {
        setLocalVideoTrack(null);
        setIsCameraOff(true);
      }
      if (pub.source === Track.Source.ScreenShare) {
        setIsScreenSharing(false);
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setSpeaking(new Set(speakers.map(s => s.identity)));
    });

    room.on(RoomEvent.ParticipantConnected,    () => refreshParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      setRemoteVideoTracks(prev => {
        const next = { ...prev };
        delete next[p.identity];
        return next;
      });
      refreshParticipants(room);
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnected(false);
      setIsMuted(false);
      setIsCameraOff(true);
      setIsScreenSharing(false);
      setIsRemoteScreenSharing(false);
      setSpeaking(new Set());
      setLiveParts([]);
      setLocalVideoTrack(null);
      setRemoteVideoTracks({});
      setScreenTrack(null);
    });

    await room.connect(livekitUrl, token, { autoSubscribe: true });
    await room.localParticipant.setMicrophoneEnabled(true);
    if (callType === 'video') {
      await room.localParticipant.setCameraEnabled(true);
    }
    setConnected(true);
    setIsMuted(false);
    setIsCameraOff(callType !== 'video');
    refreshParticipants(room);
  }, [refreshParticipants]);

  const disconnect = useCallback(async () => {
    if (!roomRef.current) return;
    try { await roomRef.current.disconnect(); } catch {}
    roomRef.current = null;
    if (InCallManager) {
      try { InCallManager.setForceSpeakerphoneOn(false); InCallManager.stop(); } catch {}
    }
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
  }, []);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const enabled = room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(!enabled);
      if (!enabled) {
        const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
        setLocalVideoTrack(cam?.videoTrack || null);
      } else {
        setLocalVideoTrack(null);
      }
      setIsCameraOff(enabled);
      refreshParticipants(room);
    } catch (e) {
      console.warn('[VoiceRoom] Camera toggle failed:', e?.message);
    }
  }, [refreshParticipants]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const enabled = room.localParticipant.isScreenShareEnabled;
      await room.localParticipant.setScreenShareEnabled(!enabled);
      setIsScreenSharing(!enabled);
      refreshParticipants(room);
    } catch (e) {
      console.warn('[VoiceRoom] Screen share failed:', e?.message);
    }
  }, [refreshParticipants]);

  const getRemoteVideoTrack = useCallback((identity) => {
    return remoteVideoTracks[identity] || null;
  }, [remoteVideoTracks]);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        try { roomRef.current.disconnect(); } catch {}
        roomRef.current = null;
      }
      if (InCallManager) { try { InCallManager.stop(); } catch {} }
    };
  }, []);

  return {
    connect, disconnect,
    toggleMute, toggleCamera, toggleScreenShare,
    getRemoteVideoTrack,
    // Backward compat aliases used by GroupCallScreen/GroupCallContext
    getRemoteVideoURL: getRemoteVideoTrack,
    localVideoURL: localVideoTrack,
    screenURL: screenTrack,
    connected, isMuted, isCameraOff,
    isScreenSharing, isRemoteScreenSharing,
    speaking, liveParts,
  };
}