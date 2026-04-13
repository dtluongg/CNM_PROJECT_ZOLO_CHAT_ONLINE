import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import conversationApi from '../api/conversationApi';
import { mapConversationItem, buildPendingDmConversation } from '../utils/mapConversation';
import { formatConversationTime } from '../utils/formatTime';

export const useConversations = ({ isMobile, setMobileView }) => {
  const location = useLocation();
  const [conversations, setConversations]   = useState([]);
  const [dmOverrides, setDmOverrides]       = useState({});
  const [activeConversation, setActiveConversation] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res  = await conversationApi.listMyConversations('exclude');
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const mapped = list.map((item) => mapConversationItem(item, dmOverrides));
      const openConversationId = location.state?.openConversationId;

      setConversations(mapped);

      if (openConversationId) {
        const openConversation = mapped.find((c) => c.id === openConversationId);
        if (openConversation) {
          setActiveConversation(openConversation);
          if (isMobile) setMobileView('chat');
        }
      } else {
        setActiveConversation((prevActive) => {
          if (!prevActive?.id) return prevActive;
          if (prevActive.raw?.pendingDm && prevActive.otherUserId) {
            const existing = mapped.find(
              (c) => c.type === 'dm' && c.otherUserId === prevActive.otherUserId
            );
            if (existing) return existing;
          }
          if (prevActive.raw?.pendingDm) return prevActive;
          return mapped.find((c) => c.id === prevActive.id) || null;
        });
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [dmOverrides, isMobile, location.state?.openConversationId, setMobileView]);

  const applyPendingPeer = useCallback((pendingPeer) => {
    if (!pendingPeer?.id) return;
    setActiveConversation(buildPendingDmConversation(pendingPeer));
  }, []);

  const applyDmOverride = useCallback((conversationId, peer) => {
    if (!conversationId || !peer) return;
    setDmOverrides((prev) => ({
      ...prev,
      [conversationId]: { id: peer.id, name: peer.name, avatar: peer.avatar },
    }));
  }, []);

  const updateConversationPreview = useCallback((convId, fields) => {
    setConversations((prev) =>
      prev.map((c) => (c.id !== convId ? c : { ...c, ...fields }))
    );
  }, []);

  const removeConversation = useCallback((convId) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
  }, []);

  const handleDeleteConversation = useCallback(async (conversationId, activeId, setMobileViewFn) => {
    if (!conversationId) return;

    if (conversationId.startsWith('pending-dm-')) {
      setActiveConversation((prev) => (prev?.id === conversationId ? null : prev));
      return;
    }

    const ok = window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này ở phía bạn?');
    if (!ok) return;

    try {
      await conversationApi.deleteConversationForMe(conversationId);
      removeConversation(conversationId);
      setActiveConversation((prev) => (prev?.id === conversationId ? null : prev));
      if (isMobile && activeId === conversationId) setMobileViewFn('list');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Không thể xóa cuộc trò chuyện');
    }
  }, [isMobile, removeConversation]);

  const buildMappedCreated = useCallback((createdConversation, override) => {
    const id = createdConversation._id;
    return mapConversationItem(createdConversation, { [id]: override });
  }, []);

  const upsertConversation = useCallback((mappedCreated, pendingId) => {
    setConversations((prev) => {
      const withoutPending = prev.filter((c) => c.id !== pendingId);
      const existingIndex  = withoutPending.findIndex((c) => c.id === mappedCreated.id);
      if (existingIndex >= 0) {
        const next = [...withoutPending];
        next[existingIndex] = { ...next[existingIndex], ...mappedCreated };
        return next;
      }
      return [mappedCreated, ...withoutPending];
    });
  }, []);

  return {
    conversations,
    setConversations,
    dmOverrides,
    setDmOverrides,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    applyPendingPeer,
    applyDmOverride,
    updateConversationPreview,
    removeConversation,
    handleDeleteConversation,
    buildMappedCreated,
    upsertConversation,
  };
};