import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import FriendsSidebar   from './components/FriendsSidebar';
import FriendsList      from './components/FriendsList';
import FriendRequests   from './components/FriendRequests';
import BlockedList      from './components/BlockedList';
import CreateGroupModal from '../chat/components/CreateGroupModal';

import { useFriendsData }    from './hooks/useFriendsData';
import { filterFriends }     from './utils/friendHelpers';

const FriendsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab]           = useState('friends_list');
  const [friendFilterText, setFriendFilterText] = useState('');

  useEffect(() => {
    const targetTab = location.state?.activeTab;
    if (targetTab && ['friends_list', 'friend_requests', 'blocked_list'].includes(targetTab)) {
      setActiveTab(targetTab);
    }
  }, [location.state]);

  const {
    friends, incomingReqs, outgoingReqs, blockedList, loading,
    searchQuery, setSearchQuery, searchResults, isSearching,
    handleSearchGlobal, handleSendRequestGlobal,
    handleAccept, handleReject, handleCancelRequest,
    handleUnfriend, handleUpdateNickname, handleBlockFriend,
    handleCreateDmFromFriend,
    showCreateGroup, setShowCreateGroup,
    groupName, setGroupName,
    groupType, setGroupType,                 // ← thêm
    groupDescription, setGroupDescription,   // ← thêm
    groupAvatarPreview,                      // ← thêm
    handleAvatarFileChange,                  // ← thêm
    selectedFriendIds,
    creatingChat,
    toggleSelectFriend,
    openCreateGroupModal,
    handleCreateGroupConversation,
  } = useFriendsData();

  const filteredFriends = filterFriends(friends, friendFilterText);

  if (loading && friends.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center font-semibold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        Đang tải kết nối...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <FriendsSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        friendFilterText={friendFilterText}
        onFilterChange={setFriendFilterText}
        incomingCount={incomingReqs.length}
        blockedCount={blockedList.length}
      />

      {activeTab === 'friends_list' && (
        <FriendsList
          friends={friends}
          friendFilterText={friendFilterText}
          onOpenCreateGroup={openCreateGroupModal}
          onMessage={handleCreateDmFromFriend}
          onUpdateNickname={handleUpdateNickname}
          onBlock={handleBlockFriend}
          onUnfriend={handleUnfriend}
        />
      )}

      {activeTab === 'friend_requests' && (
        <FriendRequests
          friends={friends}
          incomingReqs={incomingReqs}
          outgoingReqs={outgoingReqs}
          onAccept={handleAccept}
          onReject={handleReject}
          onCancelRequest={handleCancelRequest}
          onMessage={handleCreateDmFromFriend}
          onSearchSubmit={handleSearchGlobal}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearching={isSearching}
          searchResults={searchResults}
          onSendRequest={handleSendRequestGlobal}
        />
      )}

      {activeTab === 'blocked_list' && (
        <BlockedList
          blockedList={blockedList}
          onUnblock={(userId) => handleBlockFriend(userId, true)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          // ─── thông tin nhóm ───
          groupName={groupName}
          setGroupName={setGroupName}
          groupType={groupType}                        // cần thêm vào useFriendsData
          setGroupType={setGroupType}                  // cần thêm vào useFriendsData
          groupDescription={groupDescription}          // cần thêm vào useFriendsData
          setGroupDescription={setGroupDescription}    // cần thêm vào useFriendsData
          groupAvatarPreview={groupAvatarPreview}      // cần thêm vào useFriendsData
          onAvatarFileChange={handleAvatarFileChange}  // cần thêm vào useFriendsData

          // ─── danh sách bạn ───
          selectedFriendIds={selectedFriendIds}
          friendsForGroup={friends}          // map filteredFriends → friendsForGroup
          loadingFriends={loading}

          // ─── actions ───
          creatingGroup={creatingChat}       // đổi tên prop creatingChat → creatingGroup
          onToggleSelectFriend={toggleSelectFriend}
          onCreateGroup={handleCreateGroupConversation}   // onConfirm → onCreateGroup
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  );
};

export default FriendsPage;