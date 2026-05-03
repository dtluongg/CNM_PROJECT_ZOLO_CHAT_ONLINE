import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  Modal, Pressable, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Avatar from './Avatar';
import CallHistoryTab from '../../call/components/CallHistoryTab';
import GroupSettingsTab from './GroupSettingsTab';
import ChannelsTab from './ChannelsTab';
import RolesTab from './RolesTab';
import MembersTab from './MembersTab';
import JoinRequestsTab from './JoinRequestsTab';
import AddMembersModal from './AddMembersModal';
import MuteConversationModal from './MuteConversationModal'; // THÊM DÒNG NÀY
import { useNotifications } from '../../../context/NotificationContext';
import conversationApi from '../api/conversationApi';
import { useAuth } from '../../../context/AuthContext';

// ── InfoPanel ─────────────────────────────────────────────────────────────────
const InfoPanel = ({
  visible, onClose,
  infoTab, onTabChange,
  conversation,
  isOnline,
  mediaData, loadingMedia,
  blockStatus, blockConfirm, onBlockConfirm, blockBusy, onBlockUser,
  onImagePress, onFilePress, onViewProfile,
  onLeaveGroup, onDisbandGroup,
  topics, setTopics,
  onConversationUpdate,
  THEME, styles,
}) => {
  const { user: currentUser } = useAuth();
  const myUserId = currentUser?._id || currentUser?.id;

  const isGroup = conversation?.type === 'group';
  const convId = conversation?._id || conversation?.id;

  // ── State ────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState([]);
  const [loadingMem, setLoadingMem] = useState(false);
  const [roles, setRoles] = useState([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false); // THÊM DÒNG NÀY
  const { updateConversationSetting, getConversationSetting } = useNotifications() || {};
  // Inner sub-tab states
  const [contentSub, setContentSub] = useState('photos'); // 'photos' | 'files'
  const [memberSub, setMemberSub] = useState('list');   // 'list' | 'roles' | 'requests'
  // 1. THÊM STATE CỤC BỘ ĐỂ GIAO DIỆN PHẢN HỒI NGAY LẬP TỨC
  const [localIsMuted, setLocalIsMuted] = useState(false);
  // 2. ĐỒNG BỘ STATE NẾU DỮ LIỆU TỪ BÊN NGOÀI THAY ĐỔI
  useEffect(() => {
    setLocalIsMuted(conversation?.isMuted || conversation?.myMembership?.isMuted || false);
  }, [conversation?.isMuted, conversation?.myMembership?.isMuted]);
  useEffect(() => {
    if (visible) {
      const fetchRealSetting = async () => {
        const convId = conversation?._id || conversation?.id;
        if (convId && getConversationSetting) {
          const setting = await getConversationSetting(convId);
          if (setting) {
            setLocalIsMuted(setting.isMuted); // Cập nhật đúng trạng thái thật
          }
        }
      };
      fetchRealSetting();
    }
  }, [visible, conversation]);
  const loadMembers = useCallback(async () => {
    if (!convId) return;
    setLoadingMem(true);
    try {
      const res = await conversationApi.getConversationMembers(convId);
      const raw = res.data?.data || res.data?.members || res.data || [];
      setMembers(Array.isArray(raw) ? raw : []);
    } catch { setMembers([]); }
    finally { setLoadingMem(false); }
  }, [convId]);

  const loadRolesQuiet = useCallback(async () => {
    if (!convId || !isGroup) return;
    try {
      const res = await conversationApi.listRoles(convId);
      setRoles(res.data?.data || res.data?.roles || []);
    } catch { }
  }, [convId, isGroup]);

  useEffect(() => {
    if (visible && isGroup) loadMembers();
  }, [visible, isGroup, loadMembers]);

  useEffect(() => {
    if (visible && isGroup) loadRolesQuiet();
  }, [visible, isGroup, loadRolesQuiet]);

  // ── Derived permission flags ─────────────────────────────────────────────
  const myMember = members.find(m => (m.user?._id || m.user) === myUserId);
  const myRole = myMember?.role || 'member';
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || isOwner;
  // 2. Kiểm tra trạng thái hiện tại (Đảm bảo backend trả về isMuted qua myMembership hoặc trực tiếp)
  const isMuted = conversation?.isMuted || conversation?.myMembership?.isMuted || false;
  const handleUnmute = async () => {
    try {
      // Đổi UI ngay lập tức thành "Tắt thông báo" (Chuông reo)
      setLocalIsMuted(false);
      if (updateConversationSetting) {
        // Gửi lệnh tắt isMuted về false
        await updateConversationSetting(conversation._id || conversation.id, { isMuted: false, muteUntil: null });

        // Gọi hàm cập nhật Real-time ra ngoài màn hình chính
        if (onConversationUpdate) {
          onConversationUpdate({ ...conversation, isMuted: false, myMembership: { ...conversation.myMembership, isMuted: false } });
        }
      }
    } catch (error) {
      console.error("Lỗi khi bật thông báo:", error);
    }
  };
  // ── Main tab definitions ─────────────────────────────────────────────────
  // Group into 4 main sections max
  const tabs = [
    { key: 'overview', label: 'Tổng quan', icon: 'info' },
    { key: 'content', label: 'Nội dung', icon: 'image' },
    ...(isGroup ? [{ key: 'members', label: 'Thành viên', icon: 'users' }] : []),
    ...(isGroup ? [{ key: 'channels', label: 'Kênh', icon: 'hash' }] : []),
    ...(conversation?.type === 'dm' ? [{ key: 'calls', label: 'Cuộc gọi', icon: 'phone' }] : []),
  ];

  // ── Action handlers ──────────────────────────────────────────────────────
  const handleLeave = () => Alert.alert('Rời nhóm', 'Bạn có chắc muốn rời khỏi nhóm này?', [{ text: 'Huỷ', style: 'cancel' }, { text: 'Rời nhóm', style: 'destructive', onPress: () => onLeaveGroup?.() }]);
  const handleDisband = () => Alert.alert('Giải tán nhóm', 'Hành động này không thể hoàn tác. Xác nhận?', [{ text: 'Huỷ', style: 'cancel' }, { text: 'Giải tán', style: 'destructive', onPress: () => onDisbandGroup?.() }]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.sheetOverlay} onPress={onClose}>
          <View
            style={[styles.sheet, { maxHeight: '90%', flex: 1 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />

            {/* Avatar + Name */}
            <View style={{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 }}>
              <Avatar
                name={conversation.name}
                avatar={conversation.avatar}
                size={68}
                online={isOnline}
                THEME={THEME}
                styles={styles}
              />
              <Text style={{ fontSize: 17, fontWeight: '800', color: THEME.textPrimary, marginTop: 8 }}>
                {conversation.name}
              </Text>
              {conversation.type === 'dm' && (
                <Text style={{ fontSize: 12, color: isOnline ? THEME.statusOnline : THEME.textMuted, marginTop: 2 }}>
                  {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </Text>
              )}
              {isGroup && (
                <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                  {loadingMem ? 'Đang tải...' : members.length > 0 ? `${members.length} thành viên` : 'Nhóm chat'}
                </Text>
              )}
            </View>

            {/* Main tab bar */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 6 }}>
              {tabs.map(t => {
                const active = infoTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => onTabChange(t.key)}
                    style={{
                      flex: 1,
                      flexDirection: 'column',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: active ? THEME.accent + '22' : THEME.bgPrimary,
                      borderWidth: 1.5,
                      borderColor: active ? THEME.accent : 'transparent',
                      gap: 3,
                    }}
                  >
                    <Feather name={t.icon} size={16} color={active ? THEME.accent : THEME.textMuted} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: active ? THEME.accent : THEME.textMuted }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab content */}
            <View style={{ flex: 1 }}>

              {/* ── Tổng quan ── */}
              {infoTab === 'overview' && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>

                  {/* Basic info */}
                  <SectionHeader label="Thông tin" THEME={THEME} />
                  <InfoCard>
                    <InfoRow label="Loại" value={conversation.type === 'dm' ? 'Tin nhắn trực tiếp' : 'Nhóm chat'} THEME={THEME} border />
                    {isGroup && conversation.groupType && (
                      <InfoRow label="Phân loại" value={conversation.groupType} THEME={THEME} border />
                    )}
                    {isGroup && conversation.description ? (
                      <InfoRow label="Mô tả" value={conversation.description} THEME={THEME} />
                    ) : null}
                    {conversation.type === 'dm' && conversation.otherUserId && (
                      <TouchableOpacity
                        style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        onPress={onViewProfile}
                      >
                        <Text style={{ fontSize: 13, color: THEME.textMuted }}>Xem hồ sơ</Text>
                        <Text style={{ fontSize: 13, color: THEME.accent, fontWeight: '600' }}>→</Text>
                      </TouchableOpacity>
                    )}
                  </InfoCard>
                  {/* THÊM NÚT TẮT THÔNG BÁO TẠI ĐÂY */}
                  <TouchableOpacity
                    onPress={() => {
                      if (localIsMuted) {
                        handleUnmute(); // Đang tắt thì gọi hàm bật
                      } else {
                        setShowMuteModal(true); // Đang bật thì mở Modal
                      }
                    }}
                    style={{ backgroundColor: THEME.bgHover, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: THEME.border, marginTop: 4, marginBottom: 8 }}
                  >
                    <Text style={{ fontSize: 18 }}>{localIsMuted ? '🔔' : '🔕'}</Text>
                    <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 15 }}>
                      {localIsMuted ? 'Bật lại thông báo' : 'Tắt thông báo'}
                    </Text>
                  </TouchableOpacity>
                  {/* KẾT THÚC THÊM */}
                  {/* DM: block section */}
                  {conversation.type === 'dm' && conversation.otherUserId && (
                    <BlockSection
                      blockStatus={blockStatus} blockConfirm={blockConfirm}
                      onBlockConfirm={onBlockConfirm} blockBusy={blockBusy}
                      onBlockUser={onBlockUser} name={conversation.name}
                      THEME={THEME}
                    />
                  )}

                  {/* Group admin: settings inline */}
                  {isGroup && isAdmin && (
                    <>
                      <SectionHeader label="Cài đặt nhóm" THEME={THEME} />
                      <GroupSettingsTab
                        conversation={conversation}
                        THEME={THEME}
                        onUpdated={onConversationUpdate}
                        compact
                      />
                    </>
                  )}

                  {/* Group actions */}
                  {isGroup && (
                    <View style={{ marginTop: 12, gap: 10 }}>
                      {!isOwner && (
                        <DangerBtn icon="log-out" label="Rời nhóm" onPress={handleLeave} />
                      )}
                      {isOwner && (
                        <DangerBtn icon="trash-2" label="Giải tán nhóm" onPress={handleDisband} />
                      )}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* ── Nội dung ── */}
              {infoTab === 'content' && (
                <View style={{ flex: 1 }}>
                  {/* Inner sub-tabs: Ảnh / File */}
                  <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 8 }}>
                    {[
                      { key: 'photos', label: 'Ảnh', icon: 'image' },
                      { key: 'files', label: 'File', icon: 'file' },
                    ].map(s => (
                      <TouchableOpacity
                        key={s.key}
                        onPress={() => setContentSub(s.key)}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                          paddingVertical: 8, borderRadius: 10,
                          backgroundColor: contentSub === s.key ? THEME.accent + '20' : THEME.bgPrimary,
                          borderWidth: 1, borderColor: contentSub === s.key ? THEME.accent + '60' : THEME.border,
                        }}
                      >
                        <Feather name={s.icon} size={14} color={contentSub === s.key ? THEME.accent : THEME.textMuted} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: contentSub === s.key ? THEME.accent : THEME.textMuted }}>
                          {s.label}
                        </Text>
                        {s.key === 'photos' && mediaData.images.length > 0 && (
                          <View style={{ backgroundColor: THEME.accent, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>{mediaData.images.length}</Text>
                          </View>
                        )}
                        {s.key === 'files' && mediaData.files.length > 0 && (
                          <View style={{ backgroundColor: THEME.accent, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>{mediaData.files.length}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Photos */}
                  {contentSub === 'photos' && (
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                      {loadingMedia && <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>}
                      {!loadingMedia && mediaData.images.length === 0 && (
                        <EmptyState icon="image" label="Chưa có ảnh nào" THEME={THEME} />
                      )}
                      {!loadingMedia && mediaData.images.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                          {mediaData.images.map(item => (
                            <TouchableOpacity key={item._id} onPress={() => onImagePress(item.url)} style={{ width: '32%', aspectRatio: 1, borderRadius: 6, overflow: 'hidden' }}>
                              <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </ScrollView>
                  )}

                  {/* Files */}
                  {contentSub === 'files' && (
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                      {loadingMedia && <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>}
                      {!loadingMedia && mediaData.files.length === 0 && (
                        <EmptyState icon="file" label="Chưa có file nào" THEME={THEME} />
                      )}
                      {!loadingMedia && mediaData.files.map(file => (
                        <TouchableOpacity key={file._id} onPress={() => onFilePress(file.url, file.fileName)}
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: THEME.border }}>
                          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: THEME.accent + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                            <Feather name="file" size={20} color={THEME.accent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: THEME.textPrimary }}>{file.fileName || 'Không rõ tên'}</Text>
                            <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>{file.fileSize ? `${(file.fileSize / 1024).toFixed(0)} KB` : ''} · Nhấn để tải</Text>
                          </View>
                          <Feather name="download" size={16} color={THEME.accent} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* ── Cuộc gọi (DM) ── */}
              {infoTab === 'calls' && conversation?.type === 'dm' && (
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                  <CallHistoryTab
                    otherUserId={conversation.otherUserId}
                    otherUserName={conversation.name}
                    otherUserAvatar={conversation.avatar}
                  />
                </View>
              )}

              {/* ── Thành viên (group) ── */}
              {infoTab === 'members' && isGroup && (
                <View style={{ flex: 1 }}>
                  {/* Inner sub-tabs for admin */}
                  {isAdmin && (
                    <View
                      style={{
                        marginHorizontal: 12,
                        marginTop: 4,
                        marginBottom: 10,
                        padding: 4,
                        borderRadius: 14,
                        backgroundColor: THEME.bgPrimary,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        flexDirection: 'row',
                        gap: 4,
                      }}
                    >
                      {[
                        { key: 'list', label: 'Danh sách', icon: 'users' },
                        { key: 'roles', label: 'Phân quyền', icon: 'shield' },
                        { key: 'requests', label: 'Duyệt vào', icon: 'user-plus' },
                      ].map((s) => {
                        const active = memberSub === s.key;
                        return (
                          <TouchableOpacity
                            key={s.key}
                            onPress={() => setMemberSub(s.key)}
                            style={{
                              flex: 1,
                              minHeight: 40,
                              borderRadius: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 6,
                              backgroundColor: active ? THEME.accent + '20' : 'transparent',
                              borderWidth: active ? 1 : 0,
                              borderColor: active ? THEME.accent + '66' : 'transparent',
                            }}
                            activeOpacity={0.85}
                          >
                            <Feather name={s.icon} size={12} color={active ? THEME.accent : THEME.textMuted} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: active ? '700' : '600',
                                color: active ? THEME.accent : THEME.textMuted,
                              }}
                              numberOfLines={1}
                            >
                              {s.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Members list */}
                  {(!isAdmin || memberSub === 'list') && (
                    loadingMem ? (
                      <ActivityIndicator color={THEME.accent} style={{ marginVertical: 40 }} />
                    ) : (
                      <MembersTab
                        conversation={conversation}
                        members={members}
                        setMembers={setMembers}
                        loadMembers={loadMembers}
                        roles={roles}
                        isAdmin={isAdmin}
                        isOwner={isOwner}
                        myUserId={myUserId}
                        THEME={THEME}
                        onShowAddMembers={() => setShowAddMembers(true)}
                      />
                    )
                  )}

                  {/* Roles (admin only) */}
                  {isAdmin && memberSub === 'roles' && (
                    <RolesTab
                      conversation={conversation}
                      members={members}
                      setMembers={setMembers}
                      isAdmin={isAdmin}
                      topics={topics || []}
                      THEME={THEME}
                    />
                  )}

                  {/* Join requests (admin only) */}
                  {isAdmin && memberSub === 'requests' && (
                    <JoinRequestsTab conversation={conversation} THEME={THEME} />
                  )}
                </View>
              )}

              {/* ── Kênh (group) ── */}
              {infoTab === 'channels' && isGroup && (
                <ChannelsTab
                  conversation={conversation}
                  topics={topics || []}
                  setTopics={setTopics || (() => { })}
                  isAdmin={isAdmin}
                  THEME={THEME}
                  roles={roles}
                />
              )}

            </View>
          </View>
        </Pressable>
        <MuteConversationModal
          visible={showMuteModal}
          onClose={() => setShowMuteModal(false)}
          conversationId={conversation?._id || conversation?.id}
          THEME={THEME}
          onSuccess={() => {
            setLocalIsMuted(true);
            // Khi Modal xử lý thành công, gọi cập nhật Real-time ra ngoài
            if (onConversationUpdate) {
              onConversationUpdate({ ...conversation, isMuted: true, myMembership: { ...conversation.myMembership, isMuted: true } });
            }
          }}
        />
      </Modal>

      <AddMembersModal
        visible={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        conversation={conversation}
        currentMembers={members}
        THEME={THEME}
        onMembersAdded={() => { loadMembers(); setShowAddMembers(false); }}
      />
    </>
  );
};

export default InfoPanel;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, THEME }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: THEME.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: 8, marginTop: 4,
    }}>
      {label}
    </Text>
  );
}

function InfoCard({ children }) {
  return (
    <View style={{ backgroundColor: '#1e1f22', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      {children}
    </View>
  );
}

function InfoRow({ label, value, THEME, border }) {
  return (
    <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: border ? 1 : 0, borderBottomColor: '#1e1f22' }}>
      <Text style={{ fontSize: 13, color: '#80848e' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#f2f3f5', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, label, THEME }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
      <Feather name={icon} size={36} color={THEME.textMuted} style={{ opacity: 0.4 }} />
      <Text style={{ color: THEME.textMuted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function DangerBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(237,66,69,0.3)' }}>
      <Feather name={icon} size={18} color="#ed4245" />
      <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function BlockSection({ blockStatus, blockConfirm, onBlockConfirm, blockBusy, onBlockUser, name, THEME }) {
  if (blockStatus?.iBlocked) {
    return (
      <TouchableOpacity onPress={onBlockUser} disabled={blockBusy} style={{ backgroundColor: THEME.bgHover, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: THEME.border, opacity: blockBusy ? 0.6 : 1, marginTop: 4 }}>
        <Text style={{ fontSize: 18 }}>✅</Text>
        <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 15 }}>{blockBusy ? 'Đang xử lý...' : `Bỏ chặn ${name}`}</Text>
      </TouchableOpacity>
    );
  }
  if (!blockConfirm) {
    return (
      <TouchableOpacity onPress={() => onBlockConfirm(true)} style={{ backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(237,66,69,0.3)', marginTop: 4 }}>
        <Text style={{ fontSize: 18 }}>🚫</Text>
        <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>Chặn {name}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={{ backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(237,66,69,0.4)', marginTop: 4 }}>
      <Text style={{ color: '#f2f3f5', fontWeight: '700', fontSize: 14, marginBottom: 6 }}>Xác nhận chặn {name}?</Text>
      <Text style={{ color: '#80848e', fontSize: 12, marginBottom: 14 }}>Bạn sẽ không thể gửi tin nhắn cho người này.</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={() => onBlockConfirm(false)} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#35373c', alignItems: 'center' }}>
          <Text style={{ color: '#f2f3f5', fontWeight: '600' }}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBlockUser} disabled={blockBusy} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#ed4245', alignItems: 'center', opacity: blockBusy ? 0.6 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{blockBusy ? 'Đang chặn...' : 'Chặn'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
