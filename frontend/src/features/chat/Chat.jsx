import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MessageCircle, Search, User } from 'lucide-react';
import LeftSidebar from './components/LeftSidebar';
import ChatArea from './components/ChatArea';
import RightSidebar from './components/RightSidebar';
import ProfileSettings from '../user/components/ProfileSettings';
import UserSearchModal from '../user/components/UserSearchModal';
import conversationApi from './api/conversationApi';
import messageApi from './api/messageApi';
import friendApi from '../friends/api/friendApi';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../call/CallContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2026';

const formatConversationTime = (isoString) => {
  if (!isoString) return '';

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const mapConversationItem = (item, dmOverrides) => {
  const override = dmOverrides[item._id] || null;
  const isDm     = item.type === 'dm';
  const other    = isDm ? item.otherUser : null;

  return {
    id:          item._id,
    name:        isDm
      ? (override?.name    || other?.displayName || item.name || 'Đoạn chat trực tiếp')
      : (item.name || 'Nhóm chưa đặt tên'),
    avatar:      isDm
      ? (override?.avatar  || other?.avatar      || item.avatar || null)
      : (item.avatar || null),
    otherUserId: isDm ? (other?._id?.toString() || null) : null,
    lastMessage: item.lastMessagePreview || 'Chưa có tin nhắn',
    time:        formatConversationTime(item.lastMessageTime || item.updatedAt || item.createdAt),
    unread:      item.myMembership?.unreadCount || 0,
    type:        item.type,
    online:      false,
    memberCount: item.totalMembers,
    otherUserId: isDm ? (item.otherUserId || other?._id?.toString() || null) : null,
    raw:         item,
  };
};

const buildPendingDmConversation = (peer) => ({
  id: `pending-dm-${peer.id}`,
  name: peer.name || 'Đoạn chat trực tiếp',
  avatar: peer.avatar || null,
  lastMessage: 'Chưa có tin nhắn',
  time: '',
  unread: 0,
  type: 'dm',
  online: false,
  memberCount: 2,
  otherUserId: peer.id,
  raw: {
    pendingDm: true,
    targetUserId: peer.id,
  },
});

const BOTTOM_TABS = [
  { key: 'messages', icon: MessageCircle, label: 'Tin nhắn' },
  { key: 'search', icon: Search, label: 'Tìm kiếm' },
  { key: 'profile', icon: User, label: 'Hồ sơ' },
];

function BottomTabBar({ activeTab, onTabChange, unreadTotal }) {
  return (
    <div style={{
      height: 56,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      flexShrink: 0,
      zIndex: 20,
    }}>
      {/* eslint-disable-next-line no-unused-vars */}
      {BOTTOM_TABS.map(({ key, icon: Icon, label }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.15s',
              position: 'relative',
              minHeight: 0,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                fill={active && key === 'messages' ? 'var(--accent)' : 'none'}
              />
              {key === 'messages' && unreadTotal > 0 && !active && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  minWidth: 16, height: 16, background: '#ed4245', color: '#fff',
                  borderRadius: 8, fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '2px solid var(--bg-secondary)',
                }}>
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.2 }}>
              {label}
            </span>
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 3, background: 'var(--accent)', borderRadius: '0 0 4px 4px',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Normalize message từ API → format UI ────────────────────────────────────
const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};
const normalizeMsg = (msg) => ({ ...msg, time: fmtTime(msg.createdAt) });

const Chat = () => {
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  const { initiateCall } = useCall();

  const location = useLocation();
  const [activeConversation, setActiveConversation] = useState(null);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // convId → { userId, displayName }
  const [dmOverrides, setDmOverrides] = useState({});

  // Socket ref
  const socketRef = useRef(null);
  // Keep active conversation accessible inside socket callbacks
  const activeConvRef = useRef(null);
  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [friendsForGroup, setFriendsForGroup] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileView, setMobileView] = useState('list');   // 'list' | 'chat'
  const [mobileTab, setMobileTab] = useState('messages'); // for bottom nav highlight
  const [sendBlockError, setSendBlockError] = useState(''); // thông báo khi bị chặn
  const blockErrorTimerRef = useRef(null);
  const [dmBlockStatus, setDmBlockStatus] = useState(null); // { iBlocked, theyBlockedMe } for active DM

  const fetchConversations = useCallback(async () => {
    try {
      const res = await conversationApi.listMyConversations('exclude');
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
          // Nếu đang là pending DM, thử tìm conversation thực trong danh sách
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
  }, [dmOverrides, isMobile, location.state?.openConversationId]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Socket.io connection ──────────────────────────────────────────────────
  useEffect(() => {
    const accessToken = token || localStorage.getItem('accessToken');
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    // Nhận tin nhắn mới
    socket.on('chat:new-message', ({ conversationId, message }) => {
      const msg = normalizeMsg(message);

      setMessages(prev => {
        const list = prev[conversationId] || [];
        // Tránh duplicate nếu người gửi đã optimistic update
        if (list.some(m => m._id?.toString() === msg._id?.toString())) return prev;
        return { ...prev, [conversationId]: [...list, msg] };
      });

      // Cập nhật preview + unread ở sidebar
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c;
        const isActive = activeConvRef.current?.id === conversationId;
        return {
          ...c,
          lastMessage: msg.content,
          time: msg.time,
          unread: isActive ? 0 : (c.unread || 0) + 1,
        };
      }));
    });

    // Typing indicator
    socket.on('chat:typing', ({ conversationId, userId, displayName }) => {
      if (userId === currentUser?._id?.toString()) return;
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: { userId, displayName },
      }));
    });

    socket.on('chat:stop-typing', ({ conversationId }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    });

    // Thu hồi tin nhắn
    socket.on('chat:message-revoked', ({ conversationId, messageId }) => {
      // 1. Cập nhật list tin nhắn nếu đang mở conv này
      setMessages(prev => {
        const list = prev[conversationId] || [];
        if (list.length === 0) return prev;
        return {
          ...prev,
          [conversationId]: list.map(m =>
            (m._id || m.id)?.toString() === messageId?.toString()
              ? { ...m, revoked: true }
              : m
          )
        };
      });

      // 2. Cập nhật preview ở sidebar
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c;
        // Nếu tin nhắn bị thu hồi chính là tin nhắn cuối cùng hiển thị ở sidebar
        // (Đây là một ước lượng đơn giản, DB đã cập nhật rồi nhưng socket này giúp update UI nhanh)
        // Lưu ý: Nếu muốn chính xác 100% thì BE nên gửi kèm preview mới hoặc client tự check.
        // Ở đây ta đơn giản là đổi preview thành "[Tin nhắn đã được thu hồi]"
        return {
          ...c,
          lastMessage: '[Tin nhắn đã được thu hồi]'
        };
      }));
    });

    // Chỉnh sửa tin nhắn
    socket.on('chat:message-edited', ({ conversationId, message }) => {
      const msg = normalizeMsg(message);

      // 1. Cập nhật list tin nhắn - Sử dụng MERGE logic
      setMessages(prev => {
        const list = prev[conversationId] || [];
        if (list.length === 0) return prev;
        return {
          ...prev,
          [conversationId]: list.map(m =>
            (m._id || m.id)?.toString() === msg._id?.toString()
              ? { ...m, ...msg } // Merge để giữ lại reactions/myReaction
              : m
          )
        };
      });

      // 2. Cập nhật preview ở sidebar
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          lastMessage: msg.content,
        };
      }));
    });

    // Reset unread count khi bản thân đọc tin ở thiết bị khác hoặc qua API
    socket.on('chat:unread-reset', ({ conversationId }) => {
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unread: 0 } : c
      ));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const peer = location.state?.peer;
    const openConversationId = location.state?.openConversationId;

    if (peer && openConversationId) {
      setDmOverrides((prev) => ({
        ...prev,
        [openConversationId]: {
          id: peer.id,
          name: peer.name,
          avatar: peer.avatar,
        },
      }));
    }
  }, [location.state]);

  useEffect(() => {
    const pendingPeer = location.state?.pendingPeer;
    if (!pendingPeer?.id) return;

    setActiveConversation(buildPendingDmConversation(pendingPeer));
    if (isMobile) {
      setMobileView('chat');
      setMobileTab('messages');
    }
  }, [isMobile, location.state]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchDmBlockStatus = useCallback(async (otherUserId) => {
    if (!otherUserId) { setDmBlockStatus(null); return; }
    try {
      const res = await friendApi.getFriendStatus(otherUserId);
      const d = res?.data?.data;
      setDmBlockStatus(d ? { iBlocked: !!d.iBlocked, theyBlockedMe: !!d.theyBlockedMe } : null);
    } catch {
      setDmBlockStatus(null);
    }
  }, []);

  const handleSelectConversation = useCallback(async (conv) => {
    // Rời conversation cũ khỏi socket room
    if (activeConvRef.current?.id && socketRef.current) {
      socketRef.current.emit('chat:leave', { conversationId: activeConvRef.current.id });
    }

    setActiveConversation(conv);
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
    );

    // Tham gia conversation room mới (typing indicators)
    if (socketRef.current) {
      socketRef.current.emit('chat:join', { conversationId: conv.id });
    }

    if (isMobile) {
      setMobileView('chat');
      setMobileTab('messages');
    }

    // Lấy trạng thái chặn cho DM
    if (conv.type === 'dm' && conv.otherUserId) {
      fetchDmBlockStatus(conv.otherUserId);
    } else {
      setDmBlockStatus(null);
    }

    // Load messages nếu chưa có
    if (messages[conv.id]) return;
    try {
      const res = await messageApi.getMessages(conv.id);
      const msgs = (res.data.messages || []).map(normalizeMsg);
      setMessages(prev => ({ ...prev, [conv.id]: msgs }));
    } catch (err) {
      console.error('Load messages error:', err);
      setMessages(prev => ({ ...prev, [conv.id]: [] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, messages, fetchDmBlockStatus]);

  // ── Cuộc gọi ───────────────────────────────────────────────────────────
  const handlePhoneCall = useCallback(() => {
    if (!activeConversation?.otherUserId) return;
    initiateCall({
      _id:         activeConversation.otherUserId,
      displayName: activeConversation.name,
      avatar:      activeConversation.avatar || null,
    }, 'audio');
  }, [activeConversation, initiateCall]);

  const handleVideoCall = useCallback(() => {
    if (!activeConversation?.otherUserId) return;
    initiateCall({
      _id:         activeConversation.otherUserId,
      displayName: activeConversation.name,
      avatar:      activeConversation.avatar || null,
    }, 'video');
  }, [activeConversation, initiateCall]);

  // ── Gửi tin nhắn (text | voice | file | image) ──────────────────────────
  // payload: { type: 'text', content } | { type: 'voice', blob, duration }
  //          | { type: 'file', file } | { type: 'image', file }
  const handleSendMessage = useCallback(async (payload) => {
    if (!activeConversation) return;

    let resolvedConversation = activeConversation;
    let convId = activeConversation.id;

    if (payload.type === 'text' && !payload.isEdit && activeConversation.raw?.pendingDm && activeConversation.raw?.targetUserId) {
      const content = payload.content?.trim();
      if (!content) return;

      try {
        const targetUserId = activeConversation.raw.targetUserId;
        const res = await conversationApi.createDmConversation(targetUserId, content);
        const createdConversation = res?.data?.data;
        const createdConversationId = createdConversation?._id;

        if (!createdConversationId) {
          throw new Error('Không nhận được conversationId từ server');
        }

        const override = {
          id: targetUserId,
          name: activeConversation.name,
          avatar: activeConversation.avatar || '',
        };

        setDmOverrides((prev) => ({
          ...prev,
          [createdConversationId]: override,
        }));

        const mappedCreated = mapConversationItem(createdConversation, {
          [createdConversationId]: override,
        });

        setConversations((prev) => {
          const withoutPending = prev.filter((c) => c.id !== activeConversation.id);
          const existingIndex = withoutPending.findIndex((c) => c.id === mappedCreated.id);

          if (existingIndex >= 0) {
            const next = [...withoutPending];
            next[existingIndex] = { ...next[existingIndex], ...mappedCreated };
            return next;
          }

          return [mappedCreated, ...withoutPending];
        });

        setMessages((prev) => {
          const next = { ...prev };
          const pendingMessages = next[activeConversation.id] || [];
          delete next[activeConversation.id];
          next[createdConversationId] = pendingMessages;
          return next;
        });

        setActiveConversation(mappedCreated);
        resolvedConversation = mappedCreated;
        convId = createdConversationId;
      } catch (error) {
        window.alert(error.response?.data?.message || error.message || 'Không thể tạo cuộc trò chuyện');
        return;
      }
    }

    const myId   = currentUser?._id?.toString() || 'me';
    const myName = currentUser?.displayName || 'Tôi';
    const myAvatar = currentUser?.avatar || null;

    try {
      if (payload.type === 'text' && !payload.isEdit) {
        const { content } = payload;
        if (!content?.trim()) return;

        // Optimistic UI
        const tempId = `temp_${Date.now()}`;
        const now = new Date().toISOString();
        const tempMsg = {
          _id: tempId, senderId: myId, senderName: myName, avatar: myAvatar,
          type: 'text', content: content.trim(), payload: {},
          time: fmtTime(now), createdAt: now,
        };
        setMessages(prev => ({ ...prev, [convId]: [...(prev[convId] || []), tempMsg] }));

        const res    = await messageApi.sendText(convId, content.trim());
        const real   = normalizeMsg(res.data.data);
        const realId = real._id?.toString();

        // Replace temp with real; also remove any socket-delivered copy to prevent duplicate keys
        setMessages(prev => {
          const list    = prev[convId] || [];
          const cleaned = list.filter(m => m._id?.toString() !== realId); // remove socket copy if any
          return {
            ...prev,
            [convId]: cleaned.map(m => m._id === tempId ? real : m),
          };
        });

        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, lastMessage: content.trim(), time: real.time } : c
        ));
        setActiveConversation((prev) => (
          prev?.id === convId ? { ...resolvedConversation, ...prev, lastMessage: content.trim(), time: real.time } : prev
        ));

      } else if (payload.isEdit && payload.type === 'text') {
        const { content, messageId } = payload;
        if (!content?.trim()) return;

        // Gọi API sửa
        const res = await messageApi.editMessage(messageId, content.trim());
        const real = normalizeMsg(res.data.data);

        // Cập nhật messages state - Sử dụng MERGE logic
        setMessages(prev => {
          const list = prev[convId] || [];
          return {
            ...prev,
            [convId]: list.map(m =>
              (m._id || m.id)?.toString() === messageId?.toString()
                ? { ...m, ...real } // Merge để giữ lại reactions
                : m
            )
          };
        });

        // Cập nhật preview sidebar
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, lastMessage: content.trim() } : c
        ));
      } else if (payload.type === 'voice') {
        const { blob, duration } = payload;
        const fd = new FormData();
        fd.append('voice', blob, 'voice.webm');
        if (duration) fd.append('duration', String(Math.round(duration)));

        const up  = await messageApi.uploadVoice(fd);
        const res = await messageApi.sendVoice(convId, up.data.voice.fileId);
        const msg = normalizeMsg(res.data.data);
        const voiceId = msg._id?.toString();

        setMessages(prev => {
          const list = prev[convId] || [];
          if (list.some(m => m._id?.toString() === voiceId)) return prev;
          return { ...prev, [convId]: [...list, msg] };
        });
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, lastMessage: msg.content, time: msg.time } : c
        ));
        setActiveConversation((prev) => (
          prev?.id === convId ? { ...prev, lastMessage: msg.content, time: msg.time } : prev
        ));

      } else if (payload.type === 'image') {
        const fd = new FormData();
        fd.append('file', payload.file);

        const up  = await messageApi.uploadImage(fd);
        const res = await messageApi.sendImage(convId, up.data.file.fileId);
        const msg = normalizeMsg(res.data.data);
        const imgId = msg._id?.toString();

        setMessages(prev => {
          const list = prev[convId] || [];
          if (list.some(m => m._id?.toString() === imgId)) return prev;
          return { ...prev, [convId]: [...list, msg] };
        });
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, lastMessage: '[Hình ảnh]', time: msg.time } : c
        ));
        setActiveConversation((prev) => (
          prev?.id === convId ? { ...prev, lastMessage: '[Hình ảnh]', time: msg.time } : prev
        ));

      } else if (payload.type === 'file') {
        const fd = new FormData();
        fd.append('file', payload.file);

        const up  = await messageApi.uploadFile(fd);
        const res = await messageApi.sendFile(convId, up.data.file.fileId);
        const msg = normalizeMsg(res.data.data);
        const fileId = msg._id?.toString();

        setMessages(prev => {
          const list = prev[convId] || [];
          if (list.some(m => m._id?.toString() === fileId)) return prev;
          return { ...prev, [convId]: [...list, msg] };
        });
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, lastMessage: msg.content, time: msg.time } : c
        ));
        setActiveConversation((prev) => (
          prev?.id === convId ? { ...prev, lastMessage: msg.content, time: msg.time } : prev
        ));
      }
    } catch (err) {
      console.error('handleSendMessage error:', err);
      if (err?.response?.status === 403) {
        // Khi bị chặn: giữ lại tin nhắn optimistic nhưng đánh dấu là blocked
        if (payload.type === 'text') {
          setMessages(prev => ({
            ...prev,
            [convId]: (prev[convId] || []).map(m =>
              m._id?.startsWith('temp_') ? { ...m, blocked: true } : m
            ),
          }));
        }
        // Refresh block status để cập nhật UI
        const otherUserId = resolvedConversation?.otherUserId || activeConversation?.otherUserId;
        if (otherUserId) fetchDmBlockStatus(otherUserId);
      } else if (payload.type === 'text') {
        // Xóa optimistic message nếu lỗi khác
        setMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).filter(m => !m._id?.startsWith('temp_')),
        }));
      }
    }
  }, [activeConversation, currentUser]);

  const handleViewProfile = useCallback((userId) => {
    navigate(`/user/${userId}`);
  }, [navigate]);

  const handleMobileBack = useCallback(() => {
    setMobileView('list');
    setShowRightSidebar(false);
  }, []);

  const handleMobileTabChange = useCallback((tab) => {
    setMobileTab(tab);
    if (tab === 'search') {
      setShowUserSearch(true);
    } else if (tab === 'profile') {
      setShowProfileSettings(true);
    } else if (tab === 'messages') {
      if (mobileView === 'chat') {
        // stay in chat, just highlight tab
      }
    }
  }, [mobileView]);

  const handleOpenCreateGroup = useCallback(async () => {
    try {
      setShowCreateGroupModal(true);
      setGroupName('');
      setSelectedFriendIds([]);
      setLoadingFriends(true);

      const res = await friendApi.getFriendList();
      const list = res?.data?.success ? (res.data.data || []) : [];
      setFriendsForGroup(list);
    } catch (error) {
      console.error('Failed to load friend list for group create:', error);
      setFriendsForGroup([]);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const toggleSelectFriend = useCallback((friendId) => {
    setSelectedFriendIds((prev) => {
      if (prev.includes(friendId)) return prev.filter((id) => id !== friendId);
      return [...prev, friendId];
    });
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      window.alert('Vui lòng nhập tên nhóm');
      return;
    }

    if (selectedFriendIds.length < 2) {
      window.alert('Vui lòng chọn tối thiểu 2 người bạn để tạo nhóm');
      return;
    }

    try {
      setCreatingGroup(true);
      const res = await conversationApi.createGroupConversation({
        name: groupName.trim(),
        memberIds: selectedFriendIds,
      });

      const created = res?.data?.data;
      const conversationId = created?._id;

      if (!conversationId) {
        throw new Error('Không nhận được conversationId từ server');
      }

      await fetchConversations();

      setShowCreateGroupModal(false);
      setActiveConversation((prev) => {
        if (prev?.id === conversationId) return prev;
        return {
          id: conversationId,
          name: created.name || 'Nhóm mới',
          avatar: created.avatar || null,
          lastMessage: created.lastMessagePreview || 'Chưa có tin nhắn',
          time: formatConversationTime(created.lastMessageTime || created.updatedAt || created.createdAt),
          unread: 0,
          type: 'group',
          online: false,
          memberCount: 1 + selectedFriendIds.length,
          raw: created,
        };
      });

      if (isMobile) {
        setMobileView('chat');
        setMobileTab('messages');
      }
    } catch (error) {
      window.alert(error.response?.data?.message || error.message || 'Không thể tạo nhóm chat');
    } finally {
      setCreatingGroup(false);
    }
  }, [fetchConversations, groupName, isMobile, selectedFriendIds]);

  const handleLeaveGroup = useCallback(async (conversationId) => {
    if (!conversationId) return;
    const ok = window.confirm('Bạn có chắc chắn muốn rời nhóm này?');
    if (!ok) return;

    try {
      await conversationApi.leaveConversation(conversationId);
      setMessages((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      await fetchConversations();
      setActiveConversation((prev) => (prev?.id === conversationId ? null : prev));
    } catch (error) {
      window.alert(error.response?.data?.message || 'Không thể rời nhóm');
    }
  }, [fetchConversations]);

  const handleDeleteConversation = useCallback(async (conversationId) => {
    if (!conversationId) return;

    const activeId = activeConversation?.id;

    // Conversation tạm (chưa tạo DB) chỉ cần dọn local state.
    if (conversationId.startsWith('pending-dm-')) {
      setMessages((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      setActiveConversation((prev) => (prev?.id === conversationId ? null : prev));
      return;
    }

    const ok = window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này ở phía bạn?');
    if (!ok) return;

    try {
      await conversationApi.deleteConversationForMe(conversationId);

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setMessages((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      setActiveConversation((prev) => (prev?.id === conversationId ? null : prev));

      if (isMobile && activeId === conversationId) {
        setMobileView('list');
      }
    } catch (error) {
      window.alert(error.response?.data?.message || 'Không thể xóa cuộc trò chuyện');
    }
  }, [activeConversation?.id, isMobile]);

  const unreadTotal = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const activeMessages     = activeConversation ? messages[activeConversation.id] || [] : [];
  const activeTypingUser   = activeConversation ? typingUsers[activeConversation.id] || null : null;
  const currentUserId      = currentUser?._id?.toString() || null;

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    return (
      <div style={{
        width: '100vw', height: '100%',
        background: 'var(--bg-primary)',
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Sliding views container */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* ── Conversation List (slides from left) ── */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: mobileView === 'list' ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            zIndex: mobileView === 'list' ? 2 : 1,
            willChange: 'transform',
          }}>
            <LeftSidebar
              conversations={conversations}
              activeConv={activeConversation}
              onSelectConv={handleSelectConversation}
              onOpenSettings={() => setShowProfileSettings(true)}
              onOpenSearch={() => setShowUserSearch(true)}
              onOpenCreateGroup={handleOpenCreateGroup}
              isMobile
            />
          </div>

          {/* ── Chat Area (slides from right) ── */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: mobileView === 'chat' ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            zIndex: mobileView === 'chat' ? 2 : 1,
            willChange: 'transform',
            display: 'flex', flexDirection: 'column',
          }}>
            <ChatArea
              conversation={activeConversation}
              messages={activeMessages}
              setMessages={(updater) => setMessages(prev => ({
                ...prev,
                [activeConversation?.id]: updater(prev[activeConversation?.id] || [])
              }))}
              currentUserId={currentUserId}
              typingUser={activeTypingUser}
              onSendMessage={handleSendMessage}
              onToggleRight={() => setShowRightSidebar(v => !v)}
              showRight={showRightSidebar}
              onBack={handleMobileBack}
              socket={socketRef.current}
              sendBlockError={sendBlockError}
              blockStatus={dmBlockStatus}
              onBlockStatusChanged={() => activeConversation?.otherUserId && fetchDmBlockStatus(activeConversation.otherUserId)}
              onPhoneCall={handlePhoneCall}
              onVideoCall={handleVideoCall}
              isMobile
            />
          </div>
        </div>

        {/* ── Bottom Navigation Bar ── */}
        <BottomTabBar
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
          unreadTotal={unreadTotal}
        />

        {/* ── Modals ── */}
        {showProfileSettings && (
          <ProfileSettings onClose={() => { setShowProfileSettings(false); setMobileTab('messages'); }} />
        )}
        {showUserSearch && (
          <UserSearchModal onClose={() => { setShowUserSearch(false); setMobileTab('messages'); }} />
        )}

        {/* Right sidebar as full-screen overlay on mobile */}
        {showRightSidebar && activeConversation && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <RightSidebar
              conversation={activeConversation}
              onClose={() => setShowRightSidebar(false)}
              onViewProfile={handleViewProfile}
              onLeaveGroup={handleLeaveGroup}
              onGroupUpdated={fetchConversations}
              onDeleteConversation={handleDeleteConversation}
              onBlockToggled={() => activeConversation?.otherUserId && fetchDmBlockStatus(activeConversation.otherUserId)}
              onPhoneCall={handlePhoneCall}
              onVideoCall={handleVideoCall}
              isMobile
            />
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ── */
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-primary)',
      position: 'relative',
      display: 'flex', overflow: 'hidden',
    }}>
      {/* Left Sidebar */}
      <LeftSidebar
        conversations={conversations}
        activeConv={activeConversation}
        onSelectConv={handleSelectConversation}
        onOpenSettings={() => setShowProfileSettings(true)}
        onOpenSearch={() => setShowUserSearch(true)}
        onOpenCreateGroup={handleOpenCreateGroup}
      />

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <ChatArea
          conversation={activeConversation}
          messages={activeMessages}
          setMessages={(updater) => setMessages(prev => ({
            ...prev,
            [activeConversation?.id]: updater(prev[activeConversation?.id] || [])
          }))}
          currentUserId={currentUserId}
          typingUser={activeTypingUser}
          onSendMessage={handleSendMessage}
          onToggleRight={() => setShowRightSidebar(v => !v)}
          showRight={showRightSidebar}
          socket={socketRef.current}
          sendBlockError={sendBlockError}
          blockStatus={dmBlockStatus}
          onBlockStatusChanged={() => activeConversation?.otherUserId && fetchDmBlockStatus(activeConversation.otherUserId)}
          onPhoneCall={handlePhoneCall}
          onVideoCall={handleVideoCall}
        />
      </div>

      {/* Right Sidebar */}
      {showRightSidebar && (
        <div style={{ flexShrink: 0 }}>
          {activeConversation ? (
            <RightSidebar
              conversation={activeConversation}
              onClose={() => setShowRightSidebar(false)}
              onViewProfile={handleViewProfile}
              onLeaveGroup={handleLeaveGroup}
              onGroupUpdated={fetchConversations}
              onDeleteConversation={handleDeleteConversation}
              onBlockToggled={() => activeConversation?.otherUserId && fetchDmBlockStatus(activeConversation.otherUserId)}
              onPhoneCall={handlePhoneCall}
              onVideoCall={handleVideoCall}
            />
          ) : (
            <div style={{
              width: 280,
              minWidth: 280,
              height: '100%',
              borderLeft: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 13,
              textAlign: 'center',
            }}>
              Chọn một cuộc trò chuyện để xem thông tin chi tiết.
            </div>
          )}
        </div>
      )}

      {showProfileSettings && <ProfileSettings onClose={() => setShowProfileSettings(false)} />}
      {showUserSearch && <UserSearchModal onClose={() => setShowUserSearch(false)} />}

      {showCreateGroupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingGroup) {
              setShowCreateGroupModal(false);
            }
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: 540,
            maxHeight: '80vh',
            overflow: 'hidden',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '16px 18px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 18 }}>Tạo nhóm chat</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                Chọn tối thiểu 2 người bạn để tạo nhóm
              </div>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                placeholder="Nhập tên nhóm..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  padding: '10px 12px',
                  outline: 'none',
                  fontSize: 14,
                }}
              />

              <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>
                Bạn bè đã chọn: {selectedFriendIds.length}
              </div>

              <div style={{
                maxHeight: 320,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 8,
                background: 'var(--bg-primary)',
              }}>
                {loadingFriends && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>
                    Đang tải danh sách bạn bè...
                  </div>
                )}

                {!loadingFriends && friendsForGroup.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>
                    Bạn chưa có bạn bè để tạo nhóm.
                  </div>
                )}

                {!loadingFriends && friendsForGroup.map((f) => {
                  const checked = selectedFriendIds.includes(f.friendId);
                  return (
                    <label
                      key={f.friendshipId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: checked ? 'var(--bg-hover)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectFriend(f.friendId)}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
                          {f.displayName}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {f.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                disabled={creatingGroup}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '9px 14px',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim() || selectedFriendIds.length < 2}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '9px 14px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 700,
                  opacity: (creatingGroup || !groupName.trim() || selectedFriendIds.length < 2) ? 0.6 : 1,
                }}
              >
                {creatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
