import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  Modal, Pressable, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Avatar from './Avatar';
import CallHistoryTab from '../../call/components/CallHistoryTab';
import conversationApi from '../api/conversationApi';
import { useAuth } from '../../../context/AuthContext';
import { getAvatarColor, getInitials } from '../../../theme';

const InfoPanel = ({
  visible,
  onClose,
  infoTab,
  onTabChange,
  conversation,
  isOnline,
  mediaData,
  loadingMedia,
  blockStatus,
  blockConfirm,
  onBlockConfirm,
  blockBusy,
  onBlockUser,
  onImagePress,
  onFilePress,
  onViewProfile,
  onLeaveGroup,
  onDisbandGroup,
  THEME,
  styles,
}) => {
  const { user: currentUser } = useAuth();
  const myUserId = currentUser?._id || currentUser?.id;

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberBusy, setMemberBusy] = useState(null); // userId being acted on

  const isGroup = conversation?.type === 'group';

  const tabs = [
    { key: 'info',  label: 'Thông tin' },
    { key: 'media', label: 'Ảnh' },
    { key: 'files', label: 'File' },
    ...(conversation?.type === 'dm' ? [{ key: 'calls', label: 'Cuộc gọi' }] : []),
    ...(isGroup ? [{ key: 'members', label: 'Thành viên' }] : []),
  ];

    // Sửa loadMembers
    const loadMembers = useCallback(async () => {
      if (!conversation?._id && !conversation?.id) return;
      setLoadingMembers(true);
      try {
        const convId = conversation._id || conversation.id;
        const res = await conversationApi.getConversationMembers(convId);
        const raw = res.data?.data || res.data?.members || res.data || [];
        setMembers(Array.isArray(raw) ? raw : []);
      } catch (e) {
        console.warn('loadMembers error', e);
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    }, [conversation?._id, conversation?.id]);

  useEffect(() => {
    if (visible && infoTab === 'members' && isGroup) {
      loadMembers();
    }
  }, [visible, infoTab, isGroup, loadMembers]);

  const myMember = members.find(m => (m.user?._id || m.user) === myUserId);
  const myRole = myMember?.role || 'member';
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || isOwner;

  const handleKick = (member) => {
    const name = member.user?.displayName || member.user?.username || 'thành viên';
    Alert.alert('Xoá thành viên', `Bạn có chắc muốn xoá ${name} khỏi nhóm?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          const targetId = member.user?._id;
          const convId = conversation._id || conversation.id;
          setMemberBusy(targetId);
          try {
            await conversationApi.kickConversationMember(convId, targetId);
            setMembers(prev => prev.filter(m => (m.userId?._id || m.userId) !== targetId));
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xoá thành viên. Thử lại sau.');
          } finally {
            setMemberBusy(null);
          }
        },
      },
    ]);
  };

  const handleToggleAdmin = (member) => {
    const targetId = member.user?._id;
    const name = member.user?.displayName || member.user?.username || 'thành viên';
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const action = newRole === 'admin' ? `Thêm ${name} làm quản trị?` : `Gỡ quyền admin của ${name}?`;
    Alert.alert('Cập nhật quyền', action, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          const convId = conversation._id || conversation.id;
          setMemberBusy(targetId);
          try {
            await conversationApi.updateConversationMember(convId, targetId, { role: newRole });
            setMembers(prev => prev.map(m =>
              (m.userId?._id || m.userId) === targetId ? { ...m, role: newRole } : m
            ));
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể cập nhật quyền. Thử lại sau.');
          } finally {
            setMemberBusy(null);
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert('Rời nhóm', 'Bạn có chắc muốn rời khỏi nhóm này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Rời nhóm', style: 'destructive', onPress: () => onLeaveGroup?.() },
    ]);
  };

  const handleDisband = () => {
    Alert.alert('Giải tán nhóm', 'Hành động này không thể hoàn tác. Xác nhận giải tán nhóm?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Giải tán', style: 'destructive', onPress: () => onDisbandGroup?.() },
    ]);
  };

  const getRoleLabel = (role) => {
    if (role === 'owner') return { label: '👑', color: '#f59e0b' };
    if (role === 'admin') return { label: '⭐', color: '#3b82f6' };
    return { label: '👤', color: '#6b7280' };
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View
          style={[styles.sheet, { maxHeight: '85%', flex: 1 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sheetHandle} />

          {/* Avatar + Tên */}
          <View style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 }}>
            <Avatar
              name={conversation.name}
              avatar={conversation.avatar}
              size={72}
              online={isOnline}
              THEME={THEME}
              styles={styles}
            />
            <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.textPrimary, marginTop: 10 }}>
              {conversation.name}
            </Text>
            {conversation.type === 'dm' && (
              <Text style={{ fontSize: 12, color: isOnline ? THEME.statusOnline : THEME.textMuted, marginTop: 2 }}>
                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </Text>
            )}
            {isGroup && (
              <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                {members.length > 0 ? `${members.length} thành viên` : 'Nhóm chat'}
              </Text>
            )}
          </View>

          {/* Thanh tab */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              backgroundColor: THEME.bgPrimary,
              borderRadius: 8,
              padding: 3,
              marginBottom: 12,
            }}
          >
            {tabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => onTabChange(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 6,
                  alignItems: 'center',
                  backgroundColor: infoTab === t.key ? THEME.bgSecondary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: infoTab === t.key ? '700' : '500',
                    color: infoTab === t.key ? THEME.textPrimary : THEME.textMuted,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >

            {/* ── Tab Thông tin ── */}
            {infoTab === 'info' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                <View
                  style={{
                    backgroundColor: THEME.bgPrimary,
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
                >
                  {/* Loại cuộc hội thoại */}
                  <View
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: THEME.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: THEME.textMuted }}>Loại</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.textPrimary }}>
                      {conversation.type === 'dm' ? 'Tin nhắn trực tiếp' : 'Nhóm chat'}
                    </Text>
                  </View>

                  {/* Liên kết xem hồ sơ (chỉ chat đơn) */}
                  {conversation.type === 'dm' && conversation.otherUserId && (
                    <TouchableOpacity
                      style={{
                        padding: 14,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onPress={onViewProfile}
                    >
                      <Text style={{ fontSize: 13, color: THEME.textMuted }}>Xem hồ sơ</Text>
                      <Text style={{ fontSize: 13, color: THEME.accent, fontWeight: '600' }}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Chặn / bỏ chặn (chỉ chat đơn) */}
                {conversation.type === 'dm' && conversation.otherUserId && (
                  <>
                    {blockStatus?.iBlocked ? (
                      <TouchableOpacity
                        onPress={onBlockUser}
                        disabled={blockBusy}
                        style={{
                          backgroundColor: THEME.bgHover,
                          borderRadius: 12,
                          padding: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          opacity: blockBusy ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>✅</Text>
                        <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 15 }}>
                          {blockBusy ? 'Đang xử lý...' : `Bỏ chặn ${conversation.name}`}
                        </Text>
                      </TouchableOpacity>
                    ) : !blockConfirm ? (
                      <TouchableOpacity
                        onPress={() => onBlockConfirm(true)}
                        style={{
                          backgroundColor: 'rgba(237,66,69,0.12)',
                          borderRadius: 12,
                          padding: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(237,66,69,0.3)',
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>🚫</Text>
                        <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>
                          Chặn {conversation.name}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={{
                          backgroundColor: 'rgba(237,66,69,0.12)',
                          borderRadius: 12,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: 'rgba(237,66,69,0.4)',
                        }}
                      >
                        <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 6 }}>
                          Xác nhận chặn {conversation.name}?
                        </Text>
                        <Text style={{ color: THEME.textMuted, fontSize: 12, marginBottom: 14 }}>
                          Bạn sẽ không thể gửi tin nhắn cho người này.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => onBlockConfirm(false)}
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: THEME.bgHover,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: THEME.textPrimary, fontWeight: '600' }}>Hủy</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={onBlockUser}
                            disabled={blockBusy}
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: '#ed4245',
                              alignItems: 'center',
                              opacity: blockBusy ? 0.6 : 1,
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>
                              {blockBusy ? 'Đang chặn...' : 'Chặn'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Rời nhóm / giải tán (chỉ group) */}
                {isGroup && (
                  <View style={{ marginTop: 4, gap: 10 }}>
                    {!isOwner && (
                      <TouchableOpacity
                        onPress={handleLeave}
                        style={{
                          backgroundColor: 'rgba(237,66,69,0.12)',
                          borderRadius: 12,
                          padding: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(237,66,69,0.3)',
                        }}
                      >
                        <Feather name="log-out" size={18} color="#ed4245" />
                        <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>
                          Rời nhóm
                        </Text>
                      </TouchableOpacity>
                    )}
                    {isOwner && (
                      <TouchableOpacity
                        onPress={handleDisband}
                        style={{
                          backgroundColor: 'rgba(237,66,69,0.12)',
                          borderRadius: 12,
                          padding: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(237,66,69,0.3)',
                        }}
                      >
                        <Feather name="trash-2" size={18} color="#ed4245" />
                        <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>
                          Giải tán nhóm
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ── Tab Ảnh ── */}
            {infoTab === 'media' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {loadingMedia && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Đang tải...
                  </Text>
                )}
                {!loadingMedia && mediaData.images.length === 0 && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Chưa có ảnh nào được chia sẻ
                  </Text>
                )}
                {!loadingMedia && mediaData.images.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                    {mediaData.images.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => onImagePress(item.url)}
                        activeOpacity={0.85}
                        style={{ width: '32%', aspectRatio: 1, borderRadius: 6, overflow: 'hidden' }}
                      >
                        <Image
                          source={{ uri: item.url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            borderRadius: 8,
                            padding: 3,
                          }}
                        >
                          <Feather name="zoom-in" size={10} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Tab File ── */}
            {infoTab === 'files' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {loadingMedia && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Đang tải...
                  </Text>
                )}
                {!loadingMedia && mediaData.files.length === 0 && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Chưa có file nào được chia sẻ
                  </Text>
                )}
                {!loadingMedia &&
                  mediaData.files.map((file) => (
                    <TouchableOpacity
                      key={file._id}
                      onPress={() => onFilePress(file.url, file.fileName)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: THEME.bgPrimary,
                        borderRadius: 10,
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: THEME.accent + '18',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Feather
                          name={
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName || '') ? 'image' :
                            /\.(mp4|mov|avi|mkv)$/i.test(file.fileName || '') ? 'film' :
                            /\.(mp3|m4a|wav)$/i.test(file.fileName || '') ? 'music' :
                            /\.(pdf)$/i.test(file.fileName || '') ? 'file-text' :
                            /\.(zip|rar|7z)$/i.test(file.fileName || '') ? 'archive' :
                            'file'
                          }
                          size={20}
                          color={THEME.accent}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: THEME.textPrimary }}
                          numberOfLines={1}
                        >
                          {file.fileName || 'Không rõ tên'}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>
                          {file.fileSize ? `${(file.fileSize / 1024).toFixed(0)} KB` : ''} · Nhấn để tải
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: THEME.accent + '18',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Feather name="download" size={16} color={THEME.accent} />
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* ── Tab Cuộc gọi ── */}
            {infoTab === 'calls' && conversation?.type === 'dm' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                <CallHistoryTab
                  otherUserId={conversation.otherUserId}
                  otherUserName={conversation.name}
                  otherUserAvatar={conversation.avatar}
                />
              </View>
            )}

            {/* ── Tab Thành viên ── */}
            {infoTab === 'members' && isGroup && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {loadingMembers ? (
                  <ActivityIndicator color={THEME.accent} style={{ marginVertical: 24 }} />
                ) : (
                  <>
                    {members.length === 0 && (
                      <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                        Không có thành viên nào
                      </Text>
                    )}
                    {members.map((member) => {
                        const uid = member.user?._id || member._id;           // ← user thay vì userId
                        const uname = member.user?.displayName || member.user?.username || 'Người dùng';
                        const uavatar = member.user?.avatar;
                        const role = member.role || 'member';
                        const roleInfo = getRoleLabel(role);
                        const isMe = uid === myUserId;
                        const isBusy = memberBusy === uid;
                        const canKick = isAdmin && !isMe && role !== 'owner' && (isOwner || role === 'member');
                        const canToggleAdmin = isOwner && !isMe && role !== 'owner';

                      return (
                        <View
                          key={member._id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            backgroundColor: THEME.bgPrimary,
                            borderRadius: 10,
                            marginBottom: 6,
                          }}
                        >
                          {/* Avatar */}
                          {uavatar ? (
                            <Image
                              source={{ uri: uavatar }}
                              style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                marginRight: 10,
                                backgroundColor: getAvatarColor(uname),
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                                {getInitials(uname)}
                              </Text>
                            </View>
                          )}

                          {/* Name + role */}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.textPrimary }}>
                                {uname}
                              </Text>
                              {isMe && (
                                <Text style={{ fontSize: 11, color: THEME.textMuted }}>(bạn)</Text>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Text style={{ fontSize: 12 }}>{roleInfo.label}</Text>
                              <Text style={{ fontSize: 11, color: roleInfo.color }}>
                                {role === 'owner' ? 'Chủ nhóm' : role === 'admin' ? 'Quản trị' : 'Thành viên'}
                              </Text>
                            </View>
                          </View>

                          {/* Actions */}
                          {!isMe && (
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {canToggleAdmin && (
                                <TouchableOpacity
                                  onPress={() => handleToggleAdmin(member)}
                                  disabled={isBusy}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: role === 'admin' ? THEME.accent + '25' : THEME.bgHover,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                >
                                  {isBusy ? (
                                    <ActivityIndicator size="small" color={THEME.accent} />
                                  ) : (
                                    <Feather
                                      name="shield"
                                      size={15}
                                      color={role === 'admin' ? THEME.accent : THEME.textMuted}
                                    />
                                  )}
                                </TouchableOpacity>
                              )}
                              {canKick && (
                                <TouchableOpacity
                                  onPress={() => handleKick(member)}
                                  disabled={isBusy}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: 'rgba(237,66,69,0.12)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                >
                                  {isBusy ? (
                                    <ActivityIndicator size="small" color="#ed4245" />
                                  ) : (
                                    <Feather name="user-x" size={15} color="#ed4245" />
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

export default InfoPanel;
