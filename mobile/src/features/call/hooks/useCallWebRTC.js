/**
 * useCallWebRTC – WebRTC wrapper cho 1-on-1 call trên React Native / Web.
 * Dùng globals được set bởi @livekit/react-native registerGlobals() trong App.js.
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

let RN_RTC_AVAILABLE = false;
let RTCPeerConnection_ = null;
let mediaDevices_ = null;
let RTCView_ = null;
let MediaStream_ = null;

if (Platform.OS === 'web') {
  RTCPeerConnection_ = global.RTCPeerConnection;
  mediaDevices_      = navigator.mediaDevices;
  MediaStream_       = global.MediaStream;
  RN_RTC_AVAILABLE   = true;
} else {
  try {
    RTCPeerConnection_ = global.RTCPeerConnection;
    mediaDevices_      = global.navigator?.mediaDevices;
    MediaStream_       = global.MediaStream;

    // RTCView từ @livekit/react-native-webrtc (API giống react-native-webrtc)
    try {
      RTCView_ = require('@livekit/react-native-webrtc').RTCView;
    } catch {
      RTCView_ = require('react-native-webrtc').RTCView;
    }

    RN_RTC_AVAILABLE = !!RTCPeerConnection_;
  } catch {
    RN_RTC_AVAILABLE = false;
  }
}

export { RTCView_ as RTCView, RN_RTC_AVAILABLE };

export function useCallWebRTC({ onIceCandidate, onRemoteStream }) {
  const pcRef           = useRef(null);
  const localStreamRef  = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const createPeer = useCallback((iceServers = []) => {
    if (!RN_RTC_AVAILABLE) throw new Error('WebRTC_UNAVAILABLE');

    pcRef.current?.close();
    pcRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];

    const pc = new RTCPeerConnection_({ iceServers });

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(e.candidate);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[ICE]', pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log('[Conn]', pc.connectionState);
    };

    pc.ontrack = (e) => {
      console.log('[ontrack]', e.track?.kind, 'streams:', e.streams?.length);

      const stream = e.streams?.[0];
      if (stream) {
        // Bọc trong MediaStream mới để React nhận reference mới
        const newStream = MediaStream_ ? new MediaStream_(stream.getTracks()) : stream;
        onRemoteStream(newStream);
        return;
      }

      // Fallback: gom track vào remoteStream thủ công
      if (!remoteStreamRef.current && MediaStream_) {
        remoteStreamRef.current = new MediaStream_();
      }
      if (remoteStreamRef.current && e.track) {
        const exists = remoteStreamRef.current.getTracks().some(t => t.id === e.track.id);
        if (!exists) remoteStreamRef.current.addTrack(e.track);
        onRemoteStream(remoteStreamRef.current);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onRemoteStream]);

  const getLocalStream = useCallback(async (callType) => {
    if (!RN_RTC_AVAILABLE) throw new Error('WebRTC_UNAVAILABLE');

    const constraints = {
      audio: true,
      video: callType === 'video'
        ? { facingMode: 'user', width: 640, height: 480 }
        : false,
    };

    const stream = await mediaDevices_.getUserMedia(constraints);
    stream.getAudioTracks().forEach(t => { t.enabled = true; });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const addLocalStream = useCallback((stream) => {
    const pc = pcRef.current;
    if (!pc || !stream) return;
    stream.getTracks().forEach(track => {
      track.enabled = true;
      const alreadyAdded = pc.getSenders?.().some(s => s.track?.id === track.id);
      if (!alreadyAdded) pc.addTrack(track, stream);
    });
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const candidates = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    await Promise.all(candidates.map((c) => pc.addIceCandidate(c).catch(() => {})));
  }, []);

  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }, []);

  const createAnswer = useCallback(async (offer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    await pc.setRemoteDescription(offer);
    // flush candidates và createAnswer song song — cả hai chỉ cần remoteDescription đã set
    const [answer] = await Promise.all([
      pc.createAnswer(),
      flushPendingCandidates(),
    ]);
    await pc.setLocalDescription(answer);
    return answer;
  }, [flushPendingCandidates]);

  const setRemoteAnswer = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(answer);
    await flushPendingCandidates();
  }, [flushPendingCandidates]);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !candidate) return;
    if (!pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn('[addIceCandidate]', err.message);
    }
  }, []);

  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, []);

  const setCameraEnabled = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  return {
    pcRef, localStreamRef,
    createPeer, getLocalStream, addLocalStream,
    createOffer, createAnswer, setRemoteAnswer,
    addIceCandidate, setMuted, setCameraEnabled, cleanup,
    flushPendingCandidates,
  };
}