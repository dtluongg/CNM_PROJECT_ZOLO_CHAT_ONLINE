/**
 * useVoiceRoom – LiveKit hook cho React Native.
 *
 * Âm thanh: native WebRTC layer tự phát qua loa (không cần audio element).
 * Video:    lấy MediaStream từ track rồi dùng RTCView.streamURL.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

// Lấy MediaStream constructor của react-native-webrtc (nếu có)
let MediaStreamNative = null;
try {
  MediaStreamNative = require('react-native-webrtc').MediaStream;
} catch {}

function toStreamURL(track) {
  if (!MediaStreamNative || !track?.mediaStreamTrack) return null;
  try {
    const ms = new MediaStreamNative([track.mediaStreamTrack]);
    return ms.toURL();
  } catch {
    return null;
  }
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function useVoiceRoom() {
  const roomRef = useRef(null);

  const [connected,       setConnected]       = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isCameraOff,     setIsCameraOff]     = useState(true);
  const [speaking,        setSpeaking]        = useState(new Set());
  const [liveParts,       setLiveParts]       = useState([]);
  // video URLs: identity → streamURL (string hoặc null)
  const [localVideoURL,   setLocalVideoURL]   = useState(null);
  const [remoteVideoURLs, setRemoteVideoURLs] = useState({});

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

  const connect = useCallback(async ({ livekitUrl, token }) => {
    if (roomRef.current) return;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.Camera) {
        const url = toStreamURL(track);
        setRemoteVideoURLs(prev => ({ ...prev, [participant.identity]: url }));
      }
      // Audio plays automatically via native WebRTC — no audio element needed
      refreshParticipants(room);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.Camera) {
        setRemoteVideoURLs(prev => {
          const next = { ...prev };
          delete next[participant.identity];
          return next;
        });
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackPublished, () => {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const localTrack = cam?.videoTrack || cam?.track || null;
      setLocalVideoURL(localTrack ? toStreamURL(localTrack) : null);
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackUnpublished, () => {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (!cam) setLocalVideoURL(null);
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      refreshParticipants(room);
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setSpeaking(new Set(speakers.map(s => s.identity)));
    });

    room.on(RoomEvent.ParticipantConnected,    () => refreshParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      setRemoteVideoURLs(prev => {
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
      setSpeaking(new Set());
      setLiveParts([]);
      setLocalVideoURL(null);
      setRemoteVideoURLs({});
    });

    await room.connect(livekitUrl, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    setConnected(true);
    setIsMuted(false);
    refreshParticipants(room);
  }, [refreshParticipants]);

  const disconnect = useCallback(async () => {
    if (!roomRef.current) return;
    await roomRef.current.disconnect();
    roomRef.current = null;
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
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const localTrack = !enabled ? (cam?.videoTrack || cam?.track || null) : null;
      setLocalVideoURL(localTrack ? toStreamURL(localTrack) : null);
      setIsCameraOff(enabled);
      refreshParticipants(room);
    } catch (e) {
      console.warn('[VoiceRoom] Camera toggle failed:', e.message);
    }
  }, [refreshParticipants]);

  const getRemoteVideoURL = useCallback((identity) => {
    return remoteVideoURLs[identity] || null;
  }, [remoteVideoURLs]);

  useEffect(() => {
    return () => { roomRef.current?.disconnect(); };
  }, []);

  return {
    connect, disconnect, toggleMute, toggleCamera,
    getRemoteVideoURL,
    connected, isMuted, isCameraOff,
    speaking, liveParts, localVideoURL,
  };
}
