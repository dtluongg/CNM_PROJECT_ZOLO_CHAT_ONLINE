/**
 * CallContext.js – Context toàn cục quản lý cuộc gọi audio/video cho mobile.
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
import { Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { SOCKET_URL } from '../../config/env';
import { useCallWebRTC, RN_RTC_AVAILABLE } from './hooks/useCallWebRTC';
import InCallManager from 'react-native-incall-manager';

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

  const callTimerRef = useRef(null);
  const statsTimerRef = useRef(null);

  const callStateRef = useRef(CALL_STATE.IDLE);
  const callIdRef = useRef(null);
  const incomingRef = useRef(null);
  const callTypeRef = useRef(null);

  const [callState, _setCallState] = useState(CALL_STATE.IDLE);
  const [callType, _setCallType] = useState(null);
  const [callId, _setCallId] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingData, _setIncoming] = useState(null);

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

  const setCallType = useCallback((value) => {
    callTypeRef.current = value;
    _setCallType(value);
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
    logAudioStats,
  } = useCallWebRTC({
    onIceCandidate: useCallback((candidate) => {
      const cid = callIdRef.current;

      if (cid && socketRef.current?.connected) {
        socketRef.current.emit('call:ice-candidate', {
          callId: cid,
          candidate,
        });
      } else {
        pendingLocalCandidates.current.push(candidate);
        console.log('[ICE] queued local candidate:', pendingLocalCandidates.current.length);
      }
    }, []),

    onRemoteStream: useCallback((stream) => {
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

  const startStatsTimer = useCallback(() => {
    clearInterval(statsTimerRef.current);

    statsTimerRef.current = setInterval(() => {
      logAudioStats?.();
    }, 2000);
  }, [logAudioStats]);

  const stopStatsTimer = useCallback(() => {
    clearInterval(statsTimerRef.current);
    statsTimerRef.current = null;
  }, []);

  const flushRemoteCandidates = useCallback(async () => {
    const pc = pcRef.current;

    if (!pc?.remoteDescription) return;

    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      await addIceCandidate(candidate);
    }
  }, [addIceCandidate, pcRef]);

  const flushLocalCandidates = useCallback((cid) => {
    if (!cid || !socketRef.current?.connected) return;

    const pending = [...pendingLocalCandidates.current];
    pendingLocalCandidates.current = [];

    console.log('[ICE] flushing local candidates:', pending.length);

    pending.forEach((candidate) => {
      socketRef.current.emit('call:ice-candidate', {
        callId: cid,
        candidate,
      });
    });
  }, []);

  const resetAll = useCallback(() => {
    if (InCallManager) {
      InCallManager.stopRingtone();
      InCallManager.stop();
    }

    webrtcCleanup();
    stopTimer();
    stopStatsTimer();

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
    pendingLocalCandidates.current = [];
  }, [
    webrtcCleanup,
    stopTimer,
    stopStatsTimer,
    setCallState,
    setCallId,
    setIncoming,
    setCallType,
  ]);

  const prepareAudioSession = useCallback((type) => {
    try {
      InCallManager.start({ media: type === 'video' ? 'video' : 'audio' });
      InCallManager.setMicrophoneMute(false);
      // Luôn bật speakerphone — người dùng có thể tắt sau; tắt forceSpeaker có thể block audio Android
      InCallManager.setSpeakerphoneOn(true);
      if (type === 'video') {
        InCallManager.setForceSpeakerphoneOn(true);
      }
    } catch (e) {
      console.warn('[InCallManager] prepareAudioSession error:', e?.message);
    }
  }, []);

  const initiateCall = useCallback(async (targetUser, type) => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;

    if (!socketRef.current?.connected) {
      Alert.alert('Lỗi', 'Không có kết nối. Hãy thử lại.');
      return;
    }

    if (!RN_RTC_AVAILABLE) {
      Alert.alert(
        'Cần Expo Dev Build',
        'Tính năng gọi video/thoại yêu cầu Expo Development Build.\nExpo Go không hỗ trợ WebRTC native.',
      );
      return;
    }

    try {
      await createPeer();

      const stream = await getLocalStream(type);

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      setLocalStream(stream);
      addLocalStream(stream);

      prepareAudioSession(type);

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

        setCallId(res.callId);
        setCallState(CALL_STATE.CALLING);
        setCallType(type);
        setRemoteUser(targetUser);

        flushLocalCandidates(res.callId);
      });
    } catch (err) {
      console.error('initiateCall error:', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi.');
      resetAll();
    }
  }, [
    createPeer,
    getLocalStream,
    prepareAudioSession,
    addLocalStream,
    createOffer,
    resetAll,
    setCallId,
    setCallState,
    setCallType,
    flushLocalCandidates,
  ]);

  const answerCall = useCallback(async () => {
    const data = incomingRef.current;
    if (!data) return;

    const { callId: cid, offer, type, callerInfo } = data;

    try {
      await createPeer();

      if (InCallManager) {
        InCallManager.stopRingtone();
      }

      const stream = await getLocalStream(type);
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setLocalStream(stream);
      addLocalStream(stream);
      prepareAudioSession(type);
      setCallId(cid);
      const answer = await createAnswer(offer);

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

        flushLocalCandidates(cid);
        await flushRemoteCandidates();
        startStatsTimer();
      });
    } catch (err) {
      console.error('answerCall error:', err);
      Alert.alert('Lỗi', 'Không thể trả lời cuộc gọi.');
      resetAll();
    }
  }, [
    createPeer,
    getLocalStream,
    prepareAudioSession,
    addLocalStream,
    createAnswer,
    resetAll,
    setCallId,
    setCallState,
    setCallType,
    startTimer,
    flushLocalCandidates,
    flushRemoteCandidates,
    startStatsTimer,
  ]);

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
    setIsMuted((previous) => {
      const next = !previous;

      setMuted(next);
      if (InCallManager) {
        InCallManager.setMicrophoneMute(next);
      }

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
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket mobile] connected:', SOCKET_URL, socket.id);
    });

    socket.on('call:incoming', (data) => {
      if (callStateRef.current !== CALL_STATE.IDLE) {
        socket.emit('call:reject', { callId: data.callId });
        return;
      }

      setIncoming(data);
      setCallType(data.type);
      setCallState(CALL_STATE.INCOMING);
      if (InCallManager) {
        InCallManager.startRingtone('_DEFAULT_');
      }
    });

    socket.on('call:answered', async ({ callId: cid, answer }) => {
      try {
        await setRemoteAnswer(answer);

        setCallId(cid);
        setCallState(CALL_STATE.ACTIVE);
        startTimer();

        flushLocalCandidates(cid);
        await flushRemoteCandidates();
        startStatsTimer();

        const type = callTypeRef.current || 'audio';

        setTimeout(() => {
          if (InCallManager) {
            InCallManager.setMicrophoneMute(false);
            InCallManager.setForceSpeakerphoneOn(type === 'video');
            InCallManager.setSpeakerphoneOn(type === 'video');
          }
        }, 300);
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

      if (pc.remoteDescription) {
        await addIceCandidate(candidate);
        await flushRemoteCandidates();
      } else {
        pendingCandidates.current.push(candidate);
        console.log('[ICE] queued remote candidate:', pendingCandidates.current.length);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      stopStatsTimer();
    };
  }, [
    token,
    setIncoming,
    setCallType,
    setCallState,
    setRemoteAnswer,
    setCallId,
    startTimer,
    flushLocalCandidates,
    flushRemoteCandidates,
    startStatsTimer,
    stopStatsTimer,
    addIceCandidate,
    resetAll,
    pcRef,
  ]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopStatsTimer();
      webrtcCleanup();
      if (InCallManager) {
        InCallManager.stopRingtone();
        InCallManager.stop();
      }
    };
  }, [stopTimer, stopStatsTimer, webrtcCleanup]);

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