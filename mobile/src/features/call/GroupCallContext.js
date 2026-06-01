/**
 * GroupCallContext.js (React Native)
 * Group call audio/video qua LiveKit SFU.
 * Tái dụng useVoiceRoom hook hoàn toàn, thêm socket signaling để ring.
 */

import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRoom } from '../voice/hooks/useVoiceRoom';

const { SOCKET_URL } = require('../../config/env');

export const GROUP_CALL_STATE = {
  IDLE:     'idle',
  CALLING:  'calling',
  INCOMING: 'incoming',
  ACTIVE:   'active',
};

const GroupCallContext = createContext(null);

export function GroupCallProvider({ children }) {
  const { token } = useAuth();

  const socketRef      = useRef(null);
  const callStateRef   = useRef(GROUP_CALL_STATE.IDLE);
  const groupCallIdRef = useRef(null);
  const incomingRef    = useRef(null);
  const callTimerRef   = useRef(null);

  const [callState,    _setCallState]  = useState(GROUP_CALL_STATE.IDLE);
  const [callType,     setCallType]    = useState(null);
  const [groupCallId,  _setGCId]       = useState(null);
  const [incomingData, _setIncoming]   = useState(null);
  const [callDuration, setCallDuration]= useState(0);
  const [error,        setError]       = useState(null);
  const [convId,       setConvId]      = useState(null);
  const [socketReady,  setSocketReady] = useState(false);

  const setCallState = useCallback(v => { callStateRef.current = v; _setCallState(v); }, []);
  const setGCId      = useCallback(v => { groupCallIdRef.current = v; _setGCId(v); }, []);
  const setIncoming  = useCallback(v => { incomingRef.current = v; _setIncoming(v); }, []);

  const voiceRoom = useVoiceRoom();

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(callTimerRef.current);
    setCallDuration(0);
  }, []);

  const formatDuration = useCallback((s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }, []);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetAll = useCallback(async () => {
    stopTimer();
    try { if (voiceRoom.connected) await voiceRoom.disconnect(); } catch {}
    setCallState(GROUP_CALL_STATE.IDLE);
    setCallType(null);
    setGCId(null);
    setIncoming(null);
    setError(null);
    setConvId(null);
  }, [stopTimer, voiceRoom, setCallState, setGCId, setIncoming]);

  // ── Initiate ───────────────────────────────────────────────────────────────
  const initiateGroupCall = useCallback(async (conversationId, type) => {
    if (callStateRef.current !== GROUP_CALL_STATE.IDLE) return;

    // Wait up to 4s for socket to connect
    if (!socketRef.current?.connected) {
      let waited = 0;
      await new Promise(resolve => {
        const check = setInterval(() => {
          waited += 200;
          if (socketRef.current?.connected || waited >= 4000) {
            clearInterval(check);
            resolve();
          }
        }, 200);
      });
    }

    if (!socketRef.current?.connected) {
      setError('Không có kết nối mạng, thử lại sau');
      return;
    }
    setError(null);

    socketRef.current.emit('group-call:initiate', { conversationId, type }, async (res) => {
      if (res?.error) { setError(res.error); return; }
      try {
        await voiceRoom.connect({ livekitUrl: res.livekitUrl, token: res.token });
        setGCId(res.groupCallId);
        setCallType(type);
        setConvId(conversationId);
        setCallState(GROUP_CALL_STATE.CALLING);
        startTimer();
      } catch (err) {
        console.error('[GroupCall] connect error:', err);
        setError('Không thể kết nối phòng gọi');
        socketRef.current?.emit('group-call:end', { groupCallId: res.groupCallId });
        resetAll();
      }
    });
  }, [voiceRoom, setCallState, setGCId, startTimer, resetAll]);

  // ── Accept ─────────────────────────────────────────────────────────────────
  const acceptGroupCall = useCallback(async () => {
    const data = incomingRef.current;
    if (!data) return;
    setError(null);

    socketRef.current.emit('group-call:accept', { groupCallId: data.groupCallId }, async (res) => {
      if (res?.error) { setError(res.error); resetAll(); return; }
      try {
        await voiceRoom.connect({ livekitUrl: res.livekitUrl, token: res.token });
        setGCId(res.groupCallId);
        setCallType(data.type);
        setConvId(data.conversationId);
        setCallState(GROUP_CALL_STATE.ACTIVE);
        startTimer();
      } catch (err) {
        console.error('[GroupCall] accept connect error:', err);
        setError('Không thể kết nối');
        resetAll();
      }
    });
  }, [voiceRoom, setCallState, setGCId, startTimer, resetAll]);

  // ── Decline ────────────────────────────────────────────────────────────────
  const declineGroupCall = useCallback(() => {
    const data = incomingRef.current;
    if (data?.groupCallId && socketRef.current?.connected)
      socketRef.current.emit('group-call:decline', { groupCallId: data.groupCallId });
    resetAll();
  }, [resetAll]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leaveGroupCall = useCallback(() => {
    const gcId = groupCallIdRef.current;
    if (gcId && socketRef.current?.connected)
      socketRef.current.emit('group-call:leave', { groupCallId: gcId });
    resetAll();
  }, [resetAll]);

  // ── End (initiator) ────────────────────────────────────────────────────────
  const endGroupCall = useCallback(() => {
    const gcId = groupCallIdRef.current;
    if (gcId && socketRef.current?.connected)
      socketRef.current.emit('group-call:end', { groupCallId: gcId });
    resetAll();
  }, [resetAll]);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketReady(true);
      console.log('[GroupCallSocket] connected:', socket.id);
    });
    socket.on('disconnect', () => setSocketReady(false));
    socket.on('connect_error', (e) => console.warn('[GroupCallSocket] error:', e?.message));

    socket.on('group-call:incoming', (data) => {
      if (callStateRef.current !== GROUP_CALL_STATE.IDLE) {
        socket.emit('group-call:decline', { groupCallId: data.groupCallId });
        return;
      }
      setIncoming(data);
      setCallType(data.type);
      setCallState(GROUP_CALL_STATE.INCOMING);
    });

    socket.on('group-call:ended', () => {
      if (callStateRef.current !== GROUP_CALL_STATE.IDLE) resetAll();
    });

    socket.on('group-call:member-joined', () => {
      if (callStateRef.current === GROUP_CALL_STATE.CALLING)
        setCallState(GROUP_CALL_STATE.ACTIVE);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return (
    <GroupCallContext.Provider value={{
      callState, callType, groupCallId,
      conversationId: convId,
      incomingData, callDuration, error, formatDuration,
      // LiveKit state & controls
      connected:          voiceRoom.connected,
      isMuted:            voiceRoom.isMuted,
      isCameraOff:        voiceRoom.isCameraOff,
      isScreenSharing:    voiceRoom.isScreenSharing,
      liveParts:          voiceRoom.liveParts,
      localVideoURL:      voiceRoom.localVideoURL,
      screenURL:          voiceRoom.screenURL,
      speaking:           voiceRoom.speaking,
      getRemoteVideoURL:  voiceRoom.getRemoteVideoURL,
      toggleMute:         voiceRoom.toggleMute,
      toggleCamera:       voiceRoom.toggleCamera,
      toggleScreenShare:  voiceRoom.toggleScreenShare,
      socketReady,
      // actions
      initiateGroupCall,
      acceptGroupCall,
      declineGroupCall,
      leaveGroupCall,
      endGroupCall,
    }}>
      {children}
    </GroupCallContext.Provider>
  );
}

const NO_OP = () => {};
const DEFAULT_CTX = {
  callState: GROUP_CALL_STATE.IDLE, callType: null, groupCallId: null,
  conversationId: null, incomingData: null, callDuration: 0, error: null, socketReady: false,
  formatDuration: (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`,
  connected: false, isMuted: false, isCameraOff: true, isScreenSharing: false,
  liveParts: [], localVideoURL: null, screenURL: null, speaking: new Set(),
  getRemoteVideoURL: () => null,
  toggleMute: NO_OP, toggleCamera: NO_OP, toggleScreenShare: NO_OP,
  initiateGroupCall: NO_OP, acceptGroupCall: NO_OP, declineGroupCall: NO_OP,
  leaveGroupCall: NO_OP, endGroupCall: NO_OP,
};

export function useGroupCall() {
  const ctx = useContext(GroupCallContext);
  return ctx || DEFAULT_CTX;
}