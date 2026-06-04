import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import voiceRoomApi from './api/voiceRoomApi';
import { useVoiceRoom } from './hooks/useVoiceRoom';

const VoiceRoomContext = createContext(null);

export function VoiceRoomProvider({ children }) {
  // Room info per topicId (or '__general__' for no-topic rooms)
  const [roomInfoMap,         setRoomInfoMap]         = useState({});
  const [inRoom,              setInRoom]              = useState(false);
  const [activeKey,           setActiveKey]           = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeTopic,         setActiveTopic]         = useState(null); // full topic object of current voice room
  const [expandSignal,        setExpandSignal]        = useState(0);    // bump to request UI re-open the call screen
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState(null);

  // Yêu cầu mở lại màn hình gọi (được VoiceDock gọi khi user bấm widget)
  const requestExpand = useCallback(() => setExpandSignal((n) => n + 1), []);

  const {
    connect, disconnect, toggleMute, toggleCamera, toggleScreenShare,
    getRemoteCameraTrack,
    connected, isMuted, isCameraOff, isScreenSharing,
    speaking, liveParts, localVideoTrack, screenTrack,
  } = useVoiceRoom();

  const getMergedParticipants = useCallback((topicId) => {
    const key  = topicId || '__general__';
    const info = roomInfoMap[key];
    const backendMap = {};
    (info?.participants || []).forEach(p => { backendMap[p.userId] = p; });

    if (liveParts.length > 0) {
      return liveParts.map(lp => {
        const bd = backendMap[lp.identity] || {};
        return {
          userId:      lp.identity,
          identity:    lp.identity,
          displayName: bd.displayName || lp.name || 'Người dùng',
          avatar:      bd.avatar      || lp.metadata?.avatar || null,
          isSpeaking:  speaking.has(lp.identity),
          isMuted:     lp.isMuted   ?? false,
          hasCamera:   lp.hasCamera ?? false,
          isLocal:     lp.isLocal   ?? false,
        };
      });
    }
    return (info?.participants || []).map(p => ({
      ...p,
      identity:   p.userId,
      isSpeaking: false,
      isMuted:    false,
      hasCamera:  false,
      isLocal:    false,
    }));
  }, [liveParts, speaking, roomInfoMap]);

  const fetchStatus = useCallback(async (conversationId, topicId = null) => {
    try {
      const res = await voiceRoomApi.status(conversationId, topicId);
      const key = topicId || '__general__';
      setRoomInfoMap(prev => ({ ...prev, [key]: res.data }));
    } catch {
      const key = topicId || '__general__';
      setRoomInfoMap(prev => ({ ...prev, [key]: { active: false } }));
    }
  }, []);

  // Fetch status for ALL voice channels in a group at once
  const fetchStatusBatch = useCallback(async (conversationId) => {
    try {
      const res = await voiceRoomApi.statusBatch(conversationId);
      const rooms = res.data?.rooms || {};
      setRoomInfoMap(prev => {
        const next = { ...prev };
        // Mark all as inactive first (rooms with no entry have no active room)
        // Then set active ones
        Object.entries(rooms).forEach(([key, participants]) => {
          next[key] = { active: participants.length > 0, participants };
        });
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const createRoom = useCallback(async (conversationId, topicId = null, topicObj = null) => {
    setLoading(true); setError(null);
    try {
      const res  = await voiceRoomApi.create(conversationId, topicId);
      const { token, livekitUrl } = res.data;
      const key  = topicId || '__general__';
      setActiveKey(key);
      setActiveConversationId(conversationId);
      setActiveTopic(topicObj);
      setInRoom(true);
      await connect({ livekitUrl, token });
      await fetchStatus(conversationId, topicId);
    } catch (err) {
      console.error('[VoiceRoom] createRoom error:', err);
      setError(err.response?.data?.message || err.message || 'Không thể tạo phòng thoại');
      setInRoom(false);
    } finally {
      setLoading(false);
    }
  }, [connect, fetchStatus]);

  const joinRoom = useCallback(async (conversationId, topicId = null, topicObj = null) => {
    setLoading(true); setError(null);
    try {
      const res  = await voiceRoomApi.join(conversationId, topicId);
      const { token, livekitUrl } = res.data;
      const key  = topicId || '__general__';
      setActiveKey(key);
      setActiveConversationId(conversationId);
      setActiveTopic(topicObj);
      setInRoom(true);
      await connect({ livekitUrl, token });
      await fetchStatus(conversationId, topicId);
    } catch (err) {
      console.error('[VoiceRoom] joinRoom error:', err);
      setError(err.response?.data?.message || err.message || 'Không thể tham gia phòng thoại');
      setInRoom(false);
    } finally {
      setLoading(false);
    }
  }, [connect, fetchStatus]);

  const leaveRoom = useCallback(async (conversationId, topicId = null) => {
    setLoading(true);
    try {
      await disconnect();
      await voiceRoomApi.leave(conversationId, topicId);
      const key = topicId || '__general__';
      setActiveKey(null);
      setActiveConversationId(null);
      setActiveTopic(null);
      setInRoom(false);
      await fetchStatus(conversationId, topicId);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể rời phòng thoại');
    } finally {
      setLoading(false);
    }
  }, [disconnect, fetchStatus]);

  const getRoomInfo   = useCallback((topicId) => roomInfoMap[topicId || '__general__'] || { active: false }, [roomInfoMap]);
  const isInRoom      = useCallback((topicId) => inRoom && activeKey === (topicId || '__general__'), [inRoom, activeKey]);

  return (
    <VoiceRoomContext.Provider value={{
      // State accessors
      getRoomInfo, getMergedParticipants, isInRoom,
      inRoom, activeKey, activeConversationId, activeTopic, loading, error,
      expandSignal, requestExpand,
      // LiveKit state
      connected, isMuted, isCameraOff, isScreenSharing,
      liveParts, localVideoTrack, screenTrack,
      // Actions
      createRoom, joinRoom, leaveRoom,
      toggleMute, toggleCamera, toggleScreenShare,
      getRemoteCameraTrack,
      fetchStatus, fetchStatusBatch,
    }}>
      {children}
    </VoiceRoomContext.Provider>
  );
}

export function useVoiceRoomContext() {
  const ctx = useContext(VoiceRoomContext);
  if (!ctx) throw new Error('useVoiceRoomContext must be used inside VoiceRoomProvider');
  return ctx;
}