import React, { useState } from 'react';

import FriendsSidebar   from './components/FriendsSidebar';
import FriendsList      from './components/FriendsList';
import FriendRequests   from './components/FriendRequests';
import BlockedList      from './components/BlockedList';
import CreateGroupModal from './components/CreateGroupModal';

import { useFriendsData }    from './hooks/useFriendsData';
import { filterFriends }     from './utils/friendHelpers';

const FriendsPage = () => {
  const [activeTab, setActiveTab]           = useState('friends_list');
  const [friendFilterText, setFriendFilterText] = useState('');

  const {
    friends, incomingReqs, outgoingReqs, blockedList, loading,
    searchQuery, setSearchQuery, searchResults, isSearching,
    handleSearchGlobal, handleSendRequestGlobal,
    handleAccept, handleReject, handleCancelRequest,
    handleUnfriend, handleUpdateNickname, handleBlockFriend,
    handleCreateDmFromFriend,
    showCreateGroup, setShowCreateGroup,
    groupName, setGroupName,
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
          groupName={groupName}
          setGroupName={setGroupName}
          selectedFriendIds={selectedFriendIds}
          filteredFriends={filteredFriends}
          creatingChat={creatingChat}
          onToggleSelectFriend={toggleSelectFriend}
          onConfirm={handleCreateGroupConversation}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  );
};

export default FriendsPage;