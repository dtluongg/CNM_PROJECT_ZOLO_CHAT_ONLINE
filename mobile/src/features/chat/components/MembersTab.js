import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAvatarColor, getInitials } from '../../../theme';
import conversationApi from '../api/conversationApi';

const ROLE_INFO = {
  owner:  { label: '👑 Chủ nhóm',      color: '#f59e0b' },
  admin:  { label: '⭐ Quản trị viên',  color: '#3b82f6' },
  member: { label: '👤 Thành viên',     color: '#6b7280' },
};
const SECTION_ORDER  = ['owner', 'admin', 'member'];
const SECTION_LABELS = { owner: '👑 Chủ nhóm', admin: '🛡️ Quản trị viên', member: '👤 Thành viên' };

export default function MembersTab({
  conversation, members, setMembers, loadMembers,
  roles, isAdmin, isOwner, myUserId, THEME, onShowAddMembers,
}) {
  const convId = conversation?._id || conversation?.id;

  const [search,         setSearch]         = useState('');
  const [expandedId,     setExpandedId]     = useState(null);
  const [pendingEdit,    setPendingEdit]    = useState({});
  const [kickReason,     setKickReason]     = useState('');
  const [memberBusy,     setMemberBusy]     = useState(null);
  const [showRolePicker, setShowRolePicker] = useState(null); // userId

  const getRoleById = id => roles.find(r => r._id === id) || null;

  const normId = crid => {
    if (!crid) return null;
    return typeof crid === 'string' ? crid : crid._id?.toString() || null;
  };

  const getEdit = (uid, member) => {
    if (pendingEdit[uid]) return pendingEdit[uid];
    return {
      role:         member.role || 'member',
      customRoleId: normId(member.customRoleId),
    };
  };

  const setEdit = (uid, key, val) => {
    const base = getEdit(uid, members.find(m => (m.user?._id || m._id) === uid) || {});
    setPendingEdit(prev => ({ ...prev, [uid]: { ...base, [key]: val } }));
  };

  const isDirty = (uid, member) => {
    const ed = pendingEdit[uid];
    if (!ed) return false;
    return ed.role !== (member.role || 'member') || ed.customRoleId !== normId(member.customRoleId);
  };

  const handleSave = async (member) => {
    const uid = member.user?._id || member._id;
    const ed  = pendingEdit[uid];
    if (!ed) return;
    setMemberBusy(`save-${uid}`);
    try {
      if (ed.role !== member.role) {
        await conversationApi.updateConversationMember(convId, uid, { role: ed.role });
      }
      await conversationApi.assignMemberCustomRole(convId, uid, ed.customRoleId || null);
      setPendingEdit(prev => { const n = { ...prev }; delete n[uid]; return n; });
      await loadMembers();
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể lưu thay đổi.');
    } finally { setMemberBusy(null); }
  };

  const handleKick = (member) => {
    const uid  = member.user?._id || member._id;
    const name = member.user?.displayName || member.user?.username || 'thành viên';
    const reason = kickReason.trim();
    Alert.alert('Xóa thành viên', `Xóa ${name} khỏi nhóm?${reason ? `\nLý do: ${reason}` : ''}`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          setMemberBusy(`kick-${uid}`);
          try {
            await conversationApi.kickConversationMember(convId, uid, reason || null);
            setMembers(prev => prev.filter(m => (m.user?._id || m._id) !== uid));
            setExpandedId(null);
            setKickReason('');
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa thành viên.');
          } finally { setMemberBusy(null); }
        },
      },
    ]);
  };

  const handleTransferOwner = (member) => {
    const uid  = member.user?._id || member._id;
    const name = member.user?.displayName || member.user?.username || 'thành viên';
    Alert.alert('Chuyển quyền chủ nhóm', `Chuyển quyền chủ nhóm cho ${name}? Bạn sẽ trở thành quản trị viên.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Chuyển', style: 'destructive',
        onPress: async () => {
          setMemberBusy(`transfer-${uid}`);
          try {
            await conversationApi.transferConversationOwner(convId, uid);
            setMembers(prev => prev.map(m => {
              const mid = m.user?._id || m._id;
              if (mid === uid)      return { ...m, role: 'owner' };
              if (mid === myUserId) return { ...m, role: 'admin' };
              return m;
            }));
            setExpandedId(null);
          } catch {
            Alert.alert('Lỗi', 'Không thể chuyển quyền chủ nhóm.');
          } finally { setMemberBusy(null); }
        },
      },
    ]);
  };

  const filtered = members.filter(m =>
    (m.user?.displayName || m.user?.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderMember = (member) => {
    const uid    = member.user?._id || member._id;
    const uname  = member.user?.displayName || member.user?.username || 'Người dùng';
    const uavt   = member.user?.avatar;
    const role   = member.role || 'member';
    const ri     = ROLE_INFO[role] || ROLE_INFO.member;
    const isMe   = uid === myUserId;
    const isBusy = memberBusy && memberBusy.includes(uid);
    const isExp  = expandedId === uid;

    const canExpand   = isAdmin && !isMe && role !== 'owner';
    const canTransfer = isOwner && !isMe && role !== 'owner';

    const ed         = getEdit(uid, member);
    const customRole = getRoleById(ed.customRoleId);
    const dirty      = isDirty(uid, member);

    return (
      <View key={member._id || uid}>
        {/* Member row */}
        <TouchableOpacity
          onPress={() => canExpand && setExpandedId(isExp ? null : uid)}
          activeOpacity={canExpand ? 0.7 : 1}
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 10, paddingHorizontal: 14,
            backgroundColor: isExp ? (THEME.bgHover || '#35373c') : 'transparent',
          }}
        >
          {uavt ? (
            <Image source={{ uri: uavt }} style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10, flexShrink: 0 }} />
          ) : (
            <View style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10, flexShrink: 0, backgroundColor: getAvatarColor(uname), justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{getInitials(uname)}</Text>
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: THEME.textPrimary }}>{uname}</Text>
              {isMe && <Text style={{ fontSize: 10, color: THEME.textMuted }}>(bạn)</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11, color: ri.color }}>{ri.label}</Text>
              {customRole && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  backgroundColor: customRole.color + '22', paddingHorizontal: 6,
                  paddingVertical: 1, borderRadius: 8, borderWidth: 1, borderColor: customRole.color + '44',
                }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: customRole.color }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: customRole.color }}>{customRole.name}</Text>
                </View>
              )}
            </View>
          </View>

          {canExpand ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isBusy && <ActivityIndicator size="small" color={THEME.accent} />}
              <Feather name={isExp ? 'chevron-up' : 'chevron-down'} size={15} color={THEME.textMuted} />
            </View>
          ) : (
            isBusy && <ActivityIndicator size="small" color={THEME.accent} />
          )}
        </TouchableOpacity>

        {/* Expanded panel */}
        {isExp && canExpand && (
          <View style={{ backgroundColor: THEME.bgPrimary, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: THEME.border }}>

            {/* System role — owner only */}
            {isOwner && (
              <View style={{ marginBottom: 14 }}>
                <Text style={sLabel(THEME)}>Vai trò hệ thống</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['admin', 'member'].map(r => {
                    const active = ed.role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setEdit(uid, 'role', r)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                          backgroundColor: active ? (r === 'admin' ? '#3b82f620' : THEME.bgHover || '#35373c') : 'transparent',
                          borderWidth: 1.5,
                          borderColor: active ? (r === 'admin' ? '#3b82f6' : THEME.border) : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? (r === 'admin' ? '#3b82f6' : THEME.textPrimary) : THEME.textMuted }}>
                          {r === 'admin' ? '🛡️ Quản trị viên' : '👤 Thành viên'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Transfer owner */}
            {canTransfer && (
              <TouchableOpacity
                onPress={() => handleTransferOwner(member)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, padding: 10, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }}
              >
                <Feather name="award" size={14} color="#f59e0b" />
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '600' }}>Chuyển quyền chủ nhóm</Text>
              </TouchableOpacity>
            )}

            {/* Custom role picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={sLabel(THEME)}>Vai trò tuỳ chỉnh</Text>
              <TouchableOpacity
                onPress={() => setShowRolePicker(uid)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: THEME.bgHover || '#35373c', borderRadius: 8, borderWidth: 1, borderColor: THEME.border }}
              >
                {customRole ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: customRole.color }} />
                    <Text style={{ color: THEME.textPrimary, fontSize: 13, fontWeight: '600' }}>{customRole.name}</Text>
                  </View>
                ) : (
                  <Text style={{ color: THEME.textMuted, fontSize: 13 }}>— Không có (mặc định) —</Text>
                )}
                <Feather name="chevron-down" size={13} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Kick reason */}
            <View style={{ marginBottom: 12 }}>
              <Text style={sLabel(THEME)}>Lý do xóa (tuỳ chọn)</Text>
              <TextInput
                value={kickReason}
                onChangeText={setKickReason}
                placeholder="Nhập lý do xóa thành viên..."
                placeholderTextColor={THEME.textMuted}
                style={{ padding: 10, backgroundColor: THEME.bgHover || '#35373c', borderRadius: 8, borderWidth: 1, borderColor: THEME.border, color: THEME.textPrimary, fontSize: 13 }}
              />
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {dirty && (
                <TouchableOpacity
                  onPress={() => handleSave(member)}
                  disabled={memberBusy === `save-${uid}`}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: 'rgba(87,242,135,0.15)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(87,242,135,0.35)' }}
                >
                  {memberBusy === `save-${uid}` ? (
                    <ActivityIndicator size="small" color="#57f287" />
                  ) : (
                    <>
                      <Feather name="save" size={14} color="#57f287" />
                      <Text style={{ color: '#57f287', fontSize: 13, fontWeight: '700' }}>Lưu thay đổi</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleKick(member)}
                disabled={memberBusy === `kick-${uid}`}
                style={{ flex: dirty ? undefined : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(237,66,69,0.3)' }}
              >
                {memberBusy === `kick-${uid}` ? (
                  <ActivityIndicator size="small" color="#ed4245" />
                ) : (
                  <>
                    <Feather name="user-x" size={14} color="#ed4245" />
                    <Text style={{ color: '#ed4245', fontSize: 13, fontWeight: '600' }}>Xóa khỏi nhóm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Add members */}
      {isAdmin && (
        <TouchableOpacity
          onPress={onShowAddMembers}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginBottom: 8, padding: 12, backgroundColor: THEME.accent + '15', borderRadius: 12, borderWidth: 1, borderColor: THEME.accent + '40' }}
        >
          <Feather name="user-plus" size={16} color={THEME.accent} />
          <Text style={{ color: THEME.accent, fontWeight: '700', fontSize: 14 }}>Thêm thành viên</Text>
        </TouchableOpacity>
      )}

      {/* Search */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bgPrimary, borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: THEME.border }}>
          <Feather name="search" size={13} color={THEME.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm thành viên..."
            placeholderTextColor={THEME.textMuted}
            style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, color: THEME.textPrimary, fontSize: 13 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={13} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Member list grouped by role */}
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {SECTION_ORDER.map(roleGroup => {
          const group = filtered.filter(m => (m.role || 'member') === roleGroup);
          if (group.length === 0) return null;
          return (
            <View key={roleGroup}>
              <Text style={{
                color: THEME.textMuted, fontSize: 11, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.5,
                paddingHorizontal: 14, paddingTop: 12, paddingBottom: 5,
              }}>
                {SECTION_LABELS[roleGroup]} ({group.length})
              </Text>
              {group.map(renderMember)}
            </View>
          );
        })}

        {filtered.length === 0 && members.length > 0 && (
          <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 24, fontSize: 13 }}>
            Không tìm thấy thành viên nào
          </Text>
        )}
      </ScrollView>

      {/* Custom role picker sheet */}
      <Modal visible={!!showRolePicker} transparent animationType="slide" onRequestClose={() => setShowRolePicker(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowRolePicker(null)}>
          <Pressable
            onStartShouldSetResponder={() => true}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.bgSecondary || '#2b2d31', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.bgHover || '#35373c', alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ color: THEME.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>Chọn vai trò tuỳ chỉnh</Text>

            {/* No role */}
            <TouchableOpacity
              onPress={() => { setEdit(showRolePicker, 'customRoleId', null); setShowRolePicker(null); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 8 }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: THEME.border }} />
              <Text style={{ flex: 1, color: THEME.textMuted, fontSize: 14 }}>— Không có (mặc định) —</Text>
              {!getEdit(showRolePicker, members.find(m => (m.user?._id || m._id) === showRolePicker) || {}).customRoleId && (
                <Feather name="check" size={16} color={THEME.accent} />
              )}
            </TouchableOpacity>

            {roles.map(role => {
              const currentRoleId = showRolePicker
                ? getEdit(showRolePicker, members.find(m => (m.user?._id || m._id) === showRolePicker) || {}).customRoleId
                : null;
              return (
                <TouchableOpacity
                  key={role._id}
                  onPress={() => { setEdit(showRolePicker, 'customRoleId', role._id); setShowRolePicker(null); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 8 }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: role.color }} />
                  <Text style={{ flex: 1, color: THEME.textPrimary, fontSize: 14, fontWeight: '600' }}>{role.name}</Text>
                  {currentRoleId === role._id && <Feather name="check" size={16} color={THEME.accent} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function sLabel(THEME) {
  return {
    color: THEME.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7,
  };
}
