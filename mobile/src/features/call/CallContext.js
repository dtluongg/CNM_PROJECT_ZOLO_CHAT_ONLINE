/**
 * CallContext.jsx
 * Context toàn cục quản lý trạng thái cuộc gọi audio/video 1-1 trên web.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useCallWebRTC as useWebRTC } from './hooks/useCallWebRTC';
import { getIceServers } from '../../utils/turnUtils';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:2026';

export const CALL_STATE = {
  IDLE:     'idle',
  CALLING:  'calling',
  INCOMING: 'incoming',
  ACTIVE:   'active',
};

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { token } = useAuth();

  const socketRef = useRef(null);

  const pendingCandidates      = useRef([]);
  const pendingLocalCandidates = useRef([]);

  const isFlushing    = useRef(false);
  const callTimerRef  = useRef(null);
  const notifTimerRef = useRef(null);

  const callStateRef = useRef(CALL_STATE.IDLE);
  const callIdRef    = useRef(null);
  const incomingRef  = useRef(null);

  const [callState,    _setCallState] = useState(CALL_STATE.IDLE);
  const [callType,      setCallType]  = useState(null);
  const [callId,       _setCallId]    = useState(null);
  const [remoteUser,    setRemoteUser] = useState(null);
  const [localStream,   setLocalStream]  = useState(null);
  const [remoteStream,  setRemoteStream] = useState(null);
  const [isMuted,       setIsMuted]      = useState(false);
  const [isCameraOff,   setIsCameraOff]  = useState(false);
  const [callDuration,  setCallDuration] = useState(0);
  const [incomingData, _setIncoming]     = useState(null);
  const [callError,     setCallError]    = useState(null);
  const [notification,  setNotification] = useState(null);

  // ── Ref-synced setters ────────────────────────────────────────────────────
  const setCallState = useCallback((value) => {
    callStateRef.current = value;
    _setCallState(value);
  }, []);

  const setCallId = useCallback((value) => {
    callIdRef.current = value;
    _setCallId(value);
  }, []);

  const setIncoming = useCallback((value) => {
    incomingRef.current = value;
    _setIncoming(value);
  }, []);

  // ── WebRTC hook ───────────────────────────────────────────────────────────
  const {
    pcRef,
    createPeer,
    getLocalStream,
    addLocalStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    setMuted,
    setCameraEnabled,
    cleanup: webrtcCleanup,
  } = useWebRTC({
    onIceCandidate: useCallback((candidate) => {
      const cid = callIdRef.current;
      if (cid && socketRef.current?.connected) {
        socketRef.current.emit('call:ice-candidate', { callId: cid, candidate });
      } else {
        pendingLocalCandidates.current.push(candidate);
        console.log('[ICE] queued local candidate:', pendingLocalCandidates.current.length);
      }
    }, []),

    onRemoteStream: useCallback((stream) => {
      console.log(
        '[WebRTC] onRemoteStream tracks:',
        stream.getTracks().map((t) => ({
          kind:       t.kind,
          enabled:    t.enabled,
          muted:      t.muted,
          readyState: t.readyState,
        })),
      );
      setRemoteStream(stream);
    }, []),
  });

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    setCallDuration(0);
  }, []);

  // ── ICE flush ────────────────────────────────────────────────────────────
  const flushRemoteCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;

    isFlushing.current = true;
    const candidates = [...pendingCandidates.current];
    pendingCandidates.current = [];
    await Promise.all(candidates.map((c) => addIceCandidate(c)));
    isFlushing.current = false;
  }, [addIceCandidate, pcRef]);

  const flushLocalCandidates = useCallback((cid) => {
    if (!cid || !socketRef.current?.connected) return;

    const pending = [...pendingLocalCandidates.current];
    pendingLocalCandidates.current = [];

    console.log('[ICE] flushing local candidates:', pending.length);
    pending.forEach((candidate) => {
      socketRef.current.emit('call:ice-candidate', { callId: cid, candidate });
    });
  }, []);

  // ── Notification ──────────────────────────────────────────────────────────
  const showNotification = useCallback((message, type = 'error') => {
    clearTimeout(notifTimerRef.current);
    setNotification({ message, type });
    notifTimerRef.current = setTimeout(() => setNotification(null), 4000);
  }, []);

  // ── Reset toàn bộ state ───────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    webrtcCleanup();
    stopTimer();
    clearTimeout(notifTimerRef.current);

    isFlushing.current = false;

    setCallState(CALL_STATE.IDLE);
    setCallType(null);
    setCallId(null);
    setRemoteUser(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIncoming(null);
    setCallError(null);

    pendingCandidates.current      = [];
    pendingLocalCandidates.current = [];
  }, [webrtcCleanup, stopTimer, setCallState, setCallId, setIncoming]);

  // ═════════════════════════════════════════════════════════════════════════
  //  initiateCall  –  Caller bắt đầu gọi
  // ═════════════════════════════════════════════════════════════════════════
  const initiateCall = useCallback(async (targetUser, type) => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;

    if (!socketRef.current?.connected) {
      setCallError('Không có kết nối socket');
      return;
    }

    // Đặt trạng thái CALLING ĐỒNG BỘ ngay lập tức (setCallState cập nhật
    // callStateRef.current ngay) để chặn việc gọi initiateCall lần 2 (double-
    // tap / re-render) khi đang chờ 'call:ring' round-trip — nếu không sẽ tạo
    // 2 PeerConnection và PC đầu bị đóng giữa chừng gây lỗi "closed".
    setCallError(null);
    setCallState(CALL_STATE.CALLING);
    setCallType(type);
    setRemoteUser(targetUser);

    // Phase 1: Ring ngay lập tức
    socketRef.current.emit('call:ring', { calleeId: targetUser._id, type }, async (res) => {
      if (res?.error) {
        showNotification(
          res.error.toLowerCase().includes('offline')
            ? `${targetUser.displayName || 'Người dùng'} đang không online`
            : res.error,
          'warning',
        );
        resetAll();
        return;
      }

      const cid = res.callId;
      setCallId(cid);

      // Phase 2: lấy ICE servers và media song song
      try {
        const [iceServers, stream] = await Promise.all([
          getIceServers(),
          getLocalStream(type),
        ]);
        createPeer(iceServers);
        setLocalStream(stream);
        addLocalStream(stream);
        const offer = await createOffer();
        socketRef.current.emit('call:offer', { callId: cid, offer });
        flushLocalCandidates(cid);
      } catch (err) {
        console.error('initiateCall phase2 error:', err);
        setCallError(err.message || 'Không thể khởi tạo cuộc gọi');
        socketRef.current?.emit('call:end', { callId: cid });
        resetAll();
      }
    });
  }, [
    token,
    createPeer,
    getLocalStream,
    addLocalStream,
    createOffer,
    resetAll,
    setCallId,
    setCallState,
    showNotification,
    flushLocalCandidates,
  ]);

  // ═════════════════════════════════════════════════════════════════════════
  //  answerCall  –  Callee chấp nhận cuộc gọi
  // ═════════════════════════════════════════════════════════════════════════
  const answerCall = useCallback(async () => {
    const data = incomingRef.current;
    if (!data) return;

    const { callId: cid, offer: immediateOffer, type, callerInfo } = data;
    setCallError(null);

    try {
      const [iceServers, stream] = await Promise.all([
        getIceServers(),
        getLocalStream(type),
      ]);
      createPeer(iceServers);
      setLocalStream(stream);
      addLocalStream(stream);
      setCallId(cid);

      if (immediateOffer) {
        // Flow cũ (call:initiate): offer có sẵn
        const answer = await createAnswer(immediateOffer);
        socketRef.current.emit('call:answer', { callId: cid, answer }, async (res) => {
          if (res?.error) { setCallError(res.error); resetAll(); return; }
          setCallState(CALL_STATE.ACTIVE);
          setCallType(type);
          setRemoteUser(callerInfo);
          startTimer();
          flushLocalCandidates(cid);
          await flushRemoteCandidates();
        });
      } else {
        // Flow mới (call:ring): báo accept, chờ offer qua call:offer event
        socketRef.current.emit('call:accept', { callId: cid }, async (res) => {
          if (res?.error) { setCallError(res.error); resetAll(); return; }
          setCallState(CALL_STATE.ACTIVE);
          setCallType(type);
          setRemoteUser(callerInfo);
          startTimer();
          // Offer sẽ đến qua socket event 'call:offer'
        });
      }
    } catch (err) {
      console.error('answerCall error:', err);
      setCallError(err.message || 'Không thể trả lời cuộc gọi');
      resetAll();
    }
  }, [
    token,
    createPeer,
    getLocalStream,
    addLocalStream,
    createAnswer,
    resetAll,
    setCallId,
    setCallState,
    startTimer,
    flushLocalCandidates,
    flushRemoteCandidates,
  ]);

  // ═════════════════════════════════════════════════════════════════════════
  //  rejectCall / endCall / toggles
  // ═════════════════════════════════════════════════════════════════════════
  const rejectCall = useCallback(() => {
    const data = incomingRef.current;
    if (data?.callId && socketRef.current?.connected) {
      socketRef.current.emit('call:reject', { callId: data.callId });
    }
    resetAll();
  }, [resetAll]);

  const endCall = useCallback(() => {
    const cid = callIdRef.current;
    if (cid && socketRef.current?.connected) {
      socketRef.current.emit('call:end', { callId: cid }, () => resetAll());
    } else {
      resetAll();
    }
  }, [resetAll]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, [setMuted]);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev;
      setCameraEnabled(!next);
      return next;
    });
  }, [setCameraEnabled]);

  const formatDuration = useCallback((secs) => {
    const mm = Math.floor(secs / 60).toString().padStart(2, '0');
    const ss = (secs % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  //  Socket event listeners
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!token) return;
    const accessToken = token;

    const socket = io(SOCKET_URL, {
      auth:                 { token: accessToken },
      reconnection:         true,
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] connected:', SOCKET_URL, socket.id);
    });

    // Có cuộc gọi đến
    socket.on('call:incoming', (data) => {
      if (callStateRef.current !== CALL_STATE.IDLE) {
        // Đang bận → từ chối tự động
        socket.emit('call:reject', { callId: data.callId });
        return;
      }
      setIncoming(data);
      setCallType(data.type);
      setCallState(CALL_STATE.INCOMING);
    });

    // Flow mới: caller nhận khi callee accept (UI transition, WebRTC not ready yet)
    socket.on('call:accepted', ({ callId: cid }) => {
      setCallId(cid);
      setCallState(CALL_STATE.ACTIVE);
      startTimer();
      // Note: call:answered will arrive later with answer to complete WebRTC
    });

    // Flow mới: callee nhận offer sau khi accept
    socket.on('call:offer', async ({ callId: cid, offer }) => {
      try {
        const answer = await createAnswer(offer);
        socket.emit('call:answer', { callId: cid, answer }, async (res) => {
          if (res?.error) { console.error('call:answer err', res.error); resetAll(); return; }
          flushLocalCandidates(cid);
          await flushRemoteCandidates();
        });
      } catch (err) {
        console.error('call:offer handler error:', err);
        resetAll();
      }
    });

    // Caller nhận answer → hoàn tất WebRTC
    socket.on('call:answered', async ({ callId: cid, answer }) => {
      try {
        await setRemoteAnswer(answer);
        // Nếu chưa active (flow cũ không có call:accepted), set active
        setCallId(cid);
        setCallState(CALL_STATE.ACTIVE);
        flushLocalCandidates(cid);
        await flushRemoteCandidates();
      } catch (err) {
        console.error('call:answered error:', err);
        resetAll();
      }
    });

    socket.on('call:rejected', () => resetAll());
    socket.on('call:ended',    () => resetAll());
    socket.on('call:timeout',  () => resetAll());

    // Nhận ICE candidate từ peer
    socket.on('call:ice-candidate', ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc || !candidate) return;

      if (pc.remoteDescription) {
        // buffer vào mảng chung rồi flush — tránh race condition khi nhiều event đến cùng lúc
        pendingCandidates.current.push(candidate);
        if (!isFlushing.current) flushRemoteCandidates();
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    token,
    setIncoming,
    setCallState,
    setRemoteAnswer,
    setCallId,
    startTimer,
    flushLocalCandidates,
    flushRemoteCandidates,
    addIceCandidate,
    createAnswer,
    resetAll,
    pcRef,
  ]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stopTimer();
      webrtcCleanup();
      clearTimeout(notifTimerRef.current);
    };
  }, [stopTimer, webrtcCleanup]);

  // ═════════════════════════════════════════════════════════════════════════
  //  Provider
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        callId,
        remoteUser,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        callDuration,
        incomingData,
        callError,
        notification,
        formatDuration,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall phải được dùng bên trong CallProvider');
  return ctx;
};