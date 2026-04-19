import { useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

export function useVoiceRoom() {
  const roomRef          = useRef(null);
  const audioEls         = useRef({});   // identity → <audio>
  const cameraTrackMap   = useRef({});   // identity → camera Track (remote)

  const [connected,       setConnected]       = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isCameraOff,     setIsCameraOff]     = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speaking,        setSpeaking]        = useState(new Set());
  const [liveParts,       setLiveParts]       = useState([]);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [screenTrack,     setScreenTrack]     = useState(null);
  const [, forceUpdate]  = useState(0); // to trigger re-render when cameraTrackMap changes

  const refreshParticipants = useCallback((room) => {
    const snap = [
      {
        identity:  room.localParticipant.identity,
        name:      room.localParticipant.name,
        metadata:  safeParse(room.localParticipant.metadata),
        isLocal:   true,
        hasCamera: room.localParticipant.isCameraEnabled,
        hasScreen: room.localParticipant.isScreenShareEnabled,
        isSpeaking: room.localParticipant.isSpeaking,
        isMuted:   !room.localParticipant.isMicrophoneEnabled,
      },
      ...Array.from(room.remoteParticipants.values()).map(p => ({
        identity:  p.identity,
        name:      p.name,
        metadata:  safeParse(p.metadata),
        isLocal:   false,
        hasCamera: p.isCameraEnabled,
        hasScreen: p.isScreenShareEnabled,
        isSpeaking: p.isSpeaking,
        isMuted:   !p.isMicrophoneEnabled,
      })),
    ];
    setLiveParts(snap);
  }, []);

  const connect = useCallback(async ({ livekitUrl, token }) => {
    if (roomRef.current) return;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        setScreenTrack(track);
      } else if (track.source === Track.Source.Camera) {
        cameraTrackMap.current[participant.identity] = track;
        forceUpdate(n => n + 1);
      } else if (track.kind === Track.Kind.Audio) {
        let el = audioEls.current[participant.identity];
        if (!el) {
          el = document.createElement('audio');
          el.autoplay = true;
          document.body.appendChild(el);
          audioEls.current[participant.identity] = el;
        }
        track.attach(el);
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        setScreenTrack(null);
      } else if (track.source === Track.Source.Camera) {
        delete cameraTrackMap.current[participant.identity];
        forceUpdate(n => n + 1);
      } else if (track.kind === Track.Kind.Audio) {
        const el = audioEls.current[participant.identity];
        if (el) { el.srcObject = null; el.remove(); delete audioEls.current[participant.identity]; }
      }
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackPublished, (_pub) => {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalVideoTrack(cam?.videoTrack || cam?.track || null);
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
      refreshParticipants(room);
    });

    room.on(RoomEvent.LocalTrackUnpublished, (_pub) => {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalVideoTrack(cam?.videoTrack || cam?.track || null);
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
      refreshParticipants(room);
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setSpeaking(new Set(speakers.map(s => s.identity)));
    });

    room.on(RoomEvent.ParticipantConnected,    () => refreshParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      const el = audioEls.current[p.identity];
      if (el) { el.srcObject = null; el.remove(); delete audioEls.current[p.identity]; }
      delete cameraTrackMap.current[p.identity];
      refreshParticipants(room);
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnected(false); setIsMuted(false); setIsCameraOff(true);
      setIsScreenSharing(false); setSpeaking(new Set()); setLiveParts([]);
      setLocalVideoTrack(null); setScreenTrack(null);
      cameraTrackMap.current = {};
      Object.values(audioEls.current).forEach(el => { el.srcObject = null; el.remove(); });
      audioEls.current = {};
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
      setLocalVideoTrack(!enabled ? (cam?.videoTrack || cam?.track || null) : null);
      setIsCameraOff(enabled);
      refreshParticipants(room);
    } catch (e) {
      console.warn('[VoiceRoom] Camera toggle failed:', e.message);
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
      console.warn('[VoiceRoom] Screen share failed:', e.message);
    }
  }, [refreshParticipants]);

  const getRemoteCameraTrack = useCallback((identity) => {
    return cameraTrackMap.current[identity] || null;
  }, []);

  useEffect(() => {
    return () => { roomRef.current?.disconnect(); };
  }, []);

  return {
    connect, disconnect, toggleMute, toggleCamera, toggleScreenShare,
    getRemoteCameraTrack,
    connected, isMuted, isCameraOff, isScreenSharing,
    speaking, liveParts, localVideoTrack, screenTrack,
  };
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
