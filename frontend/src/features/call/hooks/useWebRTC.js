import { useCallback, useRef } from 'react';
import { getCallStream } from '../../../utils/mediaUtils';

export function useWebRTC({ onIceCandidate, onRemoteStream }) {
  const pcRef              = useRef(null);
  const localStreamRef     = useRef(null);
  // ✅ SỬA LỖI 1: chuyển vào trong hook
  const pendingCandidatesRef = useRef([]);

  const createPeer = useCallback((iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]) => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection({ iceServers }); // ✅ dùng tham số

    pc.onicecandidate = (e) => { if (e.candidate) onIceCandidate(e.candidate); };
    pc.ontrack = (e) => {
      // Tạo MediaStream mới mỗi lần ontrack để React luôn nhận reference mới.
      // Cần thiết vì audio và video track share cùng e.streams[0] object —
      // nếu pass thẳng, React bail out khi reference không đổi (state giống cũ).
      const src = e.streams?.[0];
      onRemoteStream(src ? new MediaStream(src.getTracks()) : new MediaStream([e.track]));
    };
    pc.oniceconnectionstatechange = () => console.log('[ICE]', pc.iceConnectionState);
    pc.onicegatheringstatechange  = () => console.log('[Gather]', pc.iceGatheringState);
    pc.onconnectionstatechange    = () => console.log('[Conn]', pc.connectionState);

    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onRemoteStream]);

  const getLocalStream = useCallback(async (callType) => {
    // ✅ SỬA LỖI 3: bắt lỗi permission rõ ràng
    try {
      const stream = await getCallStream(callType);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Bạn cần cấp quyền truy cập microphone/camera trong trình duyệt.');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('Không tìm thấy microphone hoặc camera. Kiểm tra lại thiết bị.');
      }
      throw err;
    }
  }, []);

  const addLocalStream = useCallback((stream) => {
    const pc = pcRef.current;
    if (!pc || !stream) return;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  // ✅ SỬA LỖI 2: khai báo flushPendingCandidates TRƯỚC khi dùng
  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingCandidatesRef.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidatesRef.current = [];
  }, []);

  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }, []);

  // ✅ flushPendingCandidates đã được khai báo ở trên
  const createAnswer = useCallback(async (offer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }, [flushPendingCandidates]);

  const setRemoteAnswer = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No RTCPeerConnection');
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    await flushPendingCandidates();
  }, [flushPendingCandidates]);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (!pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('addIceCandidate error:', err.message);
    }
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
    pendingCandidatesRef.current = [];
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
    flushPendingCandidates,
  };
}