import { formatConversationTime } from './formatTime';

export const mapConversationItem = (item, dmOverrides) => {
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
    lastMessage: item.lastMessagePreview || 'Chưa có tin nhắn',
    time:        formatConversationTime(item.lastMessageTime || item.updatedAt || item.createdAt),
    unread:      item.myMembership?.unreadCount || 0,
    type:        item.type,
    online:      false,
    memberCount: item.totalMembers,
    otherUserId: isDm ? (item.otherUserId || other?._id?.toString() || null) : null,
    myMembership: item.myMembership || null,   // lastReadMessageId, unreadCount
    pinnedMessages: item.pinnedMessages || [],
    isLocked: !!item.isLocked,
    groupType: item.groupType || 'general',
    inviteMode: item.inviteMode || 'open_invite',
    description: item.description || '',
    raw:         item,
  };
};

export const buildPendingDmConversation = (peer) => ({
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