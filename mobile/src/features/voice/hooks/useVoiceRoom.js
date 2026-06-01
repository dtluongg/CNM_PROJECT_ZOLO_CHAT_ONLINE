/**
 * useVoiceRoom – LiveKit hook cho React Native.
 *
 * Stack: livekit-client (JS SDK) + react-native-webrtc (WebRTC polyfill)
 *        + react-native-incall-manager (audio session / speaker routing)
 *
 * Âm thanh: native WebRTC layer tự phát qua loa (InCallManager quản lý routing).
 * Video:    lấy URL từ MediaStream.toURL() rồi dùng RTCView.
 * Screen:   tương tự Video, dùng RTCView với screenURL.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Room, RoomEvent, Track } from 'livekit-client';

// InCallManager – audio session & speaker routing trên iOS/Android
let InCallManager = null;
if (Platform.OS !== 'web') {
  try { InCallManager = require('react-native-incall-manager').default; } catch {}
}

// MediaStream từ react-native-webrtc – để tạo streamURL cho RTCView
let MediaStreamNative = null;
if (Platform.OS !== 'web') {
  try { MediaStreamNative = require('react-native-webrtc').MediaStream; } catch {}
}

function toStreamURL(track) {
  if (!MediaStreamNative || !track?.mediaStreamTrack) return null;
  try {
    return new MediaStreamNative([track.mediaStreamTrack]).toURL();
  } catch { return null; }
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function useVoiceRoom() {
  const roomRef = useRef(null);

  const [connected,            setConnected]            = useState(false);
  const [isMuted,              setIsMuted]              = useState(false);
  const [isCameraOff,          setIsCameraOff]          = useState(true);
  const [isScreenSharing,      setIsScreenSharing]      = useState(false); // local đang share
  const [isRemoteScreenSharing,setIsRemoteScreenSharing]= useState(false); // remote đang share
  const [speaking,             setSpeaking]             = useState(new Set());
  const [liveParts,            setLiveParts]            = useState([]);
  const [localVideoURL,        setLocalVideoURL]        = useState(null);
  const [remoteVideoURLs,      setRemoteVideoURLs]      = useState({});
  const [screenURL,            setScreenURL]            = useState(null); // URL để RTCView hiển thị

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

    // ── Bước 1: Khởi động audio session TRƯỚC khi kết nối ──────────────────
    if (InCallManager) {
      try {
        InCallManager.start({ media: 'audio' });
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (e) {
        console.warn('[VoiceRoom] InCallManager.start failed:', e?.message);
      }
    }

    // ── Bước 2: Tạo Room ────────────────────────────────────────────────────
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      webAudioMix: false, // React Native không có Web Audio API
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

    // ── Bước 3: Event handlers ──────────────────────────────────────────────

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        // ✅ Remote đang share màn hình — lấy URL để RTCView hiển thị
        const url = toStreamURL(track);
        setScreenURL(url);
        setIsRemoteScreenSharing(true);

      } else if (track.source === Track.Source.Camera) {
        // Remote camera
        const url = toStreamURL(track);
        setRemoteVideoURLs(prev => ({ ...prev, [participant.identity]: url }));

      }
      // Audio tự phát qua native WebRTC layer — không cần xử lý
      refreshParticipants(room);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        // ✅ Remote dừng share màn hình
        setScreenURL(null);
        setIsRemoteScreenSharing(false);

      } else if (track.source === Track.Source.Camera) {
        setRemoteVideoURLs(prev => {
          const next = { ...prev };
          delete next[participant.identity];
          return next;
        });
      }
      refreshParticipants(room);
    });

    // Local track publish (khi bật mic/camera/screen)
    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === Track.Source.Camera) {
        const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
        const localTrack = cam?.videoTrack || cam?.track || null;
        setLocalVideoURL(localTrack ? toStreamURL(localTrack) : null);
        setIsCameraOff(!room.localParticipant.isCameraEnabled);
      }
      if (pub.source === Track.Source.ScreenShare) {
        // ✅ Local bắt đầu share màn hình
        setIsScreenSharing(true);
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.source === Track.Source.Camera) {
        setLocalVideoURL(null);
        setIsCameraOff(true);
      }
      if (pub.source === Track.Source.ScreenShare) {
        // ✅ Local dừng share màn hình
        setIsScreenSharing(false);
      }
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
      setIsScreenSharing(false);
      setIsRemoteScreenSharing(false);
      setSpeaking(new Set());
      setLiveParts([]);
      setLocalVideoURL(null);
      setRemoteVideoURLs({});
      setScreenURL(null); // ✅ reset screen URL
    });

    // ── Bước 4: Kết nối ────────────────────────────────────────────────────
    await room.connect(livekitUrl, token, {
      autoSubscribe: true,
    });

    await room.localParticipant.setMicrophoneEnabled(true);
    setConnected(true);
    setIsMuted(false);
    refreshParticipants(room);
  }, [refreshParticipants]);

  const disconnect = useCallback(async () => {
    if (!roomRef.current) return;
    try { await roomRef.current.disconnect(); } catch {}
    roomRef.current = null;

    if (InCallManager) {
      try {
        InCallManager.setForceSpeakerphoneOn(false);
        InCallManager.stop();
      } catch {}
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
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const localTrack = !enabled ? (cam?.videoTrack || cam?.track || null) : null;
      setLocalVideoURL(localTrack ? toStreamURL(localTrack) : null);
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

  const getRemoteVideoURL = useCallback((identity) => {
    return remoteVideoURLs[identity] || null;
  }, [remoteVideoURLs]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        try { roomRef.current.disconnect(); } catch {}
        roomRef.current = null;
      }
      if (InCallManager) {
        try { InCallManager.stop(); } catch {}
      }
    };
  }, []);

  return {
    connect, disconnect,
    toggleMute, toggleCamera, toggleScreenShare,
    getRemoteVideoURL,
    connected, isMuted, isCameraOff,
    isScreenSharing, isRemoteScreenSharing,
    speaking, liveParts,
    localVideoURL, screenURL,
  };
}