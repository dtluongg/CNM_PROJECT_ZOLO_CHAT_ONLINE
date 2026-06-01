import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import apiClient from '../../../services/apiClient';
import conversationApi from '../../chat/api/conversationApi';
import friendApi from '../../friends/api/friendApi';

export function useUserProfile({ route, navigation, authUser, isUserOnline, getPresenceStatus, getLastSeen, getStatusText, getLiveStatusInfo }) {
  const [profile, setProfile] = useState(route.params?.user || null);
  const [loading, setLoading] = useState(!route.params?.user);
  const [messaging, setMessaging] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendBusy, setFriendBusy] = useState(false);

  const userId = route.params?.userId ||
                 route.params?.user?._id ||
                 route.params?.user?.friendId;

  useEffect(() => {
    if (!profile && userId) loadProfile();
  }, [userId]);

  useEffect(() => {
    if (profile && authUser && profile._id !== authUser._id) {
      loadFriendStatus(profile._id);
    }
  }, [profile?._id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/users/${userId}/profile`);
      setProfile(res.data.user || res.data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ người dùng.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadFriendStatus = async (targetId) => {
    try {
      const res = await friendApi.getFriendStatus(targetId);
      const d = res.data;
      // Backend trả về: { status: 'friends'|'sent'|'received'|'none', requestId?, isBlocked? }
      if (d.status === 'friends') {
        setFriendStatus('friends');
      } else if (d.status === 'sent') {
        setFriendStatus('sent');
        setFriendRequestId(d.requestId || null);
      } else if (d.status === 'received') {
        setFriendStatus('received');
        setFriendRequestId(d.requestId || null);
      } else {
        setFriendStatus('none');
      }
    } catch {
      setFriendStatus('none');
    }
  };

  const handleSendRequest = async () => {
    if (friendBusy) return;
    setFriendBusy(true);
    try {
      const res = await friendApi.sendRequest(profile._id);
      setFriendRequestId(res.data?.data?._id || null);
      setFriendStatus('sent');
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi lời mời kết bạn.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    if (friendBusy || !friendRequestId) return;
    setFriendBusy(true);
    try {
      await friendApi.cancelRequest(friendRequestId);
      setFriendStatus('none');
      setFriendRequestId(null);
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể thu hồi lời mời.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (friendBusy || !friendRequestId) return;
    setFriendBusy(true);
    try {
      await friendApi.acceptRequest(friendRequestId);
      setFriendStatus('friends');
      setFriendRequestId(null);
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể chấp nhận lời mời.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleRejectRequest = async () => {
    if (friendBusy || !friendRequestId) return;
    setFriendBusy(true);
    try {
      await friendApi.rejectRequest(friendRequestId);
      setFriendStatus('none');
      setFriendRequestId(null);
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể từ chối lời mời.');
    } finally {
      setFriendBusy(false);
    }
  };

  const handleUnfriend = async () => {
    Alert.alert(
      'Hủy kết bạn',
      `Bạn có chắc muốn hủy kết bạn với ${profile.displayName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận', style: 'destructive',
          onPress: async () => {
            if (friendBusy) return;
            setFriendBusy(true);
            try {
              await friendApi.unfriend(profile._id);
              setFriendStatus('none');
            } catch (err) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hủy kết bạn.');
            } finally {
              setFriendBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleMessage = async () => {
    if (!profile || messaging) return;
    setMessaging(true);
    try {
      const res = await conversationApi.createDm(profile._id, 'Xin chào!');
      const conv = res.data.data || res.data;
      const convId = conv?._id?.toString() || conv?.id?.toString();

      if (!convId) {
        Alert.alert('Lỗi', 'Không tạo được cuộc trò chuyện');
        return;
      }

      const si = getLiveStatusInfo(profile);
      navigation.push('Message', {
        conversation: {
          id: convId,
          name: profile.displayName || profile.username || 'Người dùng',
          avatar: profile.avatar || null,
          type: 'dm',
          status: si.statusKey || 'offline',
          online: isUserOnline(profile._id),
          otherUserId: profile._id?.toString(),
          usernameColor: profile.usernameColor,
          lastMessage: '',
          time: '',
          unread: 0,
        },
      });
    } catch (err) {
      console.error('handleMessage error:', err.response?.data);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể mở cuộc trò chuyện.');
    } finally {
      setMessaging(false);
    }
  };

  return {
    profile,
    loading,
    messaging,
    friendStatus,
    friendRequestId,
    friendBusy,
    userId,
    loadProfile,
    handleSendRequest,
    handleCancelRequest,
    handleAcceptRequest,
    handleRejectRequest,
    handleUnfriend,
    handleMessage,
  };
}