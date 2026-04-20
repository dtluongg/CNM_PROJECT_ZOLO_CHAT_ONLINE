import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import conversationApi from '../api/conversationApi';

const GROUP_TYPES = [
  { value: 'general', label: '🏠 Chung',    color: '#5865f2' },
  { value: 'study',   label: '📚 Học tập',  color: '#57f287' },
  { value: 'gaming',  label: '🎮 Gaming',   color: '#faa61a' },
  { value: 'project', label: '💼 Dự án',    color: '#00b4d8' },
  { value: 'other',   label: '✨ Khác',     color: '#eb459e' },
];

export default function GroupSettingsTab({ conversation, THEME, onUpdated, compact }) {
  const [name,          setName]          = useState(conversation.name || '');
  const [description,   setDescription]   = useState(conversation.description || '');
  const [groupType,     setGroupType]     = useState(conversation.groupType || 'general');
  const [avatarUri,     setAvatarUri]     = useState(conversation.avatar || null);
  const [avatarBase64,  setAvatarBase64]  = useState(null);
  const [saving,        setSaving]        = useState(false);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Cần quyền', 'Hãy cho phép truy cập thư viện ảnh trong cài đặt.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Lỗi', 'Tên nhóm không được để trống.');
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), groupType };
      if (avatarBase64) payload.avatar = avatarBase64;
      await conversationApi.updateConversation(conversation._id || conversation.id, payload);
      onUpdated?.({ name: name.trim(), description: description.trim(), groupType, avatar: avatarUri });
      Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm.');
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể cập nhật. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={compact ? {} : { flex: 1 }}>
    <ScrollView style={compact ? {} : { flex: 1 }} contentContainerStyle={compact ? { paddingBottom: 8 } : { padding: 16, paddingBottom: 40 }}>
      {/* Avatar */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 88, height: 88, borderRadius: 44 }} />
          ) : (
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: THEME.accent + '25', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="users" size={36} color={THEME.accent} />
            </View>
          )}
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: THEME.bgSecondary }}>
            <Feather name="camera" size={13} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 8 }}>Nhấn để đổi ảnh</Text>
      </View>

      {/* Name */}
      <FieldLabel text="Tên nhóm" THEME={THEME} />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nhập tên nhóm..."
        placeholderTextColor={THEME.textMuted}
        style={inputSt(THEME)}
        maxLength={60}
      />

      {/* Description */}
      <FieldLabel text="Mô tả (tuỳ chọn)" THEME={THEME} />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Mô tả ngắn về nhóm..."
        placeholderTextColor={THEME.textMuted}
        multiline
        numberOfLines={3}
        style={[inputSt(THEME), { minHeight: 76, textAlignVertical: 'top', paddingTop: 10 }]}
        maxLength={200}
      />

      {/* Group type */}
      <FieldLabel text="Loại nhóm" THEME={THEME} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {GROUP_TYPES.map(t => {
          const active = groupType === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              onPress={() => setGroupType(t.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: active ? t.color + '28' : THEME.bgHover,
                borderWidth: 1.5,
                borderColor: active ? t.color : 'transparent',
              }}
            >
              <Text style={{ color: active ? t.color : THEME.textMuted, fontSize: 13, fontWeight: active ? '700' : '500' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        style={{ marginTop: 28, backgroundColor: THEME.accent, borderRadius: 12, padding: 14, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Lưu thay đổi</Text>
        }
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const FieldLabel = ({ text, THEME }) => (
  <Text style={{ color: THEME.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 18, textTransform: 'uppercase', letterSpacing: 0.5 }}>
    {text}
  </Text>
);

const inputSt = (THEME) => ({
  backgroundColor: THEME.bgPrimary,
  borderRadius: 10,
  padding: 12,
  color: THEME.textPrimary,
  fontSize: 14,
  borderWidth: 1,
  borderColor: THEME.border,
});
