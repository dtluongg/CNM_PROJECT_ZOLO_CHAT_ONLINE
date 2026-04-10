import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, ScrollView, StatusBar,
} from 'react-native';
import { io } from 'socket.io-client';
import { STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ProfileScreen from '../features/user/screens/ProfileScreen';
import FriendsScreen from '../features/friends/screens/FriendsScreen';
import conversationApi from '../features/chat/api/conversationApi';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.88.135:2026/backend/api')
    .replace('/backend/api', '');

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return sameDay
    ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const mapConv = (item) => {
  const isDm  = item.type === 'dm';
  const other = isDm ? item.otherUser : null;
  return {
    id:          item._id,
    name:        isDm ? (other?.displayName || item.name || 'Đoạn chat trực tiếp') : (item.name || 'Nhóm'),
    avatar:      isDm ? (other?.avatar || null) : (item.avatar || null),
    otherUserId: isDm ? (other?._id?.toString() || null) : null,
    lastMessage: item.lastMessagePreview || 'Chưa có tin nhắn',
    time:        formatTime(item.lastMessageTime || item.updatedAt || item.createdAt),
    unread:      item.myMembership?.unreadCount || 0,
    type:        item.type,
    online:      false,
    memberCount: item.totalMembers || 0,
  };
};

// ─────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────
const Avatar = ({ name, avatar, size = 44, status = null, online = null, THEME, styles }) => {
  const bg = getAvatarColor(name);
  const dotSize = Math.floor(size * 0.28);
  const statusColor = online === false
    ? THEME.statusOffline
    : STATUS_CONFIG[status]?.color || THEME.statusOnline;

  return (
    <View style={{ width: size, height: size }}>
      {avatar
        ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        : (
          <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
            <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
          </View>
        )
      }
      {(online !== null || status) && (
        <View style={[styles.statusDot, {
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          backgroundColor: statusColor,
          bottom: -1, right: -1,
        }]} />
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// CHATS TAB
// ─────────────────────────────────────────────
function ChatsTab({ navigation, conversations, onUpdateConversations, THEME, styles }) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const dms     = filtered.filter(c => c.type === 'dm');
  const groups  = filtered.filter(c => c.type === 'group');
  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const openConversation = (conv) => {
    onUpdateConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
    );
    navigation.navigate('Message', { conversation: conv });
  };

  const SectionHeader = ({ title, count }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title} {count > 0 ? `(${count})` : ''}</Text>
    </View>
  );

  const ConvItem = ({ item }) => {
    const [pressed, setPressed] = useState(false);
    return (
      <TouchableOpacity
        onPress={() => openConversation(item)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={1}
        style={[styles.convItem, pressed && { backgroundColor: THEME.bgHover }]}
      >
        <Avatar
          name={item.name}
          avatar={item.avatar}
          size={48}
          status={item.status}
          online={item.type === 'dm' ? item.online : null}
          THEME={THEME}
          styles={styles}
        />
        <View style={styles.convInfo}>
          <View style={styles.convTop}>
            <Text style={[styles.convName, { color: item.usernameColor || THEME.textPrimary }]} numberOfLines={1}>
              {item.type === 'group' ? `# ${item.name}` : item.name}
            </Text>
            <Text style={styles.convTime}>{item.time}</Text>
          </View>
          <View style={styles.convBottom}>
            <Text style={styles.convLast} numberOfLines={1}>{item.lastMessage}</Text>
            {item.unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={styles.chatHeader}>
        <Text style={styles.headerTitle}>💬 ZoloChat</Text>
        {totalUnread > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm hội thoại..."
            placeholderTextColor={THEME.textMuted}
            selectionColor={THEME.accent}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: THEME.textMuted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* DMs */}
        {dms.length > 0 && <SectionHeader title="TIN NHẮN RIÊNG" count={dms.length} />}
        {dms.map(item => <ConvItem key={item.id} item={item} />)}

        {/* Groups */}
        {groups.length > 0 && <SectionHeader title="NHÓM" count={groups.length} />}
        {groups.map(item => <ConvItem key={item.id} item={item} />)}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Không tìm thấy hội thoại</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// BOTTOM TAB BAR
// ─────────────────────────────────────────────
const TABS = [
  { key: 'chats',   icon: '💬', label: 'Tin nhắn' },
  { key: 'friends', icon: '👥', label: 'Bạn bè' },
  { key: 'profile', icon: '👤', label: 'Hồ sơ' },
];

function BottomTabBar({ activeTab, onTabChange, unreadTotal, THEME, styles }) {
  return (
    <View style={styles.bottomBar}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.tabIndicator} />}
            <View style={{ position: 'relative' }}>
              <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.5 }]}>{tab.icon}</Text>
              {tab.key === 'chats' && unreadTotal > 0 && !active && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color: active ? THEME.accent : THEME.textMuted, fontWeight: active ? '700' : '500' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// MAIN TAB SCREEN (acts as a wrapper for Chats, Search, Profile)
// ─────────────────────────────────────────────
export default function MainTabScreen({ navigation, route }) {
  const { theme: THEME } = useTheme();
  const { token } = useAuth();
  const styles = useStyles(THEME);

  const [activeTab, setActiveTab]         = useState('chats');
  const [conversations, setConversations] = useState([]);
  const socketRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res  = await conversationApi.listMyConversations('exclude');
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setConversations(list.map(mapConv));
    } catch (err) {
      console.error('fetchConversations error:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Socket: live preview + unread count in conversation list
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('chat:new-message', ({ conversationId, message }) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c;
        const fmtTime = (iso) => {
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return '';
          return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        };
        return {
          ...c,
          lastMessage: message.content || c.lastMessage,
          time:        fmtTime(message.createdAt),
          unread:      (c.unread || 0) + 1,
        };
      }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const unreadTotal = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatsTab navigation={navigation} conversations={conversations} onUpdateConversations={setConversations} THEME={THEME} styles={styles} />;
      case 'friends':
        return <FriendsScreen navigation={navigation} />;
      case 'profile':
        return <ProfileScreen navigation={navigation} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} unreadTotal={unreadTotal} THEME={THEME} styles={styles} />
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const useStyles = (THEME) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  avatarCircle: { justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700' },
  statusDot: {
    position: 'absolute', borderWidth: 2,
    borderColor: THEME.bgSecondary,
  },

  // Header
  chatHeader: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary, flex: 1 },
  headerBadge: {
    backgroundColor: THEME.danger, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Search
  searchContainer: { padding: 10, backgroundColor: THEME.bgSecondary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.bgPrimary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: THEME.textPrimary, fontSize: 15, padding: 0 },

  // Section
  sectionHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: THEME.textMuted, letterSpacing: 0.8 },

  // Conversation item
  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: THEME.bgTertiary,
    minHeight: 68,
  },
  convInfo: { flex: 1, minWidth: 0 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 15, fontWeight: '600', flex: 1 },
  convTime: { fontSize: 11, color: THEME.textMuted, marginLeft: 6, flexShrink: 0 },
  convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLast: { fontSize: 13, color: THEME.textMuted, flex: 1 },
  badge: {
    backgroundColor: THEME.danger, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6, minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 40, opacity: 0.4 },
  emptyText: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', paddingHorizontal: 32 },

  // User search item
  userItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  userName: { fontSize: 15, fontWeight: '600' },
  userHandle: { fontSize: 12, color: THEME.textMuted, marginTop: 1 },
  userBio: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  viewProfile: { fontSize: 13, color: THEME.textMuted, marginLeft: 8 },

  // Profile
  profileCard: { margin: 12, backgroundColor: THEME.bgSecondary, borderRadius: 16, overflow: 'hidden' },
  profileBanner: { height: 80 },
  profileAvatarRow: { paddingHorizontal: 16, marginTop: -40, marginBottom: 8 },
  editAvatarOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: THEME.bgSecondary, borderRadius: 16,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: THEME.bgSecondary,
  },
  profileInfo: { paddingHorizontal: 16, paddingBottom: 8 },
  profileName: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  profileHandle: { fontSize: 14, color: THEME.textMuted, marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDotInline: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  bioBox: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 12,
    backgroundColor: THEME.bgTertiary, borderRadius: 8,
    padding: 12, borderLeftWidth: 3, borderLeftColor: THEME.accent,
  },
  bioText: { fontSize: 14, color: THEME.textSecondary, lineHeight: 20 },
  infoRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14,
    gap: 10, alignItems: 'center',
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  infoValue: { fontSize: 14, color: THEME.textPrimary, fontWeight: '600' },

  // Actions card
  actionsCard: {
    margin: 12, marginTop: 0, backgroundColor: THEME.bgSecondary, borderRadius: 16, overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  actionIcon: { fontSize: 18 },
  actionText: { flex: 1, fontSize: 15, color: THEME.textPrimary, fontWeight: '500' },
  actionArrow: { fontSize: 20, color: THEME.textMuted },
  actionDivider: { height: 1, backgroundColor: THEME.border, marginLeft: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: THEME.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: THEME.bgHover,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 20, textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  fieldInput: {
    backgroundColor: THEME.bgTertiary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: THEME.textPrimary, marginBottom: 16,
    borderWidth: 1.5, borderColor: THEME.bgHover,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: THEME.bgHover, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: THEME.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: THEME.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Bottom tab bar
  bottomBar: {
    flexDirection: 'row', height: 60,
    backgroundColor: THEME.bgSecondary,
    borderTopWidth: 1, borderTopColor: THEME.border,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative',
  },
  tabIndicator: {
    position: 'absolute', top: 0, left: '25%', right: '25%',
    height: 3, backgroundColor: THEME.accent, borderRadius: 2,
  },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 10, letterSpacing: 0.2 },
  tabBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: THEME.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 2, borderColor: THEME.bgSecondary,
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
