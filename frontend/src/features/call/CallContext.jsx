/**
 * CallContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Context toàn cục quản lý trạng thái cuộc gọi audio/video (1-1).
 *
 * Luồng:
 *   Caller  → initiateCall()  → socket call:initiate  → callee nhận call:incoming
 *   Callee  → answerCall()    → socket call:answer     → caller nhận call:answered
 *   Bất kỳ → endCall()        → socket call:end        → cả hai nhận call:ended
 *
 * Trạng thái:
 *   idle | calling | incoming | active
 * ─────────────────────────────────────────────────────────────────────────────
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
import { useWebRTC } from './hooks/useWebRTC';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';

export const CALL_STATE = {
  IDLE:     'idle',
  CALLING:  'calling',   // Đang ringing, chờ callee trả lời
  INCOMING: 'incoming',  // Nhận cuộc gọi đến
  ACTIVE:   'active',    // Đang trong cuộc gọi
};

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { token } = useAuth();

  // ── Refs cho socket & pending ICE candidates ─────────────────────────────
  const socketRef           = useRef(null);
  const pendingCandidates   = useRef([]);
  const callTimerRef        = useRef(null);

  // ── Refs mirror state (tránh stale closure trong socket handlers) ─────────
  const callStateRef   = useRef(CALL_STATE.IDLE);
  const callIdRef      = useRef(null);
  const incomingRef    = useRef(null);

  // ── React state (dùng để re-render) ──────────────────────────────────────
  const [callState,    _setCallState]    = useState(CALL_STATE.IDLE);
  const [callType,     setCallType]      = useState(null);
  const [callId,       _setCallId]       = useState(null);
  const [remoteUser,   setRemoteUser]    = useState(null);
  const [localStream,  setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream]  = useState(null);
  const [isMuted,      setIsMuted]       = useState(false);
  const [isCameraOff,  setIsCameraOff]   = useState(false);
  const [callDuration,   setCallDuration]   = useState(0);
  const [incomingData,   _setIncoming]      = useState(null);
  const [callError,      setCallError]      = useState(null);
  // notification: tách riêng, KHÔNG bị clearAll xoá → dùng hiển thị toast
  const [notification,   setNotification]   = useState(null); // { message, type }
  const notifTimerRef = useRef(null);

  // ── Setters đồng bộ ref + state ──────────────────────────────────────────
  const setCallState = useCallback((v) => { callStateRef.current = v; _setCallState(v); }, []);
  const setCallId    = useCallback((v) => { callIdRef.current    = v; _setCallId(v);    }, []);
  const setIncoming  = useCallback((v) => { incomingRef.current  = v; _setIncoming(v);  }, []);

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
      }
    }, []),
    onRemoteStream: useCallback((stream) => setRemoteStream(stream), []),
  });

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    setCallDuration(0);
  }, []);

  // ── Flush ICE candidates khi remote description đã set ───────────────────
  const flushCandidates = useCallback(async () => {
    const queue = [...pendingCandidates.current];
    pendingCandidates.current = [];
    for (const c of queue) {
      await addIceCandidate(c);
    }
  }, [addIceCandidate]);

  // ── Hiển thị toast thông báo (độc lập với callState) ────────────────────
  const showNotification = useCallback((message, type = 'error') => {
    clearTimeout(notifTimerRef.current);
    setNotification({ message, type });
    notifTimerRef.current = setTimeout(() => setNotification(null), 4000);
  }, []);

  // ── Reset toàn bộ ─────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    webrtcCleanup();
    stopTimer();
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
    pendingCandidates.current = [];
  }, [webrtcCleanup, stopTimer, setCallState, setCallId, setIncoming]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  API công khai
  // ═══════════════════════════════════════════════════════════════════════════

  /** Bắt đầu gọi đến targetUser ({ _id, displayName, avatar }) */
  const initiateCall = useCallback(async (targetUser, type) => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;
    if (!socketRef.current?.connected) {
      setCallError('Không có kết nối socket');
      return;
    }
    setCallError(null);
    try {
      const pc     = createPeer();
      const stream = await getLocalStream(type);
      setLocalStream(stream);
      addLocalStream(stream);
      const offer  = await createOffer();

      socketRef.current.emit(
        'call:initiate',
        { calleeId: targetUser._id, type, offer },
        (res) => {
          if (res?.error) {
            // Hiển thị thông báo trước khi reset (resetAll xoá callError)
            const isOffline = res.error.toLowerCase().includes('offline');
            showNotification(
              isOffline
                ? `${targetUser.displayName || 'Người dùng'} đang không online`
                : res.error,
              'warning',
            );
            resetAll();
            return;
          }
          setCallId(res.callId);
          setCallState(CALL_STATE.CALLING);
          setCallType(type);
          setRemoteUser(targetUser);
        },
      );
    } catch (err) {
      console.error('initiateCall error:', err);
      setCallError(err.message || 'Không thể khởi tạo cuộc gọi');
      resetAll();
    }
  }, [createPeer, getLocalStream, addLocalStream, createOffer, resetAll, setCallId, setCallState]);

  /** Callee chấp nhận cuộc gọi đến */
  const answerCall = useCallback(async () => {
    const data = incomingRef.current;
    if (!data) return;
    const { callId: cid, offer, type, callerInfo } = data;
    setCallError(null);
    try {
      const pc     = createPeer();
      const stream = await getLocalStream(type);
      setLocalStream(stream);
      addLocalStream(stream);
      const answer = await createAnswer(offer);

      socketRef.current.emit('call:answer', { callId: cid, answer }, async (res) => {
        if (res?.error) {
          setCallError(res.error);
          resetAll();
          return;
        }
        setCallId(cid);
        setCallState(CALL_STATE.ACTIVE);
        setCallType(type);
        setRemoteUser(callerInfo);
        startTimer();
        await flushCandidates();
      });
    } catch (err) {
      console.error('answerCall error:', err);
      setCallError(err.message || 'Không thể trả lời cuộc gọi');
      resetAll();
    }
  }, [createPeer, getLocalStream, addLocalStream, createAnswer, resetAll,
      setCallId, setCallState, startTimer, flushCandidates]);

  /** Từ chối cuộc gọi đến */
  const rejectCall = useCallback(() => {
    const data = incomingRef.current;
    if (data?.callId && socketRef.current?.connected) {
      socketRef.current.emit('call:reject', { callId: data.callId });
    }
    resetAll();
  }, [resetAll]);

  /** Kết thúc cuộc gọi (bất kỳ bên nào) */
  const endCall = useCallback(() => {
    const cid = callIdRef.current;
    if (cid && socketRef.current?.connected) {
      socketRef.current.emit('call:end', { callId: cid });
    }
    resetAll();
  }, [resetAll]);

  /** Bật/tắt micro */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, [setMuted]);

  /** Bật/tắt camera (chỉ dùng cho video call) */
  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev;
      setCameraEnabled(!next);
      return next;
    });
  }, [setCameraEnabled]);

  /** Định dạng thời gian cuộc gọi: "MM:SS" */
  const formatDuration = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  //  Socket setup
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const accessToken = token || localStorage.getItem('accessToken');
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2_000,
    });
    socketRef.current = socket;

    // ── Cuộc gọi đến ─────────────────────────────────────────────────────
    socket.on('call:incoming', (data) => {
      if (callStateRef.current !== CALL_STATE.IDLE) {
        // Đang bận → tự động từ chối
        socket.emit('call:reject', { callId: data.callId });
        return;
      }
      setIncoming(data);
      setCallType(data.type);
      setCallState(CALL_STATE.INCOMING);
    });

    // ── Callee đã trả lời ─────────────────────────────────────────────────
    socket.on('call:answered', async ({ callId: cid, answer }) => {
      try {
        await setRemoteAnswer(answer);
        setCallId(cid);
        setCallState(CALL_STATE.ACTIVE);
        startTimer();
        await flushCandidates();
      } catch (err) {
        console.error('call:answered error:', err);
        resetAll();
      }
    });

    // ── Cuộc gọi bị từ chối / kết thúc / timeout ─────────────────────────
    socket.on('call:rejected', () => resetAll());
    socket.on('call:ended',    () => resetAll());
    socket.on('call:timeout',  () => resetAll());

    // ── Relay ICE candidates ───────────────────────────────────────────────
    socket.on('call:ice-candidate', ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        addIceCandidate(candidate);
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <CallContext.Provider value={{
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
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall phải được dùng bên trong CallProvider');
  return ctx;
};
