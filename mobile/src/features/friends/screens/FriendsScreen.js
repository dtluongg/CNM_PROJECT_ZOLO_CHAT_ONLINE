import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, SectionList, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import userApi from '../../user/api/userApi';
import friendApi from '../api/friendApi';
import { STATUS_CONFIG, getAvatarColor, getInitials } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../../context/LanguageContext';

const Avatar = ({ name, avatar, size = 46 }) => {
  const bg = getAvatarColor(name);
  return avatar
    ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{getInitials(name)}</Text>
      </View>
    );
};

export default function FriendsScreen({ navigation }) {
  const { theme: THEME } = useTheme();
  const { t } = useLanguage();
  const s = useStyles(THEME);
  
  // UI Modes
  const [mode, setMode]       = useState('text');
  
  // Contacts State
  const [friends, setFriends] = useState([]);
  const [incomingReqs, setIncomingReqs] = useState([]);
  const [outgoingReqs, setOutgoingReqs] = useState([]);
  const [blockedList, setBlockedList] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const hasFetchedRef = useRef(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Camera State
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const fetchContacts = async (silent = false) => {
    try {
      if (!silent) setLoadingContacts(true);
      const [friendRes, inReqRes, outReqRes, blockedRes] = await Promise.all([
         friendApi.getFriendList().catch(() => ({ data: { success: false } })),
         friendApi.getIncomingRequests().catch(() => ({ data: { success: false } })),
         friendApi.getOutgoingRequests().catch(() => ({ data: { success: false } })),
         friendApi.getBlockedList().catch(() => ({ data: { success: false } })),
      ]);

      if (inReqRes?.data?.success) setIncomingReqs(inReqRes.data.data || []);
      if (outReqRes?.data?.success) setOutgoingReqs(outReqRes.data.data || []);
      if (friendRes?.data?.success) setFriends(friendRes.data.data || []);
      if (blockedRes?.data?.success) setBlockedList(blockedRes.data.data || []);

    } catch (error) {
      console.log('Fetch contacts error:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Lần đầu: show loading. Các lần sau: fetch ngầm, không block UI
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchContacts(false);
      } else {
        fetchContacts(true);
      }
    }, [])
  );

  const friendsSections = useMemo(() => {
      let data = friends;
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(f =>
             f.displayName?.toLowerCase().includes(q) ||
             f.email?.toLowerCase().includes(q)
          );
      }

      const grouped = data.reduce((acc, f) => {
          const firstLetter = f.displayName ? f.displayName[0].toUpperCase() : '#';
          const group = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
          if (!acc[group]) acc[group] = [];
          acc[group].push(f);
          return acc;
      }, {});

      const localSections = Object.keys(grouped).sort((a, b) => {
          if (a === '#') return 1;
          if (b === '#') return -1;
          return a.localeCompare(b);
      }).map(letter => ({ title: letter, data: grouped[letter] }));

      let finalSections = [];
      if (searchResults.length > 0) {
          finalSections.push({ title: t('friends.global_search_results'), data: searchResults, isGlobal: true });
      }
      if (localSections.length > 0) {
          finalSections.push(...localSections);
      }

      return finalSections;
  }, [friends, searchQuery, searchResults]);

  const handleSearchGlobal = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    try {
      setIsSearching(true);
      const res = await friendApi.searchUsers(searchQuery);
      if (res.data?.users) {
         setSearchResults(res.data.users);
      }
    } catch (e) {
      console.log('Search error:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequestGlobal = async (targetId) => {
    try {
        await friendApi.sendRequest(targetId);
        Alert.alert(t('common.success'), t('friends.request_sent'));
        fetchContacts();
    } catch (error) {
        Alert.alert(t('common.error'), error.response?.data?.message || t('common.something_wrong'));
    }
  };

  const handleAcceptGlobal = async (reqId) => {
    try {
        await friendApi.acceptRequest(reqId);
        Alert.alert(t('common.success'), t('friends.request_accepted'));
        fetchContacts();
    } catch (error) {
        Alert.alert(t('common.error'), error.response?.data?.message || t('common.something_wrong'));
    }
  };

  const handleCancelGlobal = async (reqId) => {
    try {
        await friendApi.cancelRequest(reqId);
        Alert.alert(t('common.success'), t('friends.request_cancelled'));
        fetchContacts();
    } catch (error) {
        Alert.alert(t('common.error'), error.response?.data?.message || t('common.something_wrong'));
    }
  };

  const clearSearch = () => {
     setSearchQuery('');
     setSearchResults([]);
  };

  const handleOpenChat = async (friend) => {
    if (openingChat) return;
    try {
      setOpeningChat(true);
      const conversationApi = require('../../chat/api/conversationApi').default;
      const targetId = friend.friendId || friend._id || friend.userId;

      const res = await conversationApi.createDm(targetId, t('chat.default_greeting'));
      const conv = res?.data?.data || res?.data;

      // Lấy đúng id
      const convId = conv?._id?.toString() || conv?.id?.toString();

      if (!convId) {
        Alert.alert(t('common.error'), t('chat.error_create_conv'));
        return;
      }

      navigation.navigate('Message', {
        conversation: {
          id: convId,           // ← phải có id đúng
          name: friend.displayName || t('chat.default_chat_name'),
          avatar: friend.avatar || null,
          type: 'dm',
          otherUserId: targetId.toString(),
          lastMessage: '',
          memberCount: 2,
        },
      });
    } catch (error) {
      console.error('handleOpenChat error:', error.response?.data);
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.something_wrong'));
    } finally {
      setOpeningChat(false);
    }
  };

  const handleUnblockFromList = async (userId) => {
    try {
      await friendApi.blockFriend(userId);
      Alert.alert(t('common.success'), t('friends.unblocked_success'));
      fetchContacts();
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.something_wrong'));
    }
  };

  // Xử lý Camera & Mã QR
  const handleBarcodeScan = useCallback(async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(true);
    const match = data.match(/\/user\/([a-f0-9]{24})/i);
    if (!match) {
      Alert.alert(t('friends.qr_not_recognized_title'), t('friends.qr_not_recognized_desc'), [
        { text: t('friends.retry_scan'), onPress: () => { setScanned(false); setScanning(false); } },
      ]);
      return;
    }
    try {
      const res = await userApi.getUserProfile(match[1]);
      const u = res.data.user || res.data;
      setMode('text');
      setScanned(false);
      setScanning(false);
      navigation.navigate('UserProfile', { user: u });
    } catch (e) {
      Alert.alert(t('friends.user_not_found'), t('friends.user_not_found_desc'), [
        { text: t('friends.retry_scan'), onPress: () => { setScanned(false); setScanning(false); } },
      ]);
    }
  }, [scanned, navigation]);

  const openCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert(t('common.camera_permission_title'), t('common.camera_permission_desc'));
        return;
      }
    }
    setScanned(false);
    setScanning(false);
    setMode('camera');
  };

  const handleFriendOptions = (friendInfo) => {
    Alert.alert(
      t('friends.options_title', { name: friendInfo.displayName }),
      '',
      [
        {
           text: t('friends.send_message'),
           onPress: () => handleOpenChat(friendInfo),
        },
        {
           text: t('friends.view_profile'),
           onPress: () => navigation.navigate('UserProfile', {
               userId: friendInfo.friendId,
             }),
        },
        {
           text: t('friends.change_nickname'),
           onPress: () => {
             Alert.prompt(
               t('friends.change_nickname'),
               t('friends.enter_nickname'),
               [
                 { text: t('common.cancel'), style: 'cancel' },
                 { text: t('common.save'), onPress: async (val) => {
                     if (!val) return;
                     try {
                        await friendApi.updateNickname(friendInfo.friendId, val);
                        fetchContacts();
                     } catch (e) {}
                 }}
               ]
             );
           }
        },
        {
           text: friendInfo.iBlocked ? t('friends.unblock') : t('friends.block'),
           style: 'destructive',
           onPress: async () => {
               try {
                  await friendApi.blockFriend(friendInfo.friendId);
                  Alert.alert(t('common.success'), friendInfo.iBlocked ? t('friends.unblocked_success') : t('friends.blocked_success'));
                  fetchContacts();
               } catch (e) {}
           }
        },
        {
           text: t('friends.unfriend'),
           style: 'destructive',
           onPress: async () => {
             try {
                await friendApi.unfriend(friendInfo.friendId);
                fetchContacts();
             } catch (e) {
                Alert.alert(t('common.error'), t('friends.unfriend_error'));
             }
           }
        },
        { text: t('common.close'), style: 'cancel' }
      ]
    );
  };

  const renderContactItem = ({ item, section }) => {
    if (section.isGlobal) {
        const isFriend = friends.some(f => f.friendId === item._id);
        const incomingReq = incomingReqs.find(req => req.fromUserId?._id === item._id);
        const outgoingReq = outgoingReqs.find(req => req.toUserId?._id === item._id);

        let btnText = t('friends.add_friend');
        let btnAction = () => handleSendRequestGlobal(item._id);
        let curStyle = { backgroundColor: THEME.bgHover, opacity: 1 };
        let textStyle = { color: THEME.accent };

        if (isFriend) {
            btnText = t('friends.already_friend');
            btnAction = () => {};
            curStyle = { backgroundColor: 'transparent', opacity: 0.5 };
            textStyle = { color: THEME.textMuted };
        } else if (incomingReq) {
            btnText = t('friends.accept');
            btnAction = () => handleAcceptGlobal(incomingReq._id);
            curStyle = { backgroundColor: THEME.accent, opacity: 1 };
            textStyle = { color: '#fff' };
        } else if (outgoingReq) {
            btnText = t('friends.cancel_request');
            btnAction = () => handleCancelGlobal(outgoingReq._id);
            curStyle = { backgroundColor: THEME.bgInput, opacity: 1 };
            textStyle = { color: THEME.textPrimary };
        }

        return (
            <View style={s.userCard}>
                <Avatar name={item.displayName} avatar={item.avatar} size={50} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[s.userName, { color: THEME.textPrimary }]} numberOfLines={1}>{item.displayName}</Text>
                    <Text style={s.userHandle}>{item.email}</Text>
                </View>
                <TouchableOpacity
                    style={[curStyle, { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, zIndex: 10 }]}
                    onPress={btnAction}
                    activeOpacity={isFriend ? 1 : 0.6}
                >
                    <Text style={[textStyle, { fontWeight: '700', fontSize: 13 }]}>{btnText}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <TouchableOpacity
            style={s.userCard}
            onPress={() => navigation.navigate('UserProfile', { userId: item.friendId, })}
            onLongPress={() => handleFriendOptions(item)}
            activeOpacity={0.7}
        >
            <Avatar name={item.displayName} avatar={item.avatar} size={50} />
            <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.userName, { color: THEME.textPrimary }]} numberOfLines={1}>
                        {item.displayName}
                    </Text>
                    {item.theyBlockedMe && (
                        <View style={{ backgroundColor: '#ef444420', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>{t('friends.blocked_you')}</Text>
                        </View>
                    )}
                </View>
                {item.email && <Text style={s.userHandle}>{item.email}</Text>}
            </View>
            <TouchableOpacity
                style={[s.chatBtn, { backgroundColor: THEME.accent }]}
                onPress={() => handleOpenChat(item)}
                disabled={openingChat || !!item.theyBlockedMe}
            >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.optionsBtn} onPress={() => handleFriendOptions(item)}>
                <Text style={{ fontSize: 18, color: THEME.textMuted }}>⋮</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.searchBoxFake}>
            <Text style={{fontSize: 16, color: THEME.textMuted}}>🔍</Text>
            <TextInput
                style={{ flex: 1, color: THEME.textPrimary, marginLeft: 8, fontSize: 16, paddingVertical: 0 }}
                placeholder={t('friends.search_placeholder')}
                placeholderTextColor={THEME.textMuted}
                value={searchQuery}
                onChangeText={(text) => {
                   setSearchQuery(text);
                   if (!text) setSearchResults([]);
                }}
                onSubmitEditing={handleSearchGlobal}
                returnKeyType="search"
            />
            {isSearching ? (
                <ActivityIndicator size="small" color={THEME.accent} style={{ paddingHorizontal: 8 }} />
            ) : searchQuery.length > 0 ? (
                <TouchableOpacity onPress={clearSearch} style={{ paddingHorizontal: 8 }}>
                    <Text style={{ color: THEME.textMuted, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
            ) : null}
        </View>
        <TouchableOpacity
          style={s.modeToggle}
          onPress={mode === 'camera' ? () => setMode('text') : openCamera}
        >
          <Text style={s.modeToggleText}>{mode === 'camera' ? '⌨️' : '📷'}</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {mode === 'text' ? (
        <SectionList
          sections={friendsSections}
          keyExtractor={(item, idx) => item._id || item.friendshipId || Math.random().toString()}
          renderItem={renderContactItem}
          renderSectionHeader={({ section: { title } }) => (
             <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{title}</Text>
             </View>
          )}
          ListHeaderComponent={
              <View style={s.listHeaderWrap}>
                 <TouchableOpacity
                    style={s.bigRequestBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('FriendRequests')}
                 >
                    <View style={s.iconWrapper}>
                        <Text style={{ fontSize: 24, color: '#fff' }}>👥</Text>
                    </View>
                    <Text style={[s.bigRequestText, { color: THEME.textPrimary }]}>{t('friends.tab_requests')}</Text>
                    {incomingReqs.length > 0 && (
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{incomingReqs.length}</Text>
                        </View>
                    )}
                 </TouchableOpacity>

                 {blockedList.length > 0 && (
                   <View>
                     <View style={[s.sectionHeader, { backgroundColor: THEME.bgSecondary }]}>
                       <Text style={[s.sectionTitle, { color: '#ef4444' }]}>🚫 {t('friends.tab_blocked')} ({blockedList.length})</Text>
                     </View>
                     {blockedList.map((u) => (
                       <View key={u.userId?.toString()} style={[s.userCard, { backgroundColor: THEME.bgSecondary }]}>
                         <Avatar name={u.displayName} avatar={u.avatar} size={46} />
                         <View style={{ flex: 1, marginLeft: 14 }}>
                           <Text style={[s.userName, { color: THEME.textPrimary }]} numberOfLines={1}>{u.displayName}</Text>
                           <Text style={s.userHandle}>{u.email}</Text>
                         </View>
                         <TouchableOpacity
                           style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: THEME.accent }}
                           onPress={() => handleUnblockFromList(u.userId)}
                         >
                           <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('friends.unblock')}</Text>
                         </TouchableOpacity>
                       </View>
                     ))}
                   </View>
                 )}
              </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          refreshing={loadingContacts}
          onRefresh={fetchContacts}
          ListEmptyComponent={() => (
              !loadingContacts && (
                <View style={s.emptyWrap}>
                    <Text style={s.emptyIcon}>{searchQuery ? '🔎' : '👥'}</Text>
                    <Text style={s.emptyTitle}>{searchQuery ? t('friends.no_search_results') : t('friends.no_friends')}</Text>
                    <Text style={s.emptyDesc}>
                        {searchQuery
                            ? t('friends.global_search_hint')
                            : t('friends.no_friends_hint')}
                    </Text>
                </View>
              )
          )}
        />
      ) : (
        /* Camera Mode */
        <View style={{ flex: 1 }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              />
              {/* Scan overlay omitted for brevity but conceptually kept as a dark overlay */}
              <View style={s.scanDimTop} />
            </>
          ) : (
            <View style={s.permWrap}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>📷</Text>
              <Text style={s.permTitle}>{t('common.camera_permission_title')}</Text>
              <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                <Text style={s.permBtnText}>{t('common.grant_permission')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = (THEME) => StyleSheet.create({
  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  searchBoxFake: {
      flex: 1, height: 40, backgroundColor: THEME.bgInput,
      borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  modeToggle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: THEME.bgInput, justifyContent: 'center', alignItems: 'center',
  },
  modeToggleText: { fontSize: 20 },

  listHeaderWrap: { borderBottomWidth: 8, borderBottomColor: THEME.bgInput },
  bigRequestBtn: {
      flexDirection: 'row', alignItems: 'center',
      padding: 16, backgroundColor: THEME.bgPrimary
  },
  iconWrapper: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center',
      marginRight: 16
  },
  bigRequestText: { flex: 1, fontSize: 17, fontWeight: '500' },
  badge: {
      backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 12, minWidth: 26, alignItems: 'center'
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: THEME.textMuted },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: THEME.bgPrimary,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  userName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  userHandle: { fontSize: 13, color: THEME.textMuted },
  chatBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  optionsBtn: { padding: 8 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', lineHeight: 20 },

  scanDimTop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permTitle: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 24 },
  permBtn: { backgroundColor: THEME.accent, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});