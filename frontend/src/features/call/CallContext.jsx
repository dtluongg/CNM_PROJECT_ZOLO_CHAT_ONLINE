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
import { getAccessToken } from '../../utils/authStorage';
import { useWebRTC } from './hooks/useWebRTC';

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';
// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:2026');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export const CALL_STATE = {
  IDLE: 'idle',
  CALLING: 'calling',
  INCOMING: 'incoming',
  ACTIVE: 'active',
};

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { token } = useAuth();

  const socketRef = useRef(null);

  const pendingCandidates = useRef([]);
  const pendingLocalCandidates = useRef([]);

  const isFlushing = useRef(false);
  const callTimerRef = useRef(null);
  const notifTimerRef = useRef(null);

  const callStateRef = useRef(CALL_STATE.IDLE);
  const callIdRef = useRef(null);
  const incomingRef = useRef(null);

  const [callState, _setCallState] = useState(CALL_STATE.IDLE);
  const [callType, setCallType] = useState(null);
  const [callId, _setCallId] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingData, _setIncoming] = useState(null);
  const [callError, setCallError] = useState(null);
  const [notification, setNotification] = useState(null);

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
        socketRef.current.emit('call:ice-candidate', {
          callId: cid,
          candidate,
        });
      } else {
        pendingLocalCandidates.current.push(candidate);
        console.log('[ICE web] queued local candidate:', pendingLocalCandidates.current.length);
      }
    }, []),

    onRemoteStream: useCallback((stream) => {
      console.log(
        '[Web] onRemoteStream tracks:',
        stream.getTracks().map((track) => ({
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        })),
      );

      setRemoteStream(stream);
    }, []),
  });

  const startTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    setCallDuration(0);

    callTimerRef.current = setInterval(() => {
      setCallDuration((previous) => previous + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    setCallDuration(0);
  }, []);

  const flushRemoteCandidates = useCallback(async () => {
    const pc = pcRef.current;

    if (!pc?.remoteDescription) return;

    isFlushing.current = true;

    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      await addIceCandidate(candidate);
    }

    isFlushing.current = false;
  }, [addIceCandidate, pcRef]);

  const flushLocalCandidates = useCallback((cid) => {
    if (!cid || !socketRef.current?.connected) return;

    const pending = [...pendingLocalCandidates.current];
    pendingLocalCandidates.current = [];

    console.log('[ICE web] flushing local candidates:', pending.length);

    pending.forEach((candidate) => {
      socketRef.current.emit('call:ice-candidate', {
        callId: cid,
        candidate,
      });
    });
  }, []);

  const showNotification = useCallback((message, type = 'error') => {
    clearTimeout(notifTimerRef.current);

    setNotification({ message, type });

    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

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

    pendingCandidates.current = [];
    pendingLocalCandidates.current = [];
  }, [webrtcCleanup, stopTimer, setCallState, setCallId, setIncoming]);

  const initiateCall = useCallback(async (targetUser, type) => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;

    if (!socketRef.current?.connected) {
      setCallError('Không có kết nối socket');
      return;
    }

    setCallError(null);

    try {
      createPeer();

      const stream = await getLocalStream(type);

      setLocalStream(stream);
      addLocalStream(stream);

      const offer = await createOffer();

      socketRef.current.emit('call:initiate', { calleeId: targetUser._id, type, offer }, (res) => {
        if (res?.error) {
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

        flushLocalCandidates(res.callId);
      });
    } catch (err) {
      console.error('initiateCall error:', err);
      setCallError(err.message || 'Không thể khởi tạo cuộc gọi');
      resetAll();
    }
  }, [
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

  const answerCall = useCallback(async () => {
    const data = incomingRef.current;
    if (!data) return;

    const { callId: cid, offer, type, callerInfo } = data;

    setCallError(null);

    try {
      createPeer();

      const stream = await getLocalStream(type);

      setLocalStream(stream);
      addLocalStream(stream);

      setCallId(cid);

      const answer = await createAnswer(offer);

      socketRef.current.emit('call:answer', { callId: cid, answer }, async (res) => {
        if (res?.error) {
          setCallError(res.error);
          resetAll();
          return;
        }

        setCallState(CALL_STATE.ACTIVE);
        setCallType(type);
        setRemoteUser(callerInfo);
        startTimer();

        flushLocalCandidates(cid);
        await flushRemoteCandidates();
      });
    } catch (err) {
      console.error('answerCall error:', err);
      setCallError(err.message || 'Không thể trả lời cuộc gọi');
      resetAll();
    }
  }, [
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

  const rejectCall = useCallback(() => {
    const data = incomingRef.current;

    if (data?.callId && socketRef.current?.connected) {
      socketRef.current.emit('call:reject', {
        callId: data.callId,
      });
    }

    resetAll();
  }, [resetAll]);

  const endCall = useCallback(() => {
    const cid = callIdRef.current;

    if (cid && socketRef.current?.connected) {
      socketRef.current.emit('call:end', {
        callId: cid,
      });
    }

    resetAll();
  }, [resetAll]);

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;

      setMuted(next);

      return next;
    });
  }, [setMuted]);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((previous) => {
      const next = !previous;

      setCameraEnabled(!next);

      return next;
    });
  }, [setCameraEnabled]);

  const formatDuration = useCallback((secs) => {
    const minutes = Math.floor(secs / 60).toString().padStart(2, '0');
    const seconds = (secs % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, []);

  useEffect(() => {
    const accessToken = token || getAccessToken();

    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket web] connected:', SOCKET_URL, socket.id);
    });

    socket.on('call:incoming', (data) => {
      if (callStateRef.current !== CALL_STATE.IDLE) {
        socket.emit('call:reject', {
          callId: data.callId,
        });

        return;
      }

      setIncoming(data);
      setCallType(data.type);
      setCallState(CALL_STATE.INCOMING);
    });

    socket.on('call:answered', async ({ callId: cid, answer }) => {
      try {
        await setRemoteAnswer(answer);

        setCallId(cid);
        setCallState(CALL_STATE.ACTIVE);
        startTimer();

        flushLocalCandidates(cid);
        await flushRemoteCandidates();
      } catch (err) {
        console.error('call:answered error:', err);
        resetAll();
      }
    });

    socket.on('call:rejected', () => {
      resetAll();
    });

    socket.on('call:ended', () => {
      resetAll();
    });

    socket.on('call:timeout', () => {
      resetAll();
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      const pc = pcRef.current;

      if (!pc || !candidate) return;

      if (pc.remoteDescription && !isFlushing.current) {
        await addIceCandidate(candidate);
        await flushRemoteCandidates();
      } else {
        pendingCandidates.current.push(candidate);
        console.log('[ICE web] queued remote candidate:', pendingCandidates.current.length);
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
    resetAll,
    pcRef,
  ]);

  useEffect(() => {
    return () => {
      stopTimer();
      webrtcCleanup();
      clearTimeout(notifTimerRef.current);
    };
  }, [stopTimer, webrtcCleanup]);

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

  if (!ctx) {
    throw new Error('useCall phải được dùng bên trong CallProvider');
  }

  return ctx;
};