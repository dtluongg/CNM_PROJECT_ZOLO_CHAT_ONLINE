import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import friendApi from '../api/friendApi';
import conversationApi from '../../chat/api/conversationApi';

export const useFriendsData = () => {
  const navigate = useNavigate();

  const [friends, setFriends]           = useState([]);
  const [incomingReqs, setIncomingReqs] = useState([]);
  const [outgoingReqs, setOutgoingReqs] = useState([]);
  const [blockedList, setBlockedList]   = useState([]);
  const [loading, setLoading]           = useState(true);

  // ── Search ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);

  // ── Create group modal ───────────────────────────────────────────────────
  const [showCreateGroup, setShowCreateGroup]       = useState(false);
  const [groupName, setGroupName]                   = useState('');
  const [groupType, setGroupType]                   = useState('general');      // ← thêm
  const [groupDescription, setGroupDescription]     = useState('');             // ← thêm
  const [groupAvatarPreview, setGroupAvatarPreview] = useState(null);           // ← thêm
  const [groupAvatarFile, setGroupAvatarFile]       = useState(null);           // ← thêm
  const [selectedFriendIds, setSelectedFriendIds]   = useState([]);
  const [creatingChat, setCreatingChat]             = useState(false);
  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [friendRes, inReqRes, outReqRes, blockedRes] = await Promise.all([
        friendApi.getFriendList(true).catch(() => ({ data: { success: false } })),
        friendApi.getIncomingRequests().catch(() => ({ data: { success: false } })),
        friendApi.getOutgoingRequests().catch(() => ({ data: { success: false } })),
        friendApi.getBlockedList().catch(() => ({ data: { success: false } })),
      ]);

      if (friendRes.data?.success)  setFriends(friendRes.data.data || []);
      if (inReqRes.data?.success)   setIncomingReqs(inReqRes.data.data || []);
      if (outReqRes.data?.success)  setOutgoingReqs(outReqRes.data.data || []);
      if (blockedRes.data?.success) setBlockedList(blockedRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Friend request handlers ───────────────────────────────────────────────
  const handleAccept = useCallback(async (id) => {
    try {
      await friendApi.acceptRequest(id);
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  }, [fetchData]);

  const handleReject = useCallback(async (id) => {
    if (!window.confirm('Từ chối lời mời này?')) return;
    try {
      await friendApi.rejectRequest(id);
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  }, [fetchData]);

  const handleCancelRequest = useCallback(async (id) => {
    if (!window.confirm('Thu hồi lời mời đã gửi?')) return;
    try {
      await friendApi.cancelRequest(id);
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  }, [fetchData]);

  const handleUnfriend = useCallback(async (friendId) => {
    if (!window.confirm('Xóa người này khỏi danh sách bạn bè?')) return;
    try {
      await friendApi.unfriend(friendId);
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  }, [fetchData]);

  const handleUpdateNickname = useCallback(async (friendId) => {
    const newNickname = window.prompt('Nhập biệt danh mới cho người này:');
    if (newNickname === null) return;
    try {
      await friendApi.updateNickname(friendId, newNickname);
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || 'Không thể đổi biệt danh'));
    }
  }, [fetchData]);

  const handleBlockFriend = useCallback(async (friendId, iBlocked) => {
    const actionStr = iBlocked ? 'bỏ chặn' : 'chặn';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionStr} người này không?`)) return;
    try {
      await friendApi.blockFriend(friendId);
      alert(`Đã ${actionStr} thành công`);
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || `Không thể ${actionStr}`));
    }
  }, [fetchData]);

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearchGlobal = useCallback(async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.length < 2) return alert('Nhập ít nhất 2 ký tự');
    try {
      setIsSearching(true);
      const res = await friendApi.searchUsers(searchQuery);
      if (res.data.users) setSearchResults(res.data.users);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSendRequestGlobal = useCallback(async (targetId) => {
    try {
      await friendApi.sendRequest(targetId);
      alert('Đã gửi lời mời thành công!');
      fetchData();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  }, [fetchData]);

  // ── DM / navigation ───────────────────────────────────────────────────────
  const handleCreateDmFromFriend = useCallback((friend) => {
    navigate('/chat', {
      state: {
        pendingPeer: {
          id:     friend.friendId,
          name:   friend.displayName || friend.originalName || 'Đoạn chat trực tiếp',
          avatar: friend.avatar || '',
        },
      },
    });
  }, [navigate]);

  // ── Group modal helpers ───────────────────────────────────────────────────
  const toggleSelectFriend = useCallback((friendId) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  }, []);
  const handleAvatarFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupAvatarFile(file);
    setGroupAvatarPreview(URL.createObjectURL(file));
  }, []);


  const openCreateGroupModal = useCallback(() => {
    setGroupName('');
    setGroupType('general');          // ← thêm
    setGroupDescription('');          // ← thêm
    setGroupAvatarPreview(null);      // ← thêm
    setGroupAvatarFile(null);         // ← thêm
    setSelectedFriendIds([]);
    setShowCreateGroup(true);
  }, []);

  const handleCreateGroupConversation = useCallback(async () => {
    if (!groupName.trim()) { alert('Vui lòng nhập tên nhóm'); return; }
    if (selectedFriendIds.length < 2) { alert('Vui lòng chọn tối thiểu 2 người bạn để tạo nhóm'); return; }

    try {
      setCreatingChat(true);
      const res = await conversationApi.createGroupConversation({
        name:        groupName.trim(),
        memberIds:   selectedFriendIds,
        groupType,           // ← thêm nếu backend hỗ trợ
        description: groupDescription, // ← thêm nếu backend hỗ trợ
      });
      const conversationId = res?.data?.data?._id;
      if (!conversationId) throw new Error('Không nhận được conversationId từ server');

      setShowCreateGroup(false);
      navigate('/chat', { state: { openConversationId: conversationId } });
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreatingChat(false);
    }
  }, [groupName, selectedFriendIds, navigate]);

  return {
    // data
    friends, incomingReqs, outgoingReqs, blockedList, loading,
    // search
    searchQuery, setSearchQuery, searchResults, isSearching,
    handleSearchGlobal, handleSendRequestGlobal,
    // friend actions
    handleAccept, handleReject, handleCancelRequest,
    handleUnfriend, handleUpdateNickname, handleBlockFriend,
    handleCreateDmFromFriend,
    // group modal
    showCreateGroup, setShowCreateGroup,
    groupName, setGroupName,
    selectedFriendIds,
    creatingChat,
    toggleSelectFriend,
    openCreateGroupModal,
    handleCreateGroupConversation,
    groupType, setGroupType,                    // ← thêm
    groupDescription, setGroupDescription,      // ← thêm
    groupAvatarPreview,                         // ← thêm
    handleAvatarFileChange,                     // ← thêm
  };
};