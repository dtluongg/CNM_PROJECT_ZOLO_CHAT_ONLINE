import { useState, useCallback } from 'react';
import conversationApi from '../api/conversationApi';
import messageApi from '../api/messageApi';
import friendApi from '../../friends/api/friendApi';
import { formatConversationTime } from '../utils/formatTime';

const INVITE_MODE_BY_GROUP = {
  general: 'open_invite',
  gaming: 'open_invite',
  study: 'approval_required',
  project: 'approval_required',
  other: 'approval_required',
  sensitive: 'admin_only',
};

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
  const [groupType, setGroupType]                       = useState('general');
  const [groupDescription, setGroupDescription]         = useState('');
  const [groupAvatarFile, setGroupAvatarFile]           = useState(null);
  const [groupAvatarPreview, setGroupAvatarPreview]     = useState(null);
  const [selectedFriendIds, setSelectedFriendIds]       = useState([]);
  const [loadingFriends, setLoadingFriends]             = useState(false);
  const [creatingGroup, setCreatingGroup]               = useState(false);

  const handleOpenCreateGroup = useCallback(async () => {
    try {
      setShowCreateGroupModal(true);
      setGroupName('');
      setGroupType('general');
      setGroupDescription('');
      setGroupAvatarFile(null);
      setGroupAvatarPreview(null);
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

  const handleAvatarFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupAvatarFile(file);
    const url = URL.createObjectURL(file);
    setGroupAvatarPreview(url);
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

      // Upload avatar nếu có
      let avatarUrl = '';
      if (groupAvatarFile) {
        const formData = new FormData();
        formData.append('file', groupAvatarFile);
        const uploadRes = await messageApi.uploadImage(formData);
        console.log('Upload response:', uploadRes?.data); // xem structure thật
        avatarUrl = uploadRes?.data?.file?.url   // uploadController trả về { file: { url } }
                 || uploadRes?.data?.data?.url
                 || uploadRes?.data?.url
                 || '';

        console.log('avatarUrl to be saved:', avatarUrl); // phải có URL ở đây
      }

      const res     = await conversationApi.createGroupConversation({
        name:        groupName.trim(),
        avatar:      avatarUrl,
        memberIds:   selectedFriendIds,
        groupType,
        description: groupDescription,
        inviteMode: INVITE_MODE_BY_GROUP[groupType] || 'open_invite',
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
          groupType:   created.groupType || 'general',
          inviteMode:  created.inviteMode || INVITE_MODE_BY_GROUP[created.groupType || 'general'] || 'open_invite',
          description: created.description || '',
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
    fetchConversations, groupName, groupType, groupDescription, groupAvatarFile,
    isMobile, selectedFriendIds, setActiveConversation, setMobileView, setMobileTab,
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
    groupType, setGroupType,
    groupDescription, setGroupDescription,
    groupAvatarPreview,
    handleAvatarFileChange,
    selectedFriendIds,
    loadingFriends,
    creatingGroup,
    handleOpenCreateGroup,
    toggleSelectFriend,
    handleCreateGroup,
    handleLeaveGroup,
  };
};
