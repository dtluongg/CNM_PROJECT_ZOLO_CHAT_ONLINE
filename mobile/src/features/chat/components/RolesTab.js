import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  TextInput, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import conversationApi from '../api/conversationApi';

const ROLE_COLORS = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#faa61a', '#ed4245', '#9b59b6', '#e67e22',
  '#1abc9c', '#99aab5',
];

const PERMS = [
  { key: 'canSendMessages',   label: 'Gửi tin nhắn trong nhóm', icon: 'message-square' },
  { key: 'canInviteMembers',  label: 'Mời thành viên',          icon: 'user-plus' },
  { key: 'canManageMembers',  label: 'Quản lý thành viên',      icon: 'shield' },
];

function emptyForm() {
  return {
    name: '',
    color: ROLE_COLORS[0],
    permissions: { canSendMessages: true, canInviteMembers: false, canManageMembers: false },
    allowedTopicIds: [],
    sendableTopicIds: [],
  };
}

function normTopicIds(arr) {
  return (arr || []).map(t => (t._id || t).toString());
}

export default function RolesTab({ conversation, members, setMembers, isAdmin, topics, THEME }) {
  const convId = conversation._id || conversation.id;

  const textTopics  = (topics || []).filter(t => t.channelType === 'text');
  const voiceTopics = (topics || []).filter(t => t.channelType === 'voice');
  const allTopics   = [...textTopics, ...voiceTopics];

  const [roles,      setRoles]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(emptyForm());
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [assignFor,  setAssignFor]  = useState(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conversationApi.listRoles(convId);
      setRoles(res.data?.data || res.data?.roles || []);
    } catch { setRoles([]); }
    finally { setLoading(false); }
  }, [convId]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const openCreate = () => { setEditTarget(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit   = (r)  => {
    setEditTarget(r);
    setForm({
      name:  r.name  || '',
      color: r.color || ROLE_COLORS[0],
      permissions: {
        canSendMessages:  r.permissions?.canSendMessages  ?? true,
        canInviteMembers: r.permissions?.canInviteMembers ?? false,
        canManageMembers: r.permissions?.canManageMembers ?? false,
      },
      allowedTopicIds:  normTopicIds(r.allowedTopicIds),
      sendableTopicIds: normTopicIds(r.sendableTopicIds),
    });
    setShowForm(true);
  };

  const toggleTopicId = (field, tid) => {
    setForm(prev => {
      const arr  = prev[field] || [];
      const next = arr.includes(tid) ? arr.filter(id => id !== tid) : [...arr, tid];

      if (field === 'allowedTopicIds' && !next.includes(tid)) {
        // Removing view access → must also remove send access
        return { ...prev, allowedTopicIds: next, sendableTopicIds: prev.sendableTopicIds.filter(id => id !== tid) };
      }
      if (field === 'sendableTopicIds' && next.includes(tid)) {
        // Adding send access → must also grant view access (invariant: sendable ⊆ allowed)
        const allowed = prev.allowedTopicIds.includes(tid)
          ? prev.allowedTopicIds
          : [...prev.allowedTopicIds, tid];
        return { ...prev, sendableTopicIds: next, allowedTopicIds: allowed };
      }
      return { ...prev, [field]: next };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Lỗi', 'Tên vai trò không được để trống.');
    setSaving(true);
    try {
      if (editTarget) {
        const res = await conversationApi.updateRole(convId, editTarget._id, form);
        const updated = res.data?.data || { ...editTarget, ...form };
        setRoles(prev => prev.map(r => r._id === editTarget._id ? updated : r));
      } else {
        const res = await conversationApi.createRole(convId, form);
        const created = res.data?.data || { _id: `tmp_${Date.now()}`, ...form };
        setRoles(prev => [...prev, created]);
      }
      setShowForm(false);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể lưu vai trò.');
    } finally { setSaving(false); }
  };

  const handleDelete = (role) => {
    Alert.alert(
      'Xóa vai trò',
      `Xóa vai trò "${role.name}"? Thành viên đang có vai trò này sẽ trở thành thành viên thường.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            setDeleting(role._id);
            try {
              await conversationApi.deleteRole(convId, role._id);
              setRoles(prev => prev.filter(r => r._id !== role._id));
            } catch { Alert.alert('Lỗi', 'Không thể xóa vai trò.'); }
            finally { setDeleting(null); }
          },
        },
      ]
    );
  };

  const handleAssign = async (member, roleId) => {
    const memberId = member.user?._id || member._id;
    try {
      await conversationApi.assignMemberCustomRole(convId, memberId, roleId);
      setMembers(prev => prev.map(m =>
        (m.user?._id || m._id) === memberId ? { ...m, customRoleId: roleId } : m
      ));
      setAssignFor(null);
    } catch { Alert.alert('Lỗi', 'Không thể gán vai trò.'); }
  };

  const getRoleById  = id => roles.find(r => r._id === id) || null;
  const permSummary  = r => [
    r.permissions?.canSendMessages  && 'Gửi tin',
    r.permissions?.canInviteMembers && 'Mời TV',
    r.permissions?.canManageMembers && 'Quản lý',
  ].filter(Boolean).join(' · ') || 'Không có quyền';

  const getMembersOfRole = rId =>
    members.filter(m => {
      const cid = typeof m.customRoleId === 'string' ? m.customRoleId : m.customRoleId?._id?.toString();
      return cid === rId;
    });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>

        {/* ── Role counter ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: THEME.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Vai trò tuỳ chỉnh ({roles.length}/10)
          </Text>
          {isAdmin && roles.length < 10 && (
            <TouchableOpacity
              onPress={openCreate}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: THEME.accent, borderRadius: 8 }}
            >
              <Feather name="plus" size={13} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Tạo role</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={THEME.accent} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {roles.length === 0 && (
              <Text style={{ color: THEME.textMuted, fontSize: 13, marginBottom: 12, textAlign: 'center', paddingVertical: 20 }}>
                Chưa có vai trò nào. Tạo vai trò để phân quyền thành viên.
              </Text>
            )}

            {roles.map(role => {
              const roleMembers = getMembersOfRole(role._id);
              return (
                <View key={role._id} style={{ padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 8 }}>
                  {/* Role header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: role.color || '#888', marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.textPrimary, fontSize: 14, fontWeight: '700' }}>{role.name}</Text>
                      <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 2 }}>{permSummary(role)}</Text>
                    </View>
                    {isAdmin && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <IBt onPress={() => openEdit(role)} bg={THEME.bgHover || '#35373c'} icon="edit-2" color={THEME.textMuted} />
                        <IBt
                          onPress={() => handleDelete(role)}
                          disabled={deleting === role._id}
                          loading={deleting === role._id}
                          bg="rgba(237,66,69,0.12)" icon="trash-2" color="#ed4245"
                        />
                      </View>
                    )}
                  </View>

                  {/* Members using this role */}
                  {roleMembers.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <Feather name="users" size={11} color={THEME.textMuted} />
                      <Text style={{ color: THEME.textMuted, fontSize: 11 }}>
                        {roleMembers.map(m => m.user?.displayName || m.user?.username).filter(Boolean).slice(0, 3).join(', ')}
                        {roleMembers.length > 3 ? ` +${roleMembers.length - 3} khác` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Topic access summary */}
                  {(role.allowedTopicIds?.length > 0 || role.sendableTopicIds?.length > 0) && (
                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {normTopicIds(role.allowedTopicIds).map(tid => {
                        const t = allTopics.find(tp => tp._id === tid);
                        if (!t) return null;
                        const canSend = normTopicIds(role.sendableTopicIds).includes(tid);
                        return (
                          <View key={tid} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: canSend ? 'rgba(87,242,135,0.12)' : 'rgba(88,101,242,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Feather name={t.channelType === 'voice' ? 'volume-2' : 'hash'} size={10} color={canSend ? '#57f287' : '#5865f2'} />
                            <Text style={{ fontSize: 10, color: canSend ? '#57f287' : '#5865f2', fontWeight: '600' }}>{t.name}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ── Assign roles to members ── */}
        {isAdmin && roles.length > 0 && (
          <>
            <Text style={{ color: THEME.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 }}>
              Gán vai trò cho thành viên
            </Text>
            {members.filter(m => m.role !== 'owner').map(member => {
              const uid      = member.user?._id || member._id;
              const uname    = member.user?.displayName || member.user?.username || 'Người dùng';
              const assigned = getRoleById(member.customRoleId);
              return (
                <View key={uid} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: THEME.textPrimary, fontSize: 14, fontWeight: '600' }}>{uname}</Text>
                    {assigned ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: assigned.color }} />
                        <Text style={{ color: THEME.textMuted, fontSize: 11 }}>{assigned.name}</Text>
                      </View>
                    ) : (
                      <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 2 }}>Chưa có vai trò</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => setAssignFor(member)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: THEME.bgHover || '#35373c', borderRadius: 8 }}
                  >
                    <Text style={{ color: THEME.accent, fontSize: 13, fontWeight: '600' }}>Gán</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── Create / Edit role sheet ── */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowForm(false)}>
          <Pressable
            onStartShouldSetResponder={() => true}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.bgSecondary || '#2b2d31', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}
          >
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.bgHover || '#35373c', alignSelf: 'center', marginBottom: 16 }} />
              <Text style={{ color: THEME.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 16 }}>
                {editTarget ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
              </Text>

              {/* Name */}
              <FLabel text="Tên vai trò" THEME={THEME} />
              <TextInput
                value={form.name}
                onChangeText={v => setForm(s => ({ ...s, name: v }))}
                placeholder="Ví dụ: Moderator"
                placeholderTextColor={THEME.textMuted}
                maxLength={30}
                style={[fInput(THEME), { marginBottom: 14 }]}
              />

              {/* Color */}
              <FLabel text="Màu sắc" THEME={THEME} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {ROLE_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setForm(s => ({ ...s, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, marginRight: 8, borderWidth: form.color === c ? 3 : 0, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' }}
                  >
                    {form.color === c && <Feather name="check" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Permissions */}
              <FLabel text="Quyền hạn" THEME={THEME} />
              {PERMS.map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setForm(s => ({ ...s, permissions: { ...s.permissions, [key]: !s.permissions[key] } }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}
                >
                  <Toggle active={form.permissions[key]} activeColor={THEME.accent} bgOff={THEME.bgHover || '#35373c'} />
                  <Feather name={icon} size={14} color={THEME.textMuted} />
                  <Text style={{ color: THEME.textPrimary, fontSize: 14, flex: 1 }}>{label}</Text>
                </TouchableOpacity>
              ))}

              {/* Topic permissions */}
              {allTopics.length > 0 && (
                <>
                  <FLabel text="Quyền truy cập kênh" THEME={THEME} />
                  <View style={{ padding: 10, backgroundColor: THEME.bgPrimary, borderRadius: 8, marginBottom: 10 }}>
                    <Text style={{ color: THEME.textMuted, fontSize: 11, lineHeight: 16 }}>
                      💡 Xem: cho phép vào kênh · Gửi: cho phép gửi tin nhắn{'\n'}
                      Để trống tất cả Xem = được xem mọi kênh mặc định
                    </Text>
                  </View>
                  {allTopics.map(t => {
                    const tid       = t._id.toString();
                    const hasAccess = form.allowedTopicIds.includes(tid);
                    const hasSend   = form.sendableTopicIds.includes(tid);
                    return (
                      <View key={tid} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        padding: 10, backgroundColor: THEME.bgPrimary, borderRadius: 8, marginBottom: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: hasSend ? '#57f287' : hasAccess ? '#5865f2' : (THEME.border || '#35373c'),
                      }}>
                        <Feather name={t.channelType === 'voice' ? 'volume-2' : 'hash'} size={12} color={THEME.textMuted} />
                        <Text style={{ flex: 1, color: THEME.textPrimary, fontSize: 13 }}>{t.emoji ? `${t.emoji} ` : ''}{t.name}</Text>
                        <Text style={{
                          fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                          backgroundColor: hasSend ? 'rgba(87,242,135,0.15)' : hasAccess ? 'rgba(88,101,242,0.15)' : 'rgba(237,66,69,0.1)',
                          color: hasSend ? '#57f287' : hasAccess ? '#5865f2' : '#ed4245',
                          marginRight: 4,
                        }}>
                          {hasSend ? '✓ Gửi' : hasAccess ? '👁 Xem' : '✕ Chặn'}
                        </Text>
                        {/* View checkbox */}
                        <TouchableOpacity
                          onPress={() => toggleTopicId('allowedTopicIds', tid)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4 }}
                        >
                          <View style={{
                            width: 16, height: 16, borderRadius: 3, borderWidth: 1.5,
                            borderColor: hasAccess ? THEME.accent : (THEME.border || '#35373c'),
                            backgroundColor: hasAccess ? THEME.accent : 'transparent',
                            justifyContent: 'center', alignItems: 'center',
                          }}>
                            {hasAccess && <Feather name="check" size={10} color="#fff" />}
                          </View>
                          <Text style={{ color: THEME.textMuted, fontSize: 11 }}>Xem</Text>
                        </TouchableOpacity>
                        {/* Send checkbox */}
                        <TouchableOpacity
                          onPress={() => hasAccess && toggleTopicId('sendableTopicIds', tid)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, opacity: hasAccess ? 1 : 0.4 }}
                          disabled={!hasAccess}
                        >
                          <View style={{
                            width: 16, height: 16, borderRadius: 3, borderWidth: 1.5,
                            borderColor: hasSend ? '#57f287' : (THEME.border || '#35373c'),
                            backgroundColor: hasSend ? '#57f287' : 'transparent',
                            justifyContent: 'center', alignItems: 'center',
                          }}>
                            {hasSend && <Feather name="check" size={10} color="#fff" />}
                          </View>
                          <Text style={{ color: THEME.textMuted, fontSize: 11 }}>Gửi</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ marginTop: 14, backgroundColor: THEME.accent, borderRadius: 12, padding: 14, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{editTarget ? 'Lưu thay đổi' : 'Tạo vai trò'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Assign role sheet ── */}
      <Modal visible={!!assignFor} transparent animationType="slide" onRequestClose={() => setAssignFor(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setAssignFor(null)}>
          <Pressable
            onStartShouldSetResponder={() => true}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.bgSecondary || '#2b2d31', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.bgHover || '#35373c', alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ color: THEME.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>
              Gán vai trò cho {assignFor?.user?.displayName || 'thành viên'}
            </Text>

            <TouchableOpacity
              onPress={() => handleAssign(assignFor, null)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 8 }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: THEME.border }} />
              <Text style={{ flex: 1, color: THEME.textMuted, fontSize: 14 }}>Không có vai trò</Text>
              {!assignFor?.customRoleId && <Feather name="check" size={16} color={THEME.accent} />}
            </TouchableOpacity>

            {roles.map(role => (
              <TouchableOpacity
                key={role._id}
                onPress={() => handleAssign(assignFor, role._id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 8 }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: role.color }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: THEME.textPrimary, fontSize: 14, fontWeight: '600' }}>{role.name}</Text>
                  <Text style={{ color: THEME.textMuted, fontSize: 11 }}>{permSummary(role)}</Text>
                </View>
                {assignFor?.customRoleId === role._id && <Feather name="check" size={16} color={THEME.accent} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function IBt({ onPress, bg, icon, color, disabled, loading }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      {loading ? <ActivityIndicator size="small" color={color} /> : <Feather name={icon} size={14} color={color} />}
    </TouchableOpacity>
  );
}

function FLabel({ text, THEME }) {
  return (
    <Text style={{ color: THEME.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>
      {text}
    </Text>
  );
}

function Toggle({ active, activeColor, bgOff }) {
  return (
    <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: active ? activeColor : bgOff, justifyContent: 'center', paddingHorizontal: 3 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', transform: [{ translateX: active ? 18 : 0 }] }} />
    </View>
  );
}

function fInput(THEME) {
  return { backgroundColor: THEME.bgPrimary, borderRadius: 10, padding: 12, color: THEME.textPrimary, fontSize: 14, borderWidth: 1, borderColor: THEME.border };
}
