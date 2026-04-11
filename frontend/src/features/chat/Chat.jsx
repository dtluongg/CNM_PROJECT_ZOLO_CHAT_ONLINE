import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Search, User } from 'lucide-react';
import LeftSidebar from './components/LeftSidebar';
import ChatArea from './components/ChatArea';
import RightSidebar from './components/RightSidebar';
import ProfileSettings from '../user/components/ProfileSettings';
import UserSearchModal from '../user/components/UserSearchModal';
import conversationApi from './api/conversationApi';
import friendApi from '../friends/api/friendApi';

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
  const isDm = item.type === 'dm';

  return {
    id: item._id,
    name: isDm
      ? (override?.name || item.name || 'Đoạn chat trực tiếp')
      : (item.name || 'Nhóm chưa đặt tên'),
    avatar: isDm ? (override?.avatar || item.avatar || null) : (item.avatar || null),
    lastMessage: item.lastMessagePreview || 'Chưa có tin nhắn',
    time: formatConversationTime(item.lastMessageTime || item.updatedAt || item.createdAt),
    unread: item.myMembership?.unreadCount || 0,
    type: item.type,
    online: false,
    memberCount: item.totalMembers,
    otherUserId: item.otherUserId || null,
    raw: item,
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
  { key: 'search',   icon: Search,        label: 'Tìm kiếm' },
  { key: 'profile',  icon: User,          label: 'Hồ sơ'    },
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

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeConversation, setActiveConversation] = useState(null);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [dmOverrides, setDmOverrides] = useState({});
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [friendsForGroup, setFriendsForGroup] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileView, setMobileView] = useState('list');   // 'list' | 'chat'
  const [mobileTab, setMobileTab] = useState('messages'); // for bottom nav highlight

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

  const handleSelectConversation = useCallback((conv) => {
    setActiveConversation(conv);
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
    );
    if (isMobile) {
      setMobileView('chat');
      setMobileTab('messages');
    }
  }, [isMobile]);

  const handleSendMessage = useCallback(async (text) => {
    if (!activeConversation || !text.trim()) return;

    const trimmedText = text.trim();
    let resolvedConversation = activeConversation;
    let resolvedConversationId = activeConversation.id;

    if (activeConversation.raw?.pendingDm && activeConversation.raw?.targetUserId) {
      try {
        const targetUserId = activeConversation.raw.targetUserId;
        const res = await conversationApi.createDmConversation(targetUserId, trimmedText);
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
        resolvedConversationId = createdConversationId;
      } catch (error) {
        window.alert(error.response?.data?.message || error.message || 'Không thể tạo cuộc trò chuyện');
        return;
      }
    }

    const newMsg = {
      id: Date.now(),
      senderId: 'me',
      senderName: 'Tôi',
      content: trimmedText,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };
    setMessages(prev => ({
      ...prev,
      [resolvedConversationId]: [...(prev[resolvedConversationId] || []), newMsg],
    }));
    setConversations((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === resolvedConversationId);

      if (existingIndex === -1) {
        return [{ ...resolvedConversation, lastMessage: trimmedText, time: newMsg.time }, ...prev];
      }

      return prev.map((c) => (
        c.id === resolvedConversationId
          ? { ...c, lastMessage: trimmedText, time: newMsg.time }
          : c
      ));
    });

    setActiveConversation((prev) => (
      prev?.id === resolvedConversationId
        ? { ...prev, lastMessage: trimmedText, time: newMsg.time }
        : prev
    ));
  }, [activeConversation]);

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
  const activeMessages = activeConversation ? messages[activeConversation.id] || [] : [];

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
              onSendMessage={handleSendMessage}
              onToggleRight={() => setShowRightSidebar(v => !v)}
              showRight={showRightSidebar}
              onBack={handleMobileBack}
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
          onSendMessage={handleSendMessage}
          onToggleRight={() => setShowRightSidebar(v => !v)}
          showRight={showRightSidebar}
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
