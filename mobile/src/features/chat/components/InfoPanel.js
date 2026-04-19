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
  const convId  = conversation?._id || conversation?.id;

  // ── State ────────────────────────────────────────────────────────────────
  const [members,       setMembers]       = useState([]);
  const [loadingMem,    setLoadingMem]    = useState(false);
  const [roles,         setRoles]         = useState([]);
  const [showAddMembers, setShowAddMembers] = useState(false);

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
    } catch {}
  }, [convId, isGroup]);

  // Load members immediately when group panel opens (needed for role detection)
  useEffect(() => {
    if (visible && isGroup) loadMembers();
  }, [visible, isGroup, loadMembers]);

  useEffect(() => {
    if (visible && isGroup) loadRolesQuiet();
  }, [visible, isGroup, loadRolesQuiet]);

  // ── Derived permission flags ─────────────────────────────────────────────
  const myMember = members.find(m => (m.user?._id || m.user) === myUserId);
  const myRole   = myMember?.role || 'member';
  const isOwner  = myRole === 'owner';
  const isAdmin  = myRole === 'admin' || isOwner;

  // ── Tab definitions ──────────────────────────────────────────────────────
  const tabs = [
    { key: 'info',     label: 'Thông tin' },
    { key: 'media',    label: 'Ảnh' },
    { key: 'files',    label: 'File' },
    ...(conversation?.type === 'dm'  ? [{ key: 'calls',    label: 'Cuộc gọi' }] : []),
    ...(isGroup                      ? [{ key: 'members',  label: 'Thành viên' }] : []),
    ...(isGroup                      ? [{ key: 'channels', label: 'Kênh' }] : []),
    ...(isGroup && isAdmin           ? [{ key: 'roles',    label: 'Phân quyền' }] : []),
    ...(isGroup && isAdmin           ? [{ key: 'requests', label: 'Duyệt vào' }] : []),
    ...(isGroup && isAdmin           ? [{ key: 'settings', label: 'Cài đặt' }] : []),
  ];

  // ── Action handlers ──────────────────────────────────────────────────────
  const handleLeave   = () => Alert.alert('Rời nhóm',     'Bạn có chắc muốn rời khỏi nhóm này?',          [{ text: 'Huỷ', style: 'cancel' }, { text: 'Rời nhóm',  style: 'destructive', onPress: () => onLeaveGroup?.() }]);
  const handleDisband = () => Alert.alert('Giải tán nhóm','Hành động này không thể hoàn tác. Xác nhận?', [{ text: 'Huỷ', style: 'cancel' }, { text: 'Giải tán', style: 'destructive', onPress: () => onDisbandGroup?.() }]);

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

            {/* Scrollable tab bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexShrink: 0 }}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', paddingBottom: 10 }}
            >
              {tabs.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => onTabChange(t.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: infoTab === t.key ? THEME.accent : THEME.bgPrimary,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: infoTab === t.key ? '#fff' : THEME.textMuted }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab content */}
            <View style={{ flex: 1 }}>

              {/* ── Info ── */}
              {infoTab === 'info' && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
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

                  {conversation.type === 'dm' && conversation.otherUserId && (
                    <BlockSection
                      blockStatus={blockStatus} blockConfirm={blockConfirm}
                      onBlockConfirm={onBlockConfirm} blockBusy={blockBusy}
                      onBlockUser={onBlockUser} name={conversation.name}
                      THEME={THEME}
                    />
                  )}

                  {isGroup && (
                    <View style={{ marginTop: 4, gap: 10 }}>
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

              {/* ── Media ── */}
              {infoTab === 'media' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                  {loadingMedia && <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>}
                  {!loadingMedia && mediaData.images.length === 0 && (
                    <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Chưa có ảnh nào</Text>
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

              {/* ── Files ── */}
              {infoTab === 'files' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                  {loadingMedia && <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>}
                  {!loadingMedia && mediaData.files.length === 0 && (
                    <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>Chưa có file nào</Text>
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

              {/* ── Calls (DM) ── */}
              {infoTab === 'calls' && conversation?.type === 'dm' && (
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                  <CallHistoryTab
                    otherUserId={conversation.otherUserId}
                    otherUserName={conversation.name}
                    otherUserAvatar={conversation.avatar}
                  />
                </View>
              )}

              {/* ── Members ── */}
              {infoTab === 'members' && isGroup && (
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

              {/* ── Channels ── */}
              {infoTab === 'channels' && isGroup && (
                <ChannelsTab
                  conversation={conversation}
                  topics={topics || []}
                  setTopics={setTopics || (() => {})}
                  isAdmin={isAdmin}
                  THEME={THEME}
                />
              )}

              {/* ── Roles ── */}
              {infoTab === 'roles' && isGroup && isAdmin && (
                <RolesTab
                  conversation={conversation}
                  members={members}
                  setMembers={setMembers}
                  isAdmin={isAdmin}
                  topics={topics || []}
                  THEME={THEME}
                />
              )}

              {/* ── Join Requests ── */}
              {infoTab === 'requests' && isGroup && isAdmin && (
                <JoinRequestsTab conversation={conversation} THEME={THEME} />
              )}

              {/* ── Settings ── */}
              {infoTab === 'settings' && isGroup && isAdmin && (
                <GroupSettingsTab
                  conversation={conversation}
                  THEME={THEME}
                  onUpdated={onConversationUpdate}
                />
              )}

            </View>
          </View>
        </Pressable>
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
