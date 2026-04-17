import { useState, useCallback } from 'react';
import conversationApi from '../api/conversationApi';
import friendApi from '../../friends/api/friendApi';
import { formatConversationTime } from '../utils/formatTime';

export const useGroupActions = ({
  isMobile,
  fetchConversations,
  setActiveConversation,
  setMessages,
  setMobileView,
  setMobileTab,
}) => {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [friendsForGroup, setFriendsForGroup]           = useState([]);
  const [groupName, setGroupName]                       = useState('');
  const [selectedFriendIds, setSelectedFriendIds]       = useState([]);
  const [loadingFriends, setLoadingFriends]             = useState(false);
  const [creatingGroup, setCreatingGroup]               = useState(false);

  const handleOpenCreateGroup = useCallback(async () => {
    try {
      setShowCreateGroupModal(true);
      setGroupName('');
      setSelectedFriendIds([]);
      setLoadingFriends(true);

      const res  = await friendApi.getFriendList();
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
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
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
      const res     = await conversationApi.createGroupConversation({
        name:      groupName.trim(),
        memberIds: selectedFriendIds,
      });
      const created         = res?.data?.data;
      const conversationId  = created?._id;

      if (!conversationId) throw new Error('Không nhận được conversationId từ server');

      await fetchConversations();
      setShowCreateGroupModal(false);
      setActiveConversation((prev) => {
        if (prev?.id === conversationId) return prev;
        return {
          id:          conversationId,
          name:        created.name || 'Nhóm mới',
          avatar:      created.avatar || null,
          lastMessage: created.lastMessagePreview || 'Chưa có tin nhắn',
          time:        formatConversationTime(created.lastMessageTime || created.updatedAt || created.createdAt),
          unread:      0,
          type:        'group',
          online:      false,
          memberCount: 1 + selectedFriendIds.length,
          raw:         created,
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
  }, [
    fetchConversations, groupName, isMobile,
    selectedFriendIds, setActiveConversation, setMobileView, setMobileTab,
  ]);

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
  }, [fetchConversations, setActiveConversation, setMessages]);

  return {
    showCreateGroupModal, setShowCreateGroupModal,
    friendsForGroup,
    groupName, setGroupName,
    selectedFriendIds,
    loadingFriends,
    creatingGroup,
    handleOpenCreateGroup,
    toggleSelectFriend,
    handleCreateGroup,
    handleLeaveGroup,
  };
};