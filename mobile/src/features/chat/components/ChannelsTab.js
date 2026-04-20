import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  TextInput, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import conversationApi from '../api/conversationApi';

const EMOJIS   = ['💬', '📢', '🎮', '📚', '🎵', '🔧', '❓', '🔊'];
const CH_TYPES = [
  { value: 'text',  label: 'Văn bản', icon: 'hash' },
  { value: 'voice', label: 'Thoại',   icon: 'volume-2' },
];

// Role access level: 'all' = no restriction, 'view' = view only, 'send' = can send, 'none' = no access
const ACCESS_OPTS = [
  { key: 'all',  label: 'Mặc định', color: '#888' },
  { key: 'send', label: '✓ Gửi',   color: '#57f287' },
  { key: 'view', label: '👁 Xem',   color: '#5865f2' },
  { key: 'none', label: '✕ Chặn',  color: '#ed4245' },
];

function defaultForm() {
  return {
    name: '', emoji: '💬', channelType: 'text',
    categoryName: '', description: '', isLocked: false,
  };
}

// Build rolePerms from existing roles for a given topicId
function buildRolePermsFromRoles(roles, topicId) {
  if (!topicId) return {};
  const tid = topicId.toString();
  const perms = {};
  for (const role of roles) {
    const allowed  = (role.allowedTopicIds  || []).map(id => id.toString());
    const sendable = (role.sendableTopicIds || []).map(id => id.toString());
    if (allowed.length === 0 && sendable.length === 0) {
      perms[role._id] = 'all'; // no restriction
    } else if (sendable.includes(tid)) {
      perms[role._id] = 'send';
    } else if (allowed.includes(tid)) {
      perms[role._id] = 'view';
    } else if (allowed.length > 0 && !allowed.includes(tid)) {
      perms[role._id] = 'none';
    } else {
      perms[role._id] = 'all';
    }
  }
  return perms;
}

export default function ChannelsTab({ conversation, topics, setTopics, isAdmin, THEME, roles = [] }) {
  const convId = conversation._id || conversation.id;

  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(defaultForm());
  const [rolePerms,  setRolePerms]  = useState({}); // { roleId: 'all'|'view'|'send'|'none' }
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(null);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm());
    setRolePerms({});
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditTarget(t);
    setForm({
      name:         t.name || '',
      emoji:        t.emoji || '💬',
      channelType:  t.channelType || 'text',
      categoryName: t.categoryName || '',
      description:  t.description || '',
      isLocked:     t.isLocked || false,
    });
    setRolePerms(buildRolePermsFromRoles(roles, t._id));
    setShowForm(true);
  };

  // After save: batch update roles that have explicit restrictions
  const applyRolePerms = useCallback(async (topicId) => {
    const tid = topicId.toString();
    const updates = Object.entries(rolePerms);
    for (const [roleId, level] of updates) {
      if (level === 'all') continue; // leave the role unchanged (wildcard)
      const role = roles.find(r => r._id === roleId);
      if (!role) continue;

      const allowed  = (role.allowedTopicIds  || []).map(id => id.toString());
      const sendable = (role.sendableTopicIds || []).map(id => id.toString());

      let newAllowed  = allowed.filter(id => id !== tid);
      let newSendable = sendable.filter(id => id !== tid);

      if (level === 'send') {
        newAllowed  = [...newAllowed, tid];
        newSendable = [...newSendable, tid];
      } else if (level === 'view') {
        newAllowed  = [...newAllowed, tid];
        // newSendable stays without tid
      }
      // level === 'none': both stay without tid (already filtered above)

      try {
        await conversationApi.updateRole(convId, roleId, {
          allowedTopicIds:  newAllowed,
          sendableTopicIds: newSendable,
        });
      } catch {}
    }
  }, [convId, rolePerms, roles]);

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Lỗi', 'Tên kênh không được để trống.');
    const cleanName = form.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!cleanName) return Alert.alert('Lỗi', 'Tên kênh phải chứa ký tự hợp lệ (a-z, 0-9, -).');
    setSaving(true);
    try {
      const payload = { ...form, name: cleanName };
      if (editTarget) {
        const res = await conversationApi.updateTopic(convId, editTarget._id, payload);
        const updated = res.data?.data || { ...editTarget, ...payload };
        await applyRolePerms(editTarget._id);
        setTopics(prev => prev.map(t => t._id === editTarget._id ? updated : t));
      } else {
        const res = await conversationApi.createTopic(convId, payload);
        const created = res.data?.data || { _id: `tmp_${Date.now()}`, ...payload };
        if (created._id && !created._id.toString().startsWith('tmp_')) {
          await applyRolePerms(created._id);
        }
        setTopics(prev => [...prev, created]);
      }
      setShowForm(false);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể lưu kênh.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (topic) => {
    Alert.alert(
      'Xóa kênh',
      `Xóa kênh "${topic.emoji || ''} ${topic.name}"? Tất cả tin nhắn sẽ bị mất.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            setDeleting(topic._id);
            try {
              await conversationApi.deleteTopic(convId, topic._id);
              setTopics(prev => prev.filter(t => t._id !== topic._id));
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa kênh. Thử lại sau.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleLock = async (topic) => {
    try {
      const newLocked = !topic.isLocked;
      await conversationApi.updateTopic(convId, topic._id, { isLocked: newLocked });
      setTopics(prev => prev.map(t => t._id === topic._id ? { ...t, isLocked: newLocked } : t));
    } catch {
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái kênh.');
    }
  };

  const textTopics  = topics.filter(t => !t.channelType || t.channelType === 'text');
  const voiceTopics = topics.filter(t => t.channelType === 'voice');

  const renderChannel = (topic) => (
    <View
      key={topic._id}
      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 6 }}
    >
      <Text style={{ fontSize: 16, marginRight: 8 }}>{topic.emoji || (topic.channelType === 'voice' ? '🔊' : '💬')}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: THEME.textPrimary, fontSize: 14, fontWeight: '600' }}>
          {topic.name}{topic.isLocked ? '  🔒' : ''}
        </Text>
        {!!topic.categoryName && (
          <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 1 }}>{topic.categoryName}</Text>
        )}
      </View>
      {isAdmin && (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IBtn
            onPress={() => handleToggleLock(topic)}
            bg={topic.isLocked ? '#faa61a22' : THEME.bgHover}
            icon={topic.isLocked ? 'unlock' : 'lock'}
            color={topic.isLocked ? '#faa61a' : THEME.textMuted}
          />
          <IBtn onPress={() => openEdit(topic)} bg={THEME.bgHover} icon="edit-2" color={THEME.textMuted} />
          <IBtn
            onPress={() => handleDelete(topic)}
            disabled={deleting === topic._id}
            bg="rgba(237,66,69,0.12)"
            icon="trash-2"
            color="#ed4245"
            loading={deleting === topic._id}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <SectionTitle title="Kênh văn bản" icon="hash" THEME={THEME} />
        {textTopics.length === 0 && <Empty text="Chưa có kênh văn bản" THEME={THEME} />}
        {textTopics.map(renderChannel)}

        <SectionTitle title="Kênh thoại" icon="volume-2" THEME={THEME} style={{ marginTop: 10 }} />
        {voiceTopics.length === 0 && <Empty text="Chưa có kênh thoại" THEME={THEME} />}
        {voiceTopics.map(renderChannel)}

        {isAdmin && (
          <TouchableOpacity
            onPress={openCreate}
            style={{
              marginTop: 14, flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              backgroundColor: THEME.accent + '15', borderRadius: 12, padding: 12,
              borderWidth: 1.5, borderColor: THEME.accent + '40', borderStyle: 'dashed',
            }}
          >
            <Feather name="plus" size={16} color={THEME.accent} />
            <Text style={{ color: THEME.accent, fontWeight: '700', fontSize: 14 }}>Tạo kênh mới</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Create / Edit sheet */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowForm(false)}>
          <Pressable
            onStartShouldSetResponder={() => true}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: THEME.bgSecondary,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              maxHeight: '90%',
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.bgHover, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={{ color: THEME.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 16 }}>
                {editTarget ? 'Chỉnh sửa kênh' : 'Tạo kênh mới'}
              </Text>

              {/* Channel type */}
              <FLabel text="Loại kênh" THEME={THEME} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {CH_TYPES.map(ct => {
                  const sel = form.channelType === ct.value;
                  return (
                    <TouchableOpacity
                      key={ct.value}
                      onPress={() => setForm(s => ({ ...s, channelType: ct.value }))}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, backgroundColor: sel ? THEME.accent + '22' : THEME.bgPrimary, borderWidth: 1.5, borderColor: sel ? THEME.accent : 'transparent' }}
                    >
                      <Feather name={ct.icon} size={14} color={sel ? THEME.accent : THEME.textMuted} />
                      <Text style={{ color: sel ? THEME.accent : THEME.textMuted, fontWeight: '600', fontSize: 13 }}>{ct.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Emoji */}
              <FLabel text="Emoji" THEME={THEME} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {EMOJIS.map(e => {
                  const sel = form.emoji === e;
                  return (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setForm(s => ({ ...s, emoji: e }))}
                      style={{ width: 42, height: 42, borderRadius: 10, marginRight: 6, backgroundColor: sel ? THEME.accent + '22' : THEME.bgPrimary, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: sel ? THEME.accent : 'transparent' }}
                    >
                      <Text style={{ fontSize: 18 }}>{e}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Name */}
              <FLabel text="Tên kênh" THEME={THEME} />
              <TextInput
                value={form.name}
                onChangeText={v => setForm(s => ({ ...s, name: v }))}
                placeholder="ten-kenh"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
                maxLength={40}
                style={[fInput(THEME), { marginBottom: 12 }]}
              />

              {/* Category */}
              <FLabel text="Danh mục (tuỳ chọn)" THEME={THEME} />
              <TextInput
                value={form.categoryName}
                onChangeText={v => setForm(s => ({ ...s, categoryName: v }))}
                placeholder="📚 Học tập"
                placeholderTextColor={THEME.textMuted}
                maxLength={40}
                style={[fInput(THEME), { marginBottom: 14 }]}
              />

              {/* Lock toggle */}
              <TouchableOpacity
                onPress={() => setForm(s => ({ ...s, isLocked: !s.isLocked }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}
              >
                <Toggle active={form.isLocked} activeColor={THEME.accent} bgOff={THEME.bgHover} />
                <Feather name="lock" size={14} color={THEME.textMuted} />
                <Text style={{ color: THEME.textPrimary, fontSize: 14 }}>Khoá kênh</Text>
              </TouchableOpacity>

              {/* ── Role permissions section ── */}
              {roles.length > 0 && (
                <>
                  <View style={{ height: 1, backgroundColor: THEME.border, marginBottom: 16 }} />
                  <FLabel text="Quyền truy cập theo vai trò" THEME={THEME} />
                  <Text style={{ color: THEME.textMuted, fontSize: 11, marginBottom: 12, lineHeight: 16 }}>
                    Mặc định = không hạn chế. Đặt Chặn để ẩn kênh với vai trò đó.
                  </Text>
                  {roles.map(role => {
                    const current = rolePerms[role._id] || 'all';
                    return (
                      <View key={role._id} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: role.color || '#888' }} />
                          <Text style={{ color: THEME.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 }}>{role.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {ACCESS_OPTS.map(opt => {
                            const sel = current === opt.key;
                            return (
                              <TouchableOpacity
                                key={opt.key}
                                onPress={() => setRolePerms(prev => ({ ...prev, [role._id]: opt.key }))}
                                style={{
                                  flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
                                  backgroundColor: sel ? opt.color + '22' : THEME.bgPrimary,
                                  borderWidth: 1.5,
                                  borderColor: sel ? opt.color : 'transparent',
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? opt.color : THEME.textMuted }}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ height: 1, backgroundColor: THEME.border, marginTop: 4, marginBottom: 20 }} />
                </>
              )}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: THEME.accent, borderRadius: 12, padding: 14, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{editTarget ? 'Lưu thay đổi' : 'Tạo kênh'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function IBtn({ onPress, bg, icon, color, disabled, loading }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Feather name={icon} size={14} color={color} />
      }
    </TouchableOpacity>
  );
}

function SectionTitle({ title, icon, THEME, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }, style]}>
      <Feather name={icon} size={12} color={THEME.textMuted} />
      <Text style={{ color: THEME.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </Text>
    </View>
  );
}

function Empty({ text, THEME }) {
  return (
    <Text style={{ color: THEME.textMuted, fontSize: 13, marginBottom: 10, paddingLeft: 4 }}>{text}</Text>
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
