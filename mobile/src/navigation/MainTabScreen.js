import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, ScrollView, StatusBar, Modal, Pressable,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { io } from 'socket.io-client';
import Svg, { Rect } from 'react-native-svg';
import { STATUS_CONFIG, getAvatarColor, getInitials } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import { useLanguage } from '../context/LanguageContext';
import ProfileScreen from '../features/user/screens/ProfileScreen';
import FriendsScreen from '../features/friends/screens/FriendsScreen';
import StoriesScreen from '../features/stories/screens/StoriesScreen';
import conversationApi from '../features/chat/api/conversationApi';
import friendApi from '../features/friends/api/friendApi';
import { SOCKET_URL } from '../config/env';

const GROUP_TYPES = [
  { key: 'general', label: 'group_types.general' },
  { key: 'study',   label: 'group_types.study' },
  { key: 'gaming',  label: 'group_types.gaming' },
  { key: 'project', label: 'group_types.project' },
  { key: 'other',   label: 'group_types.other' },
];


const formatTime = (iso, language) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

const mapConv = (item, t, language) => {
  const isDm = item.type === 'dm';
  const other = isDm ? item.otherUser : null;
  return {
    id: item._id,
    name: isDm ? (other?.displayName || item.name || t('chat.direct_message')) : (item.name || t('chat.group_chat')),
    avatar: isDm ? (other?.avatar || null) : (item.avatar || null),
    otherUserId: isDm ? (other?._id?.toString() || null) : null,
    lastMessage: item.lastMessagePreview || t('chat.no_msgs'),
    time: formatTime(item.lastMessageTime || item.updatedAt || item.createdAt, language),
    unread: item.myMembership?.unreadCount || 0,
    type: item.type,
    online: false,
    memberCount: item.totalMembers || 0,
    // ── Cần cho AI Summary feature ──────────────────────────────────
    myMembership: item.myMembership || null,   // có lastReadMessageId, unreadCount
    aiSummary:    item.myMembership?.aiSummary || null,  // summary đã lưu trong DB
    pinnedMessages: item.pinnedMessages || [],
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

const TinIconMobile = ({ size = 24, color = '#fff' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect 
        x="3" y="5" width="9" height="14" rx="2" 
        fill={color}
      />
      <Rect 
        x="14" y="8" width="7" height="8" rx="2" 
        fill={color}
      />
    </Svg>
  </View>
);

// ─────────────────────────────────────────────
// CREATE GROUP MODAL
// ─────────────────────────────────────────────
function CreateGroupModal({ visible, onClose, onCreated, THEME, styles }) {
  const [step, setStep]               = useState(1); // 1=info, 2=members
  const [groupName, setGroupName]     = useState('');
  const [groupType, setGroupType]     = useState('general');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar]           = useState(null);
  const [friends, setFriends]         = useState([]);
  const [selected, setSelected]       = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating]       = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!visible) { setStep(1); setGroupName(''); setGroupType('general'); setDescription(''); setAvatar(null); setSelected([]); return; }
    setLoadingFriends(true);
    friendApi.getFriendList()
      .then(res => setFriends(res?.data?.success ? (res.data.data || []) : []))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, [visible]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0].base64) setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const toggleFriend = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCreate = async () => {
    if (!groupName.trim()) { Alert.alert(t('common.error'), t('auth.fill_all_fields')); return; }
    if (selected.length < 1) { Alert.alert(t('common.error'), t('create_group.subtitle')); return; }
    setCreating(true);
    try {
      const res = await conversationApi.createGroupConversation(groupName.trim(), avatar, selected, groupType, description.trim());
      const conv = res.data?.data || res.data;
      onCreated && onCreated(conv);
      onClose();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('chat.create_error'));
    } finally { setCreating(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalBox, { maxHeight: '90%' }]} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t('chat.create_group')}</Text>

          {step === 1 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Avatar */}
              <TouchableOpacity onPress={pickAvatar} style={{ alignItems: 'center', marginBottom: 16 }}>
                {avatar
                  ? <Image source={{ uri: avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                  : <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.bgHover, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 28 }}>📷</Text>
                    </View>
                }
                <Text style={{ color: THEME.accent, fontSize: 13, marginTop: 6, fontWeight: '600' }}>{t('create_group.avatar_title')}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>{t('chat.group_name')}</Text>
              <TextInput style={styles.fieldInput} value={groupName} onChangeText={setGroupName} placeholder={t('chat.group_name_placeholder')} placeholderTextColor={THEME.textMuted} />

              <Text style={styles.fieldLabel}>{t('chat.group_type')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {GROUP_TYPES.map(type => (
                  <TouchableOpacity key={type.key} onPress={() => setGroupType(type.key)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: groupType === type.key ? THEME.accent : THEME.border, backgroundColor: groupType === type.key ? THEME.accent + '20' : 'transparent' }}>
                    <Text style={{ fontSize: 13, color: groupType === type.key ? THEME.accent : THEME.textMuted, fontWeight: '600' }}>{t(`chat.group_types.${type.key}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('chat.description')}</Text>
              <TextInput style={[styles.fieldInput, { height: 72, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder={t('chat.description_placeholder')} placeholderTextColor={THEME.textMuted} multiline />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelBtnText}>{t('common.cancel')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={() => setStep(2)}>
                  <Text style={styles.saveBtnText}>{t('chat.next')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>{t('chat.select_members')} ({t('chat.members_selected', { count: selected.length })})</Text>
              {loadingFriends
                ? <ActivityIndicator color={THEME.accent} style={{ marginVertical: 24 }} />
                : (
                  <FlatList
                    data={friends}
                    keyExtractor={item => item.friendId || item._id}
                    style={{ maxHeight: 340 }}
                    renderItem={({ item }) => {
                      const id = item.friendId || item._id;
                      const name = item.displayName || item.friendName || '?';
                      const av = item.avatar || item.friendAvatar || null;
                      const isSelected = selected.includes(id);
                      return (
                        <TouchableOpacity onPress={() => toggleFriend(id)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: getAvatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
                            {av ? <Image source={{ uri: av }} style={{ width: 40, height: 40 }} /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(name)}</Text>}
                          </View>
                          <Text style={{ flex: 1, fontSize: 15, color: THEME.textPrimary, fontWeight: '500' }}>{name}</Text>
                          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? THEME.accent : THEME.border, backgroundColor: isSelected ? THEME.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {isSelected && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={<Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>{t('friends.no_friends')}</Text>}
                  />
                )
              }
              <View style={[styles.modalBtns, { marginTop: 12 }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(1)}><Text style={styles.cancelBtnText}>{t('chat.back')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { opacity: creating ? 0.6 : 1 }]} onPress={handleCreate} disabled={creating}>
                  {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{t('chat.create_btn')}</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// CHATS TAB
// ─────────────────────────────────────────────
function ChatsTab({ navigation, conversations, onUpdateConversations, onRefresh, THEME, styles }) {
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { t } = useLanguage();

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const dms = filtered.filter(c => c.type === 'dm');
  const groups = filtered.filter(c => c.type === 'group');
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
    const { isUserOnline } = usePresence();
    const liveOnline = item.type === 'dm' && item.otherUserId
      ? isUserOnline(item.otherUserId)
      : false;
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
          status={liveOnline ? 'online' : null}
          online={item.type === 'dm' ? liveOnline : null}
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
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setShowCreateGroup(true)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: THEME.accent, lineHeight: 24 }}>＋</Text>
        </TouchableOpacity>
      </View>

      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={() => { setShowCreateGroup(false); onRefresh && onRefresh(); }}
        THEME={THEME}
        styles={styles}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('chat.search_placeholder')}
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
        {dms.length > 0 && <SectionHeader title={t('chat.direct_messages')} count={dms.length} />}
        {dms.map(item => <ConvItem key={item.id} item={item} />)}

        {/* Groups */}
        {groups.length > 0 && <SectionHeader title={t('chat.groups')} count={groups.length} />}
        {groups.map(item => <ConvItem key={item.id} item={item} />)}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>{t('chat.no_results')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// BOTTOM TAB BAR
// ─────────────────────────────────────────────
const getTabs = (t) => [
  { key: 'chats',   icon: '💬', label: t('tabs.messages') },
  { key: 'friends', icon: '👥', label: t('tabs.contacts') },
  { key: 'profile', icon: '👤', label: t('tabs.profile') },
  { key: 'tin',     icon: 'custom', label: t('tabs.discover') },
];

function BottomTabBar({ activeTab, onTabChange, unreadTotal, THEME, styles }) {
  const { t } = useLanguage();
  const tabs = getTabs(t);
  return (
    <View style={styles.bottomBar}>
      {tabs.map(tab => {
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
              {tab.key === 'tin' ? (
                <View style={{ opacity: active ? 1 : 0.5 }}>
                  <TinIconMobile size={22} color={active ? THEME.accent : THEME.textPrimary} />
                </View>
              ) : (
                <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.5 }]}>{tab.icon}</Text>
              )}
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
  const { t, language } = useLanguage();
  const styles = useStyles(THEME);

  const [activeTab, setActiveTab] = useState('chats');
  const [conversations, setConversations] = useState([]);
  const socketRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await conversationApi.listMyConversations('exclude');
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setConversations(list.map(c => mapConv(c, t, language)));
    } catch (err) {
      console.warn('fetchConversations error:', err.message || err);
    }
  }, [t, language]);

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
          const locale = language === 'vi' ? 'vi-VN' : 'en-US';
          return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        };
        return {
          ...c,
          lastMessage: message.content || c.lastMessage,
          time: fmtTime(message.createdAt),
          unread: (c.unread || 0) + 1,
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
        return <ChatsTab navigation={navigation} conversations={conversations} onUpdateConversations={setConversations} onRefresh={fetchConversations} THEME={THEME} styles={styles} />;
      case 'friends':
        return <FriendsScreen navigation={navigation} />;
      case 'profile':
        return <ProfileScreen navigation={navigation} />;
      case 'tin':
        return <StoriesScreen />;
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
  avatarText: { color: '#fff', fontWeight: '700' },
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
