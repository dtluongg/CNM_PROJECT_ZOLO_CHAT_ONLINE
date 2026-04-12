/**
 * CallContext.js – Context toàn cục quản lý cuộc gọi audio/video cho mobile.
 *
 * Hoạt động song song với PresenceContext (socket riêng biệt).
 * Server tự join mọi socket vào room user:{userId} khi kết nối.
 */

import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';
import { io } from 'socket.io-client';
import { Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { SOCKET_URL } from '../../config/env';
import { useCallWebRTC, RN_RTC_AVAILABLE } from './hooks/useCallWebRTC';
import InCallManager from 'react-native-incall-manager';
export const CALL_STATE = {
  IDLE:     'idle',
  CALLING:  'calling',
  INCOMING: 'incoming',
  ACTIVE:   'active',
};

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { token } = useAuth();

  const socketRef         = useRef(null);
  const pendingCandidates = useRef([]);
  const callTimerRef      = useRef(null);

  // Refs mirror state
  const callStateRef = useRef(CALL_STATE.IDLE);
  const callIdRef    = useRef(null);
  const incomingRef  = useRef(null);
  const callTypeRef  = useRef(null);

  // React state
  const [callState,    _setCallState]   = useState(CALL_STATE.IDLE);
  const [callType, _setCallType] = useState(null);
  const setCallType = useCallback((v) => {
    callTypeRef.current = v;
    _setCallType(v);
  }, []);
  const [callId,       _setCallId]      = useState(null);
  const [remoteUser,   setRemoteUser]   = useState(null);
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCameraOff,  setIsCameraOff]  = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingData, _setIncoming]    = useState(null);

  const setCallState = useCallback((v) => { callStateRef.current = v; _setCallState(v); }, []);
  const setCallId    = useCallback((v) => { callIdRef.current    = v; _setCallId(v);    }, []);
  const setIncoming  = useCallback((v) => { incomingRef.current  = v; _setIncoming(v);  }, []);

  // ── WebRTC ───────────────────────────────────────────────────────────────
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
  } = useCallWebRTC({
    onIceCandidate: useCallback((candidate) => {
      const cid = callIdRef.current;
      if (cid && socketRef.current?.connected) {
        socketRef.current.emit('call:ice-candidate', { callId: cid, candidate });
      } else {
        // Chưa có callId → queue lại
        pendingCandidates.current.push(candidate);
        console.log('[ICE] queued candidate, pending:', pendingCandidates.current.length);
      }
    }, []),
    onRemoteStream: useCallback((stream) => setRemoteStream(stream), []),
  });

  // ── Timer ────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
  }, []);
  const stopTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    setCallDuration(0);
  }, []);

  // ── Flush ICE candidates ─────────────────────────────────────────────────
  const flushCandidates = useCallback(async () => {
    const queue = [...pendingCandidates.current];
    pendingCandidates.current = [];
    for (const c of queue) await addIceCandidate(c);
  }, [addIceCandidate]);

  // ── Reset toàn bộ ────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    InCallManager.stopRingtone();
    InCallManager.stop();
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
    pendingCandidates.current = [];
  }, [webrtcCleanup, stopTimer, setCallState, setCallId, setIncoming]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  API công khai
  // ═══════════════════════════════════════════════════════════════════════════

  const initiateCall = useCallback(async (targetUser, type) => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;
    if (!socketRef.current?.connected) {
      Alert.alert('Lỗi', 'Không có kết nối. Hãy thử lại.');
      return;
    }
    if (!RN_RTC_AVAILABLE) {
      Alert.alert('Cần Expo Dev Build', '...');
      return;
    }
    try {
      const pc     = createPeer();
      const stream = await getLocalStream(type);
      setLocalStream(stream);
      addLocalStream(stream);
      InCallManager.start({ media: type });
      setTimeout(() => {
        InCallManager.setForceSpeakerphoneOn(type === 'video');
      }, 500);
      const offer = await createOffer();

      socketRef.current.emit('call:initiate', { calleeId: targetUser._id, type, offer }, (res) => {
        if (res?.error) {
          const isOffline = res.error.toLowerCase().includes('offline');
          Alert.alert(
            isOffline ? 'Không thể gọi' : 'Lỗi',
            isOffline
              ? `${targetUser.displayName || 'Người dùng'} đang không online`
              : res.error,
          );
          resetAll();
          return;
        }

        // Set callId ngay → các ICE candidate pending sẽ được gửi
        setCallId(res.callId);
        setCallState(CALL_STATE.CALLING);
        setCallType(type);
        setRemoteUser(targetUser);

        // Flush ICE candidates đã bị queue do chưa có callId
        const pending = [...pendingCandidates.current];
        pendingCandidates.current = [];
        pending.forEach(candidate => {
          socketRef.current.emit('call:ice-candidate', {
            callId: res.callId,
            candidate,
          });
        });
      });
    } catch (err) {
      console.error('initiateCall error:', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi.');
      resetAll();
    }
  }, [createPeer, getLocalStream, addLocalStream, createOffer, resetAll, setCallId, setCallState]);

  const answerCall = useCallback(async () => {
    const data = incomingRef.current;
    if (!data) return;
    const { callId: cid, offer, type, callerInfo } = data;
    try {
      const pc = createPeer();
      const stream = await getLocalStream(type);
      setLocalStream(stream);
      addLocalStream(stream);
      InCallManager.stopRingtone();
      InCallManager.start({ media: type });

      // ← THÊM: set callId TRƯỚC khi createAnswer
      // để onIceCandidate có callId khi gửi candidates
      setCallId(cid);

      const answer = await createAnswer(offer);

      setTimeout(() => {
        InCallManager.setForceSpeakerphoneOn(type === 'video');
        InCallManager.setSpeakerphoneOn(type === 'video');
      }, 500);

      socketRef.current.emit('call:answer', { callId: cid, answer }, async (res) => {
        if (res?.error) {
          Alert.alert('Lỗi', res.error);
          resetAll();
          return;
        }
        setCallState(CALL_STATE.ACTIVE);
        setCallType(type);
        setRemoteUser(callerInfo);
        startTimer();
        await flushCandidates();
      });
    } catch (err) {
      console.error('answerCall error:', err);
      Alert.alert('Lỗi', 'Không thể trả lời cuộc gọi.');
      resetAll();
    }
  }, [createPeer, getLocalStream, addLocalStream, createAnswer, resetAll,
      setCallId, setCallState, startTimer, flushCandidates]);

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
      socketRef.current.emit('call:end', { callId: cid });
    }
    resetAll();
  }, [resetAll]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => { const n = !prev; setMuted(n); return n; });
  }, [setMuted]);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => { const n = !prev; setCameraEnabled(!n); return n; });
  }, [setCameraEnabled]);

  const formatDuration = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('call:incoming', (data) => {
      if (callStateRef.current !== CALL_STATE.IDLE) {
        socket.emit('call:reject', { callId: data.callId });
        return;
      }
      setIncoming(data);
      setCallType(data.type);
      setCallState(CALL_STATE.INCOMING);
      InCallManager.startRingtone('_DEFAULT_');


    });

    socket.on('call:answered', async ({ callId: cid, answer }) => {
      try {
        await setRemoteAnswer(answer);
        setCallId(cid);
        setCallState(CALL_STATE.ACTIVE);
        startTimer();
        await flushCandidates();

        // ← THÊM: khởi động audio routing
        const type = callTypeRef.current || 'audio';
        InCallManager.stop();
        InCallManager.start({ media: type });
        setTimeout(() => {
          InCallManager.setForceSpeakerphoneOn(type === 'video');
          InCallManager.setSpeakerphoneOn(type === 'video');
        }, 500);

      } catch (err) {
        console.error('call:answered error:', err);
        resetAll();
      }
    });

    socket.on('call:rejected', () => resetAll());
    socket.on('call:ended',    () => resetAll());
    socket.on('call:timeout',  () => resetAll());

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
