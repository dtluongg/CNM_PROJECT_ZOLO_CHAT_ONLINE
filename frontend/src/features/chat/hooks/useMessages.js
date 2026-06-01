import { useState, useCallback } from 'react';
import messageApi from '../api/messageApi';
import conversationApi from '../api/conversationApi';
import { normalizeMsg } from '../utils/normalizeMsg';
import { fmtTime } from '../utils/formatTime';
import { mapConversationItem } from '../utils/mapConversation';

export const useMessages = ({
  currentUser,
  activeConversation,
  setActiveConversation,
  setDmOverrides,
  upsertConversation,
  updateConversationPreview,
  fetchDmBlockStatus,
}) => {
  const [messages, setMessages] = useState({});

  const loadMessages = useCallback(async (convId, topicId = null, force = false) => {
    // Key riêng cho từng topic
    const stateKey = topicId ? `${convId}__${topicId}` : convId;
    if (messages[stateKey] && !force) return;
    try {
      const res  = await messageApi.getMessages(convId, { topicId: topicId || undefined });
      const msgs = (res.data.messages || []).map(normalizeMsg);
      setMessages((prev) => ({ ...prev, [stateKey]: msgs }));
    } catch (err) {
      console.error('Load messages error:', err);
      setMessages((prev) => ({ ...prev, [stateKey]: [] }));
    }
  }, [messages]);

  const addMessage = useCallback((convId, msg) => {
    const topicId = msg.topicId?.toString?.() || msg.topicId || null;
    const stateKey = topicId ? `${convId}__${topicId}` : convId;
    setMessages((prev) => {
      const list = prev[stateKey] || [];
      if (list.some((m) => m._id?.toString() === msg._id?.toString())) return prev;
      return { ...prev, [stateKey]: [...list, msg] };
    });
  }, []);

  const updateMessage = useCallback((convId, messageId, updater) => {
    setMessages((prev) => {
      const list = prev[convId] || [];
      if (!list.length) return prev;
      return {
        ...prev,
        [convId]: list.map((m) =>
          (m._id || m.id)?.toString() === messageId?.toString() ? updater(m) : m
        ),
      };
    });
  }, []);

  const revokeMessage = useCallback((convId, messageId) => {
    updateMessage(convId, messageId, (m) => ({ ...m, revoked: true }));
  }, [updateMessage]);

  const editMessageInState = useCallback((convId, msg) => {
    updateMessage(convId, msg._id?.toString(), (m) => ({ ...m, ...msg }));
  }, [updateMessage]);

  const resetMessages = useCallback((convId) => {
    setMessages((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
  }, []);

  const migrateMessages = useCallback((oldId, newId) => {
    setMessages((prev) => {
      const next          = { ...prev };
      const pendingMsgs   = next[oldId] || [];
      delete next[oldId];
      next[newId]         = pendingMsgs;
      return next;
    });
  }, []);

  const handleSendMessage = useCallback(async (payload) => {
    if (!activeConversation) return;

    let resolvedConversation = activeConversation;
    let convId               = activeConversation.id;
    const myId               = currentUser?._id?.toString() || 'me';
    const myName             = currentUser?.displayName || 'Tôi';
    const myAvatar           = currentUser?.avatar || null;

    // ── Pending DM: create conversation first ─────────────────────────────
    if (payload.type === 'text' && !payload.isEdit && activeConversation.raw?.pendingDm && activeConversation.raw?.targetUserId) {
      const content = payload.content?.trim();
      if (!content) return;

      try {
        const targetUserId = activeConversation.raw.targetUserId;
        const res          = await conversationApi.createDmConversation(targetUserId, content);
        const created      = res?.data?.data;
        const createdId    = created?._id;

        if (!createdId) throw new Error('Không nhận được conversationId từ server');

        const override = {
          id:     targetUserId,
          name:   activeConversation.name,
          avatar: activeConversation.avatar || '',
        };

        setDmOverrides((prev) => ({ ...prev, [createdId]: override }));

        const mappedCreated = mapConversationItem(created, { [createdId]: override });
        upsertConversation(mappedCreated, activeConversation.id);
        migrateMessages(activeConversation.id, createdId);
        setActiveConversation(mappedCreated);
        resolvedConversation = mappedCreated;
        convId               = createdId;
      } catch (error) {
        window.alert(error.response?.data?.message || error.message || 'Không thể tạo cuộc trò chuyện');
        return;
      }
    }

    try {
      const { replyToMessageId, topicId = null } = payload;

      // ── TEXT ─────────────────────────────────────────────────────────────
      if (payload.type === 'text' && !payload.isEdit) {
        const { content } = payload;
        if (!content?.trim()) return;

        const tempId  = `temp_${Date.now()}`;
        const now     = new Date().toISOString();
        const tempMsg = {
          _id: tempId, senderId: myId, senderName: myName, avatar: myAvatar,
          type: 'text', content: content.trim(), payload: {},
          topicId: topicId || null,
          time: fmtTime(now), createdAt: now,
          replyToMessageId: replyToMessageId || null,
        };
        setMessages((prev) => ({ ...prev, [convId]: [...(prev[convId] || []), tempMsg] }));

        const res    = await messageApi.sendText(convId, content.trim(), replyToMessageId, topicId);
        const real   = normalizeMsg(res.data.data);
        const realId = real._id?.toString();

        setMessages((prev) => {
          const list    = prev[convId] || [];
          const cleaned = list.filter((m) => m._id?.toString() !== realId);
          return { ...prev, [convId]: cleaned.map((m) => (m._id === tempId ? real : m)) };
        });

        updateConversationPreview(convId, { lastMessage: content.trim(), time: real.time });
        setActiveConversation((prev) =>
          prev?.id === convId ? { ...resolvedConversation, ...prev, lastMessage: content.trim(), time: real.time } : prev
        );

      // ── EDIT ─────────────────────────────────────────────────────────────
      } else if (payload.isEdit && payload.type === 'text') {
        const { content, messageId } = payload;
        if (!content?.trim()) return;

        const res  = await messageApi.editMessage(messageId, content.trim());
        const real = normalizeMsg(res.data.data);

        editMessageInState(convId, real);
        updateConversationPreview(convId, { lastMessage: content.trim() });

      // ── VOICE ─────────────────────────────────────────────────────────────
      } else if (payload.type === 'voice') {
        const { blob, duration } = payload;
        const fd = new FormData();
        fd.append('voice', blob, 'voice.webm');
        if (duration) fd.append('duration', String(Math.round(duration)));

        const up  = await messageApi.uploadVoice(fd);
        const res = await messageApi.sendVoice(convId, up.data.voice.fileId, replyToMessageId, topicId);
        const msg = normalizeMsg(res.data.data);
        addMessage(convId, msg);
        updateConversationPreview(convId, { lastMessage: msg.content, time: msg.time });
        setActiveConversation((prev) =>
          prev?.id === convId ? { ...prev, lastMessage: msg.content, time: msg.time } : prev
        );

      // ── IMAGE ─────────────────────────────────────────────────────────────
      } else if (payload.type === 'image') {
        const fd = new FormData();
        fd.append('file', payload.file);

        const up  = await messageApi.uploadImage(fd);
        const res = await messageApi.sendImage(convId, up.data.file.fileId, replyToMessageId, topicId);
        const msg = normalizeMsg(res.data.data);
        addMessage(convId, msg);
        updateConversationPreview(convId, { lastMessage: '[Hình ảnh]', time: msg.time });
        setActiveConversation((prev) =>
          prev?.id === convId ? { ...prev, lastMessage: '[Hình ảnh]', time: msg.time } : prev
        );

      // ── FILE ─────────────────────────────────────────────────────────────
      } else if (payload.type === 'file') {
        const fd = new FormData();
        fd.append('file', payload.file);

        const up  = await messageApi.uploadFile(fd);
        const res = await messageApi.sendFile(convId, up.data.file.fileId, replyToMessageId, topicId);
        const msg = normalizeMsg(res.data.data);
        addMessage(convId, msg);
        updateConversationPreview(convId, { lastMessage: msg.content, time: msg.time });
        setActiveConversation((prev) =>
          prev?.id === convId ? { ...prev, lastMessage: msg.content, time: msg.time } : prev
        );
      
      // ── POLL ─────────────────────────────────────────────────────────────
      } else if (payload.type === 'poll') {
        const { topic, options, multipleChoice } = payload;
        const res = await messageApi.createPoll(convId, { topic, options, multipleChoice });
        const msg = normalizeMsg(res.data);
        addMessage(convId, msg);
        updateConversationPreview(convId, { lastMessage: msg.content, time: msg.time });
        setActiveConversation((prev) =>
          prev?.id === convId ? { ...prev, lastMessage: msg.content, time: msg.time } : prev
        );
      }

    } catch (err) {
      console.error('handleSendMessage error:', err);
      if (err?.response?.status === 403) {
        if (payload.type === 'text' && resolvedConversation?.type === 'dm') {
          setMessages((prev) => ({
            ...prev,
            [convId]: (prev[convId] || []).map((m) =>
              m._id?.startsWith('temp_') ? { ...m, blocked: true } : m
            ),
          }));
        } else if (payload.type === 'text') {
          // Group permission errors (vd: nhóm khóa) không phải trạng thái "bị chặn người dùng".
          setMessages((prev) => ({
            ...prev,
            [convId]: (prev[convId] || []).filter((m) => !m._id?.startsWith('temp_')),
          }));
        }
        const otherUserId = resolvedConversation?.otherUserId || activeConversation?.otherUserId;
        if (resolvedConversation?.type === 'dm' && otherUserId) fetchDmBlockStatus(otherUserId);
      } else if (payload.type === 'text') {
        setMessages((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).filter((m) => !m._id?.startsWith('temp_')),
        }));
      }
    }
  }, [
    activeConversation, currentUser,
    setDmOverrides, upsertConversation, migrateMessages, setActiveConversation,
    addMessage, editMessageInState, updateConversationPreview, fetchDmBlockStatus,
  ]);

  const handlePollVote = useCallback(async (messageId, voteData) => {
    if (!activeConversation) return;
    try {
      const res = await messageApi.votePoll(messageId, voteData);
      const updatedMsg = normalizeMsg(res.data);
      updateMessage(activeConversation.id, messageId, () => updatedMsg);
    } catch (err) {
      console.error('handlePollVote error:', err);
    }
  }, [activeConversation, updateMessage]);

  return {
    messages,
    setMessages,
    loadMessages,
    addMessage,
    revokeMessage,
    editMessageInState,
    resetMessages,
    handleSendMessage,
    handlePollVote,
  };
};