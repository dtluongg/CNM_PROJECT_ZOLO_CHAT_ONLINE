/**
 * useWebRTC – quản lý RTCPeerConnection cho trình duyệt.
 * Backend chỉ là signaling server, media đi P2P qua WebRTC.
 *
 * Sử dụng:
 *   const webrtc = useWebRTC({ onIceCandidate, onRemoteStream });
 */

import { useCallback, useRef } from 'react';
import { getCallStream } from '../../../utils/mediaUtils';

// STUN: giúp tìm địa chỉ public IP
// TURN: relay media khi 2 bên sau NAT khác nhau (bắt buộc để gọi được từ các mạng khác nhau)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // OpenRelay TURN miễn phí (https://www.metered.ca/tools/openrelay)
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

/**
 * @param {{ onIceCandidate: (candidate) => void, onRemoteStream: (stream) => void }} opts
 */
export function useWebRTC({ onIceCandidate, onRemoteStream }) {
  const pcRef           = useRef(null);
  const localStreamRef  = useRef(null);

  // ── Tạo RTCPeerConnection mới ──────────────────────────────────────────────
  const createPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(e.candidate);
    };

    pc.ontrack = (e) => {
      console.log('[WebRTC] ontrack:', e.track.kind, 'streams:', e.streams.length);
      if (e.streams?.[0]) {
        onRemoteStream(e.streams[0]);
      } else {
        const fallback = new MediaStream([e.track]);
        onRemoteStream(fallback);
      }
    };

    // ← TẤT CẢ handlers phải nằm trong đây
    pc.oniceconnectionstatechange = () => {
      console.log('[ICE state]', pc.iceConnectionState);
    };

    pc.onicegatheringstatechange = () => {
      console.log('[ICE gathering]', pc.iceGatheringState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[Connection state]', pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onRemoteStream]);


  // ── Lấy luồng media từ thiết bị người dùng ────────────────────────────────
  const getLocalStream = useCallback(async (callType) => {
    const stream = await getCallStream(callType); // throws with friendly message on HTTP
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ── Thêm các track của stream vào peer connection ─────────────────────────
  const addLocalStream = useCallback((stream) => {
    const pc = pcRef.current;
    if (!pc || !stream) return;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  // ── Tạo SDP offer (caller) ─────────────────────────────────────────────────
  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }, []);

  // ── Nhận offer, tạo answer (callee) ───────────────────────────────────────
  const createAnswer = useCallback(async (offer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }, []);

  // ── Nhận answer từ callee (caller gọi hàm này) ────────────────────────────
  const setRemoteAnswer = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  // ── Thêm ICE candidate nhận được từ peer ──────────────────────────────────
  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('addIceCandidate error (có thể bỏ qua):', err.message);
    }
  }, []);

  // ── Tắt/bật mic ───────────────────────────────────────────────────────────
  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, []);

  // ── Tắt/bật camera ────────────────────────────────────────────────────────
  const setCameraEnabled = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = enabled; });
  }, []);

  // ── Dọn dẹp khi kết thúc cuộc gọi ────────────────────────────────────────
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