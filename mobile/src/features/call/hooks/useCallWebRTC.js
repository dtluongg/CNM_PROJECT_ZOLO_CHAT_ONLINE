/**
 * useCallWebRTC – WebRTC wrapper đa nền tảng cho React Native / Expo.
 *
 * Hỗ trợ:
 *   - Expo Web (trình duyệt): dùng browser native RTCPeerConnection
 *   - iOS / Android (Expo dev build): dùng react-native-webrtc
 *   - Expo Go: báo cáo lỗi rõ ràng (react-native-webrtc cần dev build)
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// ── Import WebRTC theo nền tảng ─────────────────────────────────────────────
let RN_RTC_AVAILABLE = false;
let RTCPeerConnection_   = null;
let RTCSessionDescription_ = null;
let RTCIceCandidate_     = null;
let mediaDevices_        = null;
let RTCView_             = null;

if (Platform.OS === 'web') {
  // Trình duyệt: dùng native browser API
  RTCPeerConnection_    = global.RTCPeerConnection;
  RTCSessionDescription_ = global.RTCSessionDescription;
  RTCIceCandidate_      = global.RTCIceCandidate;
  mediaDevices_         = navigator.mediaDevices;
  RN_RTC_AVAILABLE      = true;
} else {
  try {
    const rtc = require('react-native-webrtc');
    RTCPeerConnection_    = rtc.RTCPeerConnection;
    RTCSessionDescription_ = rtc.RTCSessionDescription;
    RTCIceCandidate_      = rtc.RTCIceCandidate;
    mediaDevices_         = rtc.mediaDevices;
    RTCView_              = rtc.RTCView;
    RN_RTC_AVAILABLE      = true;
  } catch {
    // Expo Go không hỗ trợ native module
    RN_RTC_AVAILABLE = false;
  }
}

export { RTCView_ as RTCView, RN_RTC_AVAILABLE };

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useCallWebRTC({ onIceCandidate, onRemoteStream }) {
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);

  const createPeer = useCallback(() => {
    if (!RN_RTC_AVAILABLE) throw new Error('WebRTC_UNAVAILABLE');
    pcRef.current?.close();
    const pc = new RTCPeerConnection_(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(e.candidate);
    };
    pc.ontrack = (e) => {
      console.log('[Mobile ontrack]', e.track.kind, 'streams:', e.streams.length);
      if (e.streams?.[0]) {
        onRemoteStream(e.streams[0]);
      } else {
        const fallback = new MediaStream([e.track]);
        onRemoteStream(fallback);
      }
    };
    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onRemoteStream]);

  const getLocalStream = useCallback(async (callType) => {
    if (!RN_RTC_AVAILABLE) throw new Error('WebRTC_UNAVAILABLE');
    const constraints = {
      audio: true,
      video: callType === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
    };
    const stream = await mediaDevices_.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const addLocalStream = useCallback((stream) => {
    const pc = pcRef.current;
    if (!pc || !stream) return;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }, []);

  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(new RTCSessionDescription_(offer));
    return offer;
  }, []);

  const createAnswer = useCallback(async (offer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    await pc.setRemoteDescription(new RTCSessionDescription_(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(new RTCSessionDescription_(answer));
    return answer;
  }, []);

  const setRemoteAnswer = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription_(answer));
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !RTCIceCandidate_) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate_(candidate));
    } catch {}
  }, []);

  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, []);

  const setCameraEnabled = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = enabled; });
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  return {
    pcRef,
    localStreamRef,
    createPeer,
    getLocalStream,
    addLocalStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    setMuted,
    setCameraEnabled,
    cleanup,
  };
}
