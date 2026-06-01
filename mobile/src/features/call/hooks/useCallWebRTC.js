/**
 * useCallWebRTC – WebRTC wrapper đa nền tảng cho React Native / Expo.
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

let RN_RTC_AVAILABLE = false;
let RTCPeerConnection_ = null;
let RTCSessionDescription_ = null;
let RTCIceCandidate_ = null;
let mediaDevices_ = null;
let RTCView_ = null;
let MediaStream_ = null;

if (Platform.OS === 'web') {
  RTCPeerConnection_ = global.RTCPeerConnection;
  RTCSessionDescription_ = global.RTCSessionDescription;
  RTCIceCandidate_ = global.RTCIceCandidate;
  mediaDevices_ = navigator.mediaDevices;
  MediaStream_ = global.MediaStream;
  RN_RTC_AVAILABLE = true;
} else {
  try {
    const rtc = require('react-native-webrtc');
    RTCPeerConnection_ = rtc.RTCPeerConnection;
    RTCSessionDescription_ = rtc.RTCSessionDescription;
    RTCIceCandidate_ = rtc.RTCIceCandidate;
    mediaDevices_ = rtc.mediaDevices;
    RTCView_ = rtc.RTCView;
    MediaStream_ = rtc.MediaStream;
    RN_RTC_AVAILABLE = true;
  } catch {
    RN_RTC_AVAILABLE = false;
  }
}

export { RTCView_ as RTCView, RN_RTC_AVAILABLE };

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

function getSdpMediaSection(sdp, media) {
  return sdp?.split(`m=${media}`)?.[1]?.split('\nm=')?.[0] || '';
}

export function useCallWebRTC({ onIceCandidate, onRemoteStream }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const createPeer = useCallback(() => {
    if (!RN_RTC_AVAILABLE) throw new Error('WebRTC_UNAVAILABLE');

    pcRef.current?.close();
    pcRef.current = null;
    remoteStreamRef.current = null;

    const pc = new RTCPeerConnection_(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        onIceCandidate(e.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Mobile ICE state]', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[Mobile connection state]', pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[Mobile signaling state]', pc.signalingState);
    };

    pc.ontrack = (e) => {
      console.log('[Mobile ontrack]', {
        kind: e.track?.kind,
        enabled: e.track?.enabled,
        muted: e.track?.muted,
        readyState: e.track?.readyState,
        streams: e.streams?.length || 0,
      });

      const stream = e.streams?.[0];

      if (stream) {
        onRemoteStream(stream);
        return;
      }

      if (!remoteStreamRef.current && MediaStream_) {
        remoteStreamRef.current = new MediaStream_();
      }

      if (remoteStreamRef.current?.addTrack && e.track) {
        const exists = remoteStreamRef.current
          .getTracks()
          .some((track) => track.id === e.track.id);

        if (!exists) {
          remoteStreamRef.current.addTrack(e.track);
        }

        onRemoteStream(remoteStreamRef.current);
      } else {
        console.warn('[Mobile ontrack] no usable remote stream');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onRemoteStream]);

  const getLocalStream = useCallback(async (callType) => {
    if (!RN_RTC_AVAILABLE) throw new Error('WebRTC_UNAVAILABLE');

    const constraints = {
      audio: true,
      video:
        callType === 'video'
          ? {
              facingMode: 'user',
              width: 640,
              height: 480,
            }
          : false,
    };

    const stream = await mediaDevices_.getUserMedia(constraints);

    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    localStreamRef.current = stream;

    console.log(
      '[Mobile getLocalStream] tracks:',
      stream.getTracks().map((track) => ({
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        id: track.id,
      })),
    );

    return stream;
  }, []);

  const addLocalStream = useCallback((stream) => {
    const pc = pcRef.current;
    if (!pc || !stream) return;

    const tracks = stream.getTracks();

    console.log('[Mobile addLocalStream] signalingState:', pc.signalingState);
    console.log(
      '[Mobile addLocalStream] tracks before add:',
      tracks.map((track) => ({
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        id: track.id,
      })),
    );

    tracks.forEach((track) => {
      track.enabled = true;

      const alreadyAdded = pc.getSenders?.().some((sender) => {
        return sender.track?.id === track.id;
      });

      if (alreadyAdded) {
        console.log('[Mobile addLocalStream] already added:', track.kind);
        return;
      }

      pc.addTrack(track, stream);
      console.log('[Mobile addLocalStream] addTrack:', track.kind);
    });

    const senders = pc.getSenders?.() ?? [];

    console.log(
      '[Mobile addLocalStream] senders after add:',
      senders.map((sender) => ({
        kind: sender.track?.kind,
        enabled: sender.track?.enabled,
        muted: sender.track?.muted,
        readyState: sender.track?.readyState,
      })),
    );
  }, []);

  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');

    const senders = pc.getSenders?.() ?? [];

    console.log(
      '[Mobile createOffer] senders:',
      senders.map((sender) => ({
        kind: sender.track?.kind,
        enabled: sender.track?.enabled,
        muted: sender.track?.muted,
        readyState: sender.track?.readyState,
      })),
    );

    const offer = await pc.createOffer();
    await pc.setLocalDescription(new RTCSessionDescription_(offer));

    console.log('[Mobile createOffer] audio section:', getSdpMediaSection(offer.sdp, 'audio'));
    console.log('[Mobile createOffer] video section:', getSdpMediaSection(offer.sdp, 'video'));

    return offer;
  }, []);

  const createAnswer = useCallback(async (offer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');

    await pc.setRemoteDescription(new RTCSessionDescription_(offer));

    const senders = pc.getSenders?.() ?? [];

    console.log(
      '[Mobile createAnswer] senders before answer:',
      senders.map((sender) => ({
        kind: sender.track?.kind,
        enabled: sender.track?.enabled,
        muted: sender.track?.muted,
        readyState: sender.track?.readyState,
      })),
    );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(new RTCSessionDescription_(answer));

    console.log('[Mobile createAnswer] audio section:', getSdpMediaSection(answer.sdp, 'audio'));
    console.log('[Mobile createAnswer] video section:', getSdpMediaSection(answer.sdp, 'video'));

    return answer;
  }, []);

  const setRemoteAnswer = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription_(answer));

    const receivers = pc.getReceivers?.() ?? [];

    console.log(
      '[Mobile setRemoteAnswer] receivers:',
      receivers.map((receiver) => ({
        kind: receiver.track?.kind,
        enabled: receiver.track?.enabled,
        muted: receiver.track?.muted,
        readyState: receiver.track?.readyState,
      })),
    );
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !RTCIceCandidate_ || !candidate) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate_(candidate));
    } catch (err) {
      console.warn('[Mobile addIceCandidate] error:', err.message);
    }
  }, []);

  const logAudioStats = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.getStats) return;

    try {
      const stats = await pc.getStats();

      stats.forEach((report) => {
        const isAudio =
          report.kind === 'audio' ||
          report.mediaType === 'audio' ||
          report.id?.toLowerCase?.().includes('audio');

        if (report.type === 'outbound-rtp' && isAudio) {
          console.log('[Mobile audio outbound]', {
            id: report.id,
            packetsSent: report.packetsSent,
            bytesSent: report.bytesSent,
          });
        }

        if (report.type === 'inbound-rtp' && isAudio) {
          console.log('[Mobile audio inbound]', {
            id: report.id,
            packetsReceived: report.packetsReceived,
            bytesReceived: report.bytesReceived,
            audioLevel: report.audioLevel,
          });
        }

        if ((report.type === 'media-source' || report.type === 'track') && isAudio) {
          console.log('[Mobile audio source/track]', {
            id: report.id,
            type: report.type,
            audioLevel: report.audioLevel,
            totalAudioEnergy: report.totalAudioEnergy,
          });
        }

        if (
          report.type === 'candidate-pair' &&
          (report.state === 'succeeded' || report.nominated)
        ) {
          console.log('[Mobile selected candidate pair]', {
            state: report.state,
            nominated: report.nominated,
            bytesSent: report.bytesSent,
            bytesReceived: report.bytesReceived,
            currentRoundTripTime: report.currentRoundTripTime,
          });
        }
      });
    } catch (err) {
      console.warn('[Mobile logAudioStats] error:', err.message);
    }
  }, []);

  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  const setCameraEnabled = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;
    remoteStreamRef.current = null;
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
    logAudioStats,
  };
}