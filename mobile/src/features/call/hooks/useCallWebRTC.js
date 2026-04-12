/**
 * useCallWebRTC – WebRTC wrapper đa nền tảng (React Native / Expo).
 *
 * Hỗ trợ:
 *   - Expo Web : browser native RTCPeerConnection
 *   - iOS/Android dev build : react-native-webrtc
 *   - Expo Go : fallback graceful (báo lỗi rõ ràng, không crash)
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// ── Phát hiện Expo Go ────────────────────────────────────────────────────────
let _isExpoGo = false;
try {
  // expo-constants có sẵn trong mọi dự án Expo
  const Constants = require('expo-constants').default;
  _isExpoGo = Constants?.appOwnership === 'expo';
} catch {
  _isExpoGo = false;
}

export const IS_EXPO_GO = _isExpoGo;

// ── Import WebRTC theo nền tảng ──────────────────────────────────────────────
let RN_RTC_AVAILABLE = false;
let RTCPeerConnection_    = null;
let RTCSessionDescription_ = null;
let RTCIceCandidate_      = null;
let mediaDevices_         = null;
let RTCView_              = null;

if (Platform.OS === 'web') {
  // Trình duyệt: dùng browser native WebRTC
  RTCPeerConnection_     = typeof RTCPeerConnection    !== 'undefined' ? RTCPeerConnection    : null;
  RTCSessionDescription_ = typeof RTCSessionDescription !== 'undefined' ? RTCSessionDescription : null;
  RTCIceCandidate_       = typeof RTCIceCandidate      !== 'undefined' ? RTCIceCandidate      : null;
  mediaDevices_          = typeof navigator            !== 'undefined' ? navigator.mediaDevices : null;
  RN_RTC_AVAILABLE       = !!RTCPeerConnection_;
} else if (!_isExpoGo) {
  // iOS/Android với Expo dev build hoặc bare workflow
  try {
    const rtc = require('react-native-webrtc');
    RTCPeerConnection_    = rtc.RTCPeerConnection;
    RTCSessionDescription_ = rtc.RTCSessionDescription;
    RTCIceCandidate_      = rtc.RTCIceCandidate;
    mediaDevices_         = rtc.mediaDevices;
    RTCView_              = rtc.RTCView;
    RN_RTC_AVAILABLE      = true;
  } catch {
    RN_RTC_AVAILABLE = false;
  }
}
// Expo Go: RN_RTC_AVAILABLE giữ false → fallback ở CalllContext

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
    if (!RN_RTC_AVAILABLE || !RTCPeerConnection_) throw new Error('WebRTC_UNAVAILABLE');
    pcRef.current?.close();
    const pc = new RTCPeerConnection_(ICE_SERVERS);
    pc.onicecandidate = (e) => { if (e.candidate) onIceCandidate(e.candidate); };
    pc.ontrack = (e) => { if (e.streams?.[0]) onRemoteStream(e.streams[0]); };
    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onRemoteStream]);

  const getLocalStream = useCallback(async (callType) => {
    if (!RN_RTC_AVAILABLE || !mediaDevices_) throw new Error('WebRTC_UNAVAILABLE');
    const stream = await mediaDevices_.getUserMedia({
      audio: true,
      video: callType === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
    });
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
    try { await pc.addIceCandidate(new RTCIceCandidate_(candidate)); } catch {}
  }, []);

  const setMuted        = useCallback((m) => localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !m; }), []);
  const setCameraEnabled = useCallback((e) => localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = e; }), []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  return { pcRef, localStreamRef, createPeer, getLocalStream, addLocalStream, createOffer, createAnswer, setRemoteAnswer, addIceCandidate, setMuted, setCameraEnabled, cleanup };
}
