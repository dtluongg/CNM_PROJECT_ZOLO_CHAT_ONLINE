import { useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

export function useVoiceRoom() {
  const roomRef         = useRef(null);
  const audioEls        = useRef({}); // identity → <audio>
  const videoEls        = useRef({}); // identity → <video> (camera)
  const screenEls       = useRef({}); // identity → <video> (screen share)

  const [connected,       setConnected]       = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isCameraOff,     setIsCameraOff]     = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speaking,        setSpeaking]        = useState(new Set());
  const [liveParts,       setLiveParts]       = useState([]);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [screenTrack,     setScreenTrack]     = useState(null); // remote or local

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
      },
      ...Array.from(room.remoteParticipants.values()).map(p => ({
        identity:  p.identity,
        name:      p.name,
        metadata:  safeParse(p.metadata),
        isLocal:   false,
        hasCamera: p.isCameraEnabled,
        hasScreen: p.isScreenShareEnabled,
        isSpeaking: p.isSpeaking,
      })),
    ];
    setLiveParts(snap);
  }, []);

  const attachAudio = useCallback((identity, track) => {
    if (track.kind !== Track.Kind.Audio) return;
    let el = audioEls.current[identity];
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      document.body.appendChild(el);
      audioEls.current[identity] = el;
    }
    track.attach(el);
  }, []);

  const connect = useCallback(async ({ livekitUrl, token }) => {
    if (roomRef.current) return;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        setScreenTrack(track);
      } else {
        attachAudio(participant.identity, track);
      }
      refreshParticipants(room);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        setScreenTrack(null);
      } else {
        const el = audioEls.current[participant.identity];
        if (el) { el.srcObject = null; el.remove(); delete audioEls.current[participant.identity]; }
      }
      refreshParticipants(room);
    });
    room.on(RoomEvent.LocalTrackPublished, (_pub) => {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalVideoTrack(cam?.track || null);
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
      refreshParticipants(room);
    });
    room.on(RoomEvent.LocalTrackUnpublished, () => {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalVideoTrack(cam?.track || null);
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
      refreshParticipants(room);
    });
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setSpeaking(new Set(speakers.map(s => s.identity)));
    });
    room.on(RoomEvent.ParticipantConnected,    () => refreshParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      ['audio', 'video', 'screen'].forEach(k => {
        const map = { audio: audioEls, video: videoEls, screen: screenEls }[k];
        const el  = map.current[p.identity];
        if (el) { el.srcObject = null; el.remove(); delete map.current[p.identity]; }
      });
      refreshParticipants(room);
    });
    room.on(RoomEvent.Disconnected, () => {
      setConnected(false); setIsMuted(false); setIsCameraOff(true);
      setIsScreenSharing(false); setSpeaking(new Set()); setLiveParts([]);
      setLocalVideoTrack(null); setScreenTrack(null);
      Object.keys(audioEls.current).forEach(id => {
        audioEls.current[id]?.remove(); delete audioEls.current[id];
      });
    });

    await room.connect(livekitUrl, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    setConnected(true);
    setIsMuted(false);
    refreshParticipants(room);
  }, [attachAudio, refreshParticipants]);

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
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
    if (!enabled) {
      // just turned on
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalVideoTrack(pub?.track || null);
    } else {
      setLocalVideoTrack(null);
    }
    setIsCameraOff(enabled);
    refreshParticipants(room);
  }, [refreshParticipants]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isScreenShareEnabled;
    await room.localParticipant.setScreenShareEnabled(!enabled);
    setIsScreenSharing(!enabled);
    refreshParticipants(room);
  }, [refreshParticipants]);

  useEffect(() => {
    return () => { roomRef.current?.disconnect(); };
  }, []);

  return {
    connect, disconnect, toggleMute, toggleCamera, toggleScreenShare,
    connected, isMuted, isCameraOff, isScreenSharing,
    speaking, liveParts, localVideoTrack, screenTrack,
  };
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
