import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, StatusBar
} from 'react-native';
import friendApi from '../api/friendApi';
import { useTheme } from '../../../context/ThemeContext';
import { getAvatarColor, getInitials } from '../../../theme';

const Avatar = ({ name, size = 50 }) => {
  const bg = getAvatarColor(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{getInitials(name)}</Text>
    </View>
  );
};

export default function FriendRequestsScreen({ navigation }) {
  const { theme: THEME } = useTheme();
  const s = useStyles(THEME);

  const [tab, setTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [inRes, outRes] = await Promise.all([
        friendApi.getIncomingRequests().catch(() => ({ data: { data: [] } })),
        friendApi.getOutgoingRequests().catch(() => ({ data: { data: [] } }))
      ]);
      setIncoming(inRes.data?.data || []);
      setOutgoing(outRes.data?.data || []);
    } catch (error) {
      console.log('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (actionFn, id, successMsg) => {
    try {
      await actionFn(id);
      fetchRequests();
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
    }
  };

  const renderIncoming = ({ item }) => (
    <View style={s.card}>
      <Avatar name={item.fromUserId?.displayName || 'Unknown User'} />
      <View style={s.cardInfo}>
        <Text style={[s.name, { color: THEME.textPrimary }]} numberOfLines={1}>
          {item.fromUserId?.displayName || 'Người lạ'}
        </Text>
        <Text style={s.subText}>{item.fromUserId?.email}</Text>
      </View>
      <View style={s.btnGroup}>
        <TouchableOpacity 
           style={[s.btn, { backgroundColor: THEME.bgInput }]}
           onPress={() => handleAction(friendApi.rejectRequest, item._id)}
        >
          <Text style={[s.btnText, { color: THEME.textPrimary }]}>Từ chối</Text>
        </TouchableOpacity>
        <TouchableOpacity 
           style={[s.btn, { backgroundColor: THEME.accent }]}
           onPress={() => handleAction(friendApi.acceptRequest, item._id)}
        >
          <Text style={[s.btnText, { color: '#fff' }]}>Đồng ý</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOutgoing = ({ item }) => (
    <View style={s.card}>
      <Avatar name={item.toUserId?.displayName || 'Unknown User'} />
      <View style={s.cardInfo}>
        <Text style={[s.name, { color: THEME.textPrimary }]} numberOfLines={1}>
          {item.toUserId?.displayName || 'Người lạ'}
        </Text>
        <Text style={s.subText}>Đang chờ đối tác xác nhận...</Text>
      </View>
      <View style={s.btnGroup}>
        <TouchableOpacity 
           style={[s.btn, { backgroundColor: THEME.bgInput }]}
           onPress={() => handleAction(friendApi.cancelRequest, item._id)}
        >
          <Text style={[s.btnText, { color: THEME.textPrimary }]}>Thu hồi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgSecondary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={{ fontSize: 24, color: THEME.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Lời mời kết bạn</Text>
        <TouchableOpacity style={s.settingsBtn}>
            <Text style={{ fontSize: 20, color: THEME.textPrimary }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity 
            style={[s.tabItem, tab === 'incoming' && { borderBottomColor: THEME.accent, borderBottomWidth: 2 }]}
            onPress={() => setTab('incoming')}
            activeOpacity={0.8}
        >
            <Text style={[s.tabText, tab === 'incoming' && { color: THEME.accent, fontWeight: '700' }]}>
                Đã nhận {incoming.length > 0 ? `(${incoming.length})` : ''}
            </Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[s.tabItem, tab === 'outgoing' && { borderBottomColor: THEME.accent, borderBottomWidth: 2 }]}
            onPress={() => setTab('outgoing')}
            activeOpacity={0.8}
        >
            <Text style={[s.tabText, tab === 'outgoing' && { color: THEME.accent, fontWeight: '700' }]}>
                Đã gửi {outgoing.length > 0 ? `(${outgoing.length})` : ''}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
         {loading ? (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                 <ActivityIndicator size="large" color={THEME.accent} />
             </View>
         ) : (
             <FlatList
                 data={tab === 'incoming' ? incoming : outgoing}
                 keyExtractor={item => item._id}
                 renderItem={tab === 'incoming' ? renderIncoming : renderOutgoing}
                 showsVerticalScrollIndicator={false}
                 contentContainerStyle={{ paddingVertical: 8 }}
                 ListEmptyComponent={() => (
                     <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
                         <Text style={{ fontSize: 48, marginBottom: 16 }}>📬</Text>
                         <Text style={{ fontSize: 16, color: THEME.textMuted }}>
                             {tab === 'incoming' ? 'Không có lời mời nào.' : 'Chưa gửi lời mời nào.'}
                         </Text>
                     </View>
                 )}
                 refreshing={loading}
                 onRefresh={fetchRequests}
             />
         )}
      </View>
    </View>
  );
}

const useStyles = (THEME) => StyleSheet.create({
  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
  },
  backBtn: { paddingRight: 16 },
  settingsBtn: { paddingLeft: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary },
  
  tabBar: {
    flexDirection: 'row', backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600', color: THEME.textMuted },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    marginHorizontal: 12, marginVertical: 6,
    padding: 12, borderRadius: 12,
  },
  cardInfo: { flex: 1, marginHorizontal: 12 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  subText: { fontSize: 13, color: THEME.textMuted },
  btnGroup: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  btnText: { fontSize: 13, fontWeight: '700' },
});
