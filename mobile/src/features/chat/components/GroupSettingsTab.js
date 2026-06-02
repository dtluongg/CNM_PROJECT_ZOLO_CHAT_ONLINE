import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import conversationApi from '../api/conversationApi';
import { useLanguage } from '../../../context/LanguageContext';

export default function GroupSettingsTab({ conversation, THEME, onUpdated, compact }) {
  const { t } = useLanguage();
  
  const GROUP_TYPES = [
    { value: 'general', label: `🏠 ${t('chat.group_types.general')}`,    color: '#5865f2' },
    { value: 'study',   label: `📚 ${t('chat.group_types.study')}`,  color: '#57f287' },
    { value: 'gaming',  label: `🎮 ${t('chat.group_types.gaming')}`,   color: '#faa61a' },
    { value: 'project', label: `💼 ${t('chat.group_types.project')}`,    color: '#00b4d8' },
    { value: 'other',   label: `✨ ${t('chat.group_types.other')}`,     color: '#eb459e' },
  ];

  const [name,          setName]          = useState(conversation.name || '');
  const [description,   setDescription]   = useState(conversation.description || '');
  const [groupType,     setGroupType]     = useState(conversation.groupType || 'general');
  const [avatarUri,     setAvatarUri]     = useState(conversation.avatar || null);
  const [avatarBase64,  setAvatarBase64]  = useState(null);
  const [saving,        setSaving]        = useState(false);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert(t('common.error'), t('common.camera_permission_desc'));
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
    if (!name.trim()) return Alert.alert(t('common.error'), t('auth.fill_all_fields'));
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), groupType };
      if (avatarBase64) payload.avatar = avatarBase64;
      await conversationApi.updateConversation(conversation._id || conversation.id, payload);
      onUpdated?.({ name: name.trim(), description: description.trim(), groupType, avatar: avatarUri });
      Alert.alert(t('common.success'), t('info_panel.settings.update_success'));
    } catch (e) {
      Alert.alert(t('common.error'), e.response?.data?.message || t('info_panel.settings.update_error'));
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
        <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 8 }}>{t('create_group.avatar_title')}</Text>
      </View>

      {/* Name */}
      <FieldLabel text={t('chat.group_name')} THEME={THEME} />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('chat.group_name_placeholder')}
        placeholderTextColor={THEME.textMuted}
        style={inputSt(THEME)}
        maxLength={60}
      />

      {/* Description */}
      <FieldLabel text={t('chat.description')} THEME={THEME} />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('chat.description_placeholder')}
        placeholderTextColor={THEME.textMuted}
        multiline
        numberOfLines={3}
        style={[inputSt(THEME), { minHeight: 76, textAlignVertical: 'top', paddingTop: 10 }]}
        maxLength={200}
      />

      {/* Group type */}
      <FieldLabel text={t('chat.group_type')} THEME={THEME} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {GROUP_TYPES.map(type => {
          const active = groupType === type.value;
          return (
            <TouchableOpacity
              key={type.value}
              onPress={() => setGroupType(type.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: active ? type.color + '28' : THEME.bgHover,
                borderWidth: 1.5,
                borderColor: active ? type.color : 'transparent',
              }}
            >
              <Text style={{ color: active ? type.color : THEME.textMuted, fontSize: 13, fontWeight: active ? '700' : '500' }}>
                {type.label}
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
          : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('common.save')}</Text>
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
