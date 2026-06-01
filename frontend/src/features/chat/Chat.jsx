import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient';

import LeftSidebar from './components/LeftSidebar';
import ChatArea from './components/ChatArea';
import RightSidebar from './components/RightSidebar';
import BottomTabBar from './components/BottomTabBar';
import CreateGroupModal from './components/CreateGroupModal';
import ProfileSettings from '../user/components/ProfileSettings';
import UserSearchModal from '../user/components/UserSearchModal';

import { useAuth } from '../../context/AuthContext';
import { useCall } from '../call/CallContext';
import { useSocket } from './hooks/useSocket';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useBlockStatus } from './hooks/useBlockStatus';
import { useGroupActions } from './hooks/useGroupActions';
import { useNotifications } from '../../context/NotificationContext';
import { VoiceRoomProvider } from '../voice/VoiceRoomContext';
import VoiceRoomPanel from '../voice/components/VoiceRoomPanel';

const Chat = () => {
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { initiateCall } = useCall();
  const { markConversationRead } = useNotifications();

  // ── Layout state ────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileView, setMobileView] = useState('list');   // 'list' | 'chat'
  const [mobileTab, setMobileTab] = useState('messages');
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [activeTopic, setActiveTopic] = useState(null);
  const [topicsVersion, setTopicsVersion] = useState(0);
  const [myPermissions, setMyPermissions] = useState(null);


  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Block status ─────────────────────────────────────────────────────────
  const { dmBlockStatus, fetchDmBlockStatus } = useBlockStatus();

  // ── Conversations ────────────────────────────────────────────────────────
  const {
    conversations, setConversations,
    dmOverrides, setDmOverrides,
    activeConversation, setActiveConversation,
    fetchConversations,
    applyPendingPeer, applyDmOverride,
    updateConversationPreview,
    handleDeleteConversation: _handleDeleteConversation,
    upsertConversation,
  } = useConversations({ isMobile, setMobileView });

  // Keep a ref for socket callbacks
  const activeConvRef = useRef(null);
  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  // Reset active topic when switching conversations
  useEffect(() => { setActiveTopic(null); }, [activeConversation?.id]);

  // ── Messages ─────────────────────────────────────────────────────────────
  const {
    messages, setMessages,
    loadMessages,
    addMessage,
    revokeMessage,
    editMessageInState,
    resetMessages,
    handleSendMessage,
    handlePollVote,
  } = useMessages({
    currentUser,
    activeConversation,
    setActiveConversation,
    setDmOverrides,
    upsertConversation,
    updateConversationPreview,
    fetchDmBlockStatus,
  });

  // ── Socket ───────────────────────────────────────────────────────────────
  const socketRef = useSocket({
    token,
    currentUserId: currentUser?._id?.toString(),
    activeConvRef,
    onNewMessage: (conversationId, msg, convRef) => {
      addMessage(conversationId, msg);
      setConversations((prev) => prev.map((c) => {
        if (c.id !== conversationId) return c;
        const isActive = convRef.current?.id === conversationId;
        return { ...c, lastMessage: msg.content, time: msg.time, unread: isActive ? 0 : (c.unread || 0) + 1 };
      }));
    },
    onTyping: (conversationId, userId, displayName) => {
      setTypingUsers((prev) => ({ ...prev, [conversationId]: { userId, displayName } }));
    },
    onStopTyping: (conversationId) => {
      setTypingUsers((prev) => { const next = { ...prev }; delete next[conversationId]; return next; });
    },
    onMessageRevoked: (conversationId, messageId) => {
      revokeMessage(conversationId, messageId);
      setConversations((prev) => prev.map((c) =>
        c.id !== conversationId ? c : { ...c, lastMessage: '[Tin nhắn đã được thu hồi]' }
      ));
    },
    onMessageEdited: (conversationId, msg) => {
      editMessageInState(conversationId, msg);
      setConversations((prev) => prev.map((c) =>
        c.id !== conversationId ? c : { ...c, lastMessage: msg.content }
      ));
    },
    onUnreadReset: (conversationId) => {
      setConversations((prev) => prev.map((c) =>
        c.id === conversationId ? { ...c, unread: 0 } : c
      ));
    },
    onConversationUpdated: (conversationId, changes) => {
      // Update sidebar list
      setConversations((prev) => prev.map((c) => {
        if (c.id !== conversationId) return c;
        const patch = {};
        if (changes.name) patch.name = changes.name.newValue;
        if (changes.avatar) patch.avatar = changes.avatar.newValue;
        if (changes.description) patch.description = changes.description.newValue;
        if (changes.groupType) patch.groupType = changes.groupType.newValue;
        return { ...c, ...patch };
      }));
      // Update active conversation header in real-time
      setActiveConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        const patch = {};
        if (changes.name) patch.name = changes.name.newValue;
        if (changes.avatar) patch.avatar = changes.avatar.newValue;
        if (changes.description) patch.description = changes.description.newValue;
        if (changes.groupType) patch.groupType = changes.groupType.newValue;
        return { ...prev, ...patch };
      });
    },

  });

  // ── location state effects ────────────────────────────────────────────────
  useEffect(() => {
    const peer = location.state?.peer;
    const openConversationId = location.state?.openConversationId;
    if (peer && openConversationId) applyDmOverride(openConversationId, peer);
  }, [location.state, applyDmOverride]);


  useEffect(() => {
    const pendingPeer = location.state?.pendingPeer;
    if (!pendingPeer?.id) return;
    applyPendingPeer(pendingPeer);
    if (isMobile) { setMobileView('chat'); setMobileTab('messages'); }
  }, [location.state, isMobile, applyPendingPeer]);

  useEffect(() => {
    if (!activeConversation?.id) return;
    if (activeConversation.type === 'group') {
      loadMessages(activeConversation.id, activeTopic?._id || null);
      fetchMyPermissions(activeConversation.id, currentUser?._id?.toString());
    } else {
      // DM or other: load messages when active conversation changes
      loadMessages(activeConversation.id);
    }
  }, [activeTopic?._id, activeConversation?.id]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (activeConversation?.id) {
      markConversationRead(activeConversation.id);
    }
  }, [activeConversation?.id, markConversationRead]);

  // ── Select conversation ──────────────────────────────────────────────────
  const handleSelectConversation = useCallback(async (conv) => {
    if (activeConvRef.current?.id && socketRef.current) {
      socketRef.current.emit('chat:leave', { conversationId: activeConvRef.current.id });
    }
    setActiveConversation(conv);
    if (!conv) {
      if (isMobile) setMobileView('list');
      fetchDmBlockStatus(null);
      return;
    }
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));

    if (socketRef.current) socketRef.current.emit('chat:join', { conversationId: conv.id });
    if (isMobile) { setMobileView('chat'); setMobileTab('messages'); }
    if (conv.type === 'dm' && conv.otherUserId) fetchDmBlockStatus(conv.otherUserId);
    else fetchDmBlockStatus(null);

    await loadMessages(conv.id);
    if (conv.type === 'group') fetchMyPermissions(conv.id, currentUser?._id?.toString());

    else setMyPermissions(null);

  }, [isMobile, fetchDmBlockStatus, loadMessages, setActiveConversation, setConversations, socketRef]);

  // ── Voice Room ──────────────────────────────────────────────────────────
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [voiceRoomActive, setVoiceRoomActive] = useState(false);
  const handleVoiceRoom = useCallback(() => setShowVoicePanel(v => !v), []);

  // ── Calls ────────────────────────────────────────────────────────────────
  const handlePhoneCall = useCallback(() => {
    if (!activeConversation?.otherUserId) return;
    initiateCall({ _id: activeConversation.otherUserId, displayName: activeConversation.name, avatar: activeConversation.avatar || null }, 'audio');
  }, [activeConversation, initiateCall]);

  const handleVideoCall = useCallback(() => {
    if (!activeConversation?.otherUserId) return;
    initiateCall({ _id: activeConversation.otherUserId, displayName: activeConversation.name, avatar: activeConversation.avatar || null }, 'video');
  }, [activeConversation, initiateCall]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const handleViewProfile = useCallback((userId) => navigate(`/user/${userId}`), [navigate]);
  const handleMobileBack = useCallback(() => { setMobileView('list'); setShowRightSidebar(false); }, []);
  const handleMobileTabChange = useCallback((tab) => {
    setMobileTab(tab);
    if (tab === 'search') setShowUserSearch(true);
    if (tab === 'profile') setShowProfileSettings(true);
  }, []);

  // ── Delete conversation (wrapper to pass mobileView setter) ──────────────
  const handleDeleteConversation = useCallback((conversationId) => {
    _handleDeleteConversation(conversationId, activeConversation?.id, setMobileView);
  }, [_handleDeleteConversation, activeConversation?.id]);

  // ── Group actions ────────────────────────────────────────────────────────
  const {
    showCreateGroupModal, setShowCreateGroupModal,
    friendsForGroup, groupName, setGroupName,
    groupType, setGroupType,
    groupDescription, setGroupDescription,
    groupAvatarPreview, handleAvatarFileChange,
    selectedFriendIds, loadingFriends, creatingGroup,
    handleOpenCreateGroup, toggleSelectFriend,
    handleCreateGroup, handleLeaveGroup,
  } = useGroupActions({
    isMobile,
    fetchConversations,
    setActiveConversation,
    setMessages,
    setMobileView,
    setMobileTab,
  });

  // ── Derived values ───────────────────────────────────────────────────────
  const unreadTotal = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const activeMessages = (() => {
    if (!activeConversation) return [];
    if (activeConversation.type === 'group' && activeTopic?._id) {
      const key = `${activeConversation.id}__${activeTopic._id}`;
      return messages[key] || [];
    }
    return messages[activeConversation.id] || [];
  })();

  const activeTypingUser = activeConversation ? typingUsers[activeConversation.id] || null : null;
  const currentUserId = currentUser?._id?.toString() || null;

  // ── Shared sidebar/chat props ────────────────────────────────────────────
  const chatAreaProps = {
    conversation: activeConversation,
    messages: activeMessages,
    setMessages: (updater) => setMessages((prev) => ({
      ...prev,
      [activeConversation?.id]: updater(prev[activeConversation?.id] || []),
    })),
    currentUserId,
    typingUser: activeTypingUser,
    onSendMessage: handleSendMessage,
    onToggleRight: () => setShowRightSidebar((v) => !v),
    showRight: showRightSidebar,
    socket: socketRef.current,
    blockStatus: dmBlockStatus,
    onBlockStatusChanged: () => activeConversation?.otherUserId && fetchDmBlockStatus(activeConversation.otherUserId),
    onPhoneCall: handlePhoneCall,
    onVideoCall: handleVideoCall,
    onVoiceRoom: handleVoiceRoom,
    voiceRoomActive,
    onPollVote: handlePollVote,
    activeTopic,
    onTopicSelect: setActiveTopic,
    myPermissions,
    onViewProfile: handleViewProfile,
  };

  const rightSidebarProps = {
    conversation: activeConversation,
    onClose: () => setShowRightSidebar(false),
    onViewProfile: handleViewProfile,
    onLeaveGroup: handleLeaveGroup,
    onGroupUpdated: fetchConversations,
    onDeleteConversation: handleDeleteConversation,
    onBlockToggled: () => activeConversation?.otherUserId && fetchDmBlockStatus(activeConversation.otherUserId),
    onPhoneCall: handlePhoneCall,
    onVideoCall: handleVideoCall,
    activeTopic,
    myPermissions,
    onTopicSelect: setActiveTopic,
    onPermissionsChanged: () => activeConversation?.id && fetchMyPermissions(activeConversation.id),

  };
  const fetchMyPermissions = useCallback(async (conversationId, userId) => {
    if (!conversationId || !userId) return;
    try {
      const res = await apiClient.get(
        `/conversations/${conversationId}/members/${userId}/effective-permissions`
      );
      console.log('[myPermissions]', res.data?.data); // 👈 xem data có không
      setMyPermissions(res.data?.data || null);
    } catch (err) {
      console.error('[myPermissions] error:', err.response?.data);
      setMyPermissions(null);
    }
  }, []);


  // ── MOBILE LAYOUT ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <VoiceRoomProvider>
        <div style={{
          width: '100vw', height: '100%', background: 'var(--bg-primary)',
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* List panel */}
            <div style={{
              position: 'absolute', inset: 0,
              transform: mobileView === 'list' ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
              zIndex: mobileView === 'list' ? 2 : 1, willChange: 'transform',
            }}>
              <LeftSidebar
                conversations={conversations}
                activeConv={activeConversation}
                onSelectConv={handleSelectConversation}
                onOpenSettings={() => setShowProfileSettings(true)}
                onOpenSearch={() => setShowUserSearch(true)}
                onOpenCreateGroup={handleOpenCreateGroup}
                activeTopic={activeTopic}
                onTopicSelect={setActiveTopic}
                topicsVersion={topicsVersion}
                isMobile
              />
            </div>

            {/* Chat panel */}
            <div style={{
              position: 'absolute', inset: 0,
              transform: mobileView === 'chat' ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
              zIndex: mobileView === 'chat' ? 2 : 1, willChange: 'transform',
              display: 'flex', flexDirection: 'column',
            }}>
              <ChatArea {...chatAreaProps} onBack={handleMobileBack} isMobile />
            </div>
          </div>

          <BottomTabBar activeTab={mobileTab} onTabChange={handleMobileTabChange} unreadTotal={unreadTotal} />

          {showProfileSettings && (
            <ProfileSettings onClose={() => { setShowProfileSettings(false); setMobileTab('messages'); }} />
          )}
          {showUserSearch && (
            <UserSearchModal onClose={() => { setShowUserSearch(false); setMobileTab('messages'); }} />
          )}
          {showRightSidebar && activeConversation && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
              <RightSidebar {...rightSidebarProps} isMobile />
            </div>
          )}
          <VoiceRoomPanel
            visible={showVoicePanel}
            conversation={activeConversation}
            currentUserId={currentUserId}
            onClose={() => setShowVoicePanel(false)}
          />
        </div>
      </VoiceRoomProvider>
    );
  }

  // ── DESKTOP LAYOUT ───────────────────────────────────────────────────────
  return (
    <VoiceRoomProvider>
      <div style={{
        width: '100%', height: '100%', background: 'var(--bg-primary)',
        position: 'relative', display: 'flex', overflow: 'hidden',
      }}>
        <LeftSidebar
          conversations={conversations}
          activeConv={activeConversation}
          onSelectConv={handleSelectConversation}
          onOpenSettings={() => setShowProfileSettings(true)}
          onOpenSearch={() => setShowUserSearch(true)}
          onOpenCreateGroup={handleOpenCreateGroup}
          activeTopic={activeTopic}
          onTopicSelect={setActiveTopic}
          topicsVersion={topicsVersion}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <ChatArea {...chatAreaProps} />
        </div>

        {/* Right sidebar – always mounted, hidden via CSS to avoid unmount/layout-shift bug */}
        <div style={{
          width: showRightSidebar ? 'auto' : 0,
          overflow: showRightSidebar ? 'visible' : 'hidden',
          flexShrink: 0,
          transition: 'width 0.18s ease',
        }}>
          {activeConversation ? (
            <RightSidebar {...rightSidebarProps} />
          ) : (
            <div style={{
              width: 280, minWidth: 280, height: '100%',
              borderLeft: '1px solid var(--border)', background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center',
            }}>
              Chọn một cuộc trò chuyện để xem thông tin chi tiết.
            </div>
          )}
        </div>

        {showProfileSettings && <ProfileSettings onClose={() => setShowProfileSettings(false)} />}
        {showUserSearch && <UserSearchModal onClose={() => setShowUserSearch(false)} />}

        {showCreateGroupModal && (
          <CreateGroupModal
            groupName={groupName}
            setGroupName={setGroupName}
            groupType={groupType}
            setGroupType={setGroupType}
            groupDescription={groupDescription}
            setGroupDescription={setGroupDescription}
            groupAvatarPreview={groupAvatarPreview}
            onAvatarFileChange={handleAvatarFileChange}
            selectedFriendIds={selectedFriendIds}
            friendsForGroup={friendsForGroup}
            loadingFriends={loadingFriends}
            creatingGroup={creatingGroup}
            onToggleSelectFriend={toggleSelectFriend}
            onCreateGroup={handleCreateGroup}
            onClose={() => setShowCreateGroupModal(false)}
          />
        )}

        <VoiceRoomPanel
          visible={showVoicePanel}
          conversation={activeConversation}
          currentUserId={currentUserId}
          onClose={() => setShowVoicePanel(false)}
        />
      </div>
    </VoiceRoomProvider>
  );
};

export default Chat;