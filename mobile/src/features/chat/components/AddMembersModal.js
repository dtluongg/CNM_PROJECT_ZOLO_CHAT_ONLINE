import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, ActivityIndicator, Image, Alert, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import friendApi from '../../friends/api/friendApi';
import conversationApi from '../api/conversationApi';
import { getAvatarColor, getInitials } from '../../../theme';
import { useLanguage } from '../../../context/LanguageContext';

export default function AddMembersModal({ visible, onClose, conversation, currentMembers, THEME, onMembersAdded }) {
  const { t } = useLanguage();
  const [friends,  setFriends]  = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const currentIds = new Set(
    (currentMembers || []).map(m => m.user?._id || m.userId?._id || m.userId || m._id)
  );

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set());
    setSearch('');
    setLoading(true);
    friendApi.getFriendList()
      .then(res => {
        const list = res.data?.data || res.data?.friends || res.data || [];
        setFriends(list.filter(f => !currentIds.has(f._id || f.userId)));
      })
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const toggle = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const filtered = friends.filter(f => {
    const name = f.displayName || f.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleAdd = async () => {
    if (selected.size === 0) return Alert.alert(t('common.info'), t('poll.option_placeholder', { index: 1 }).replace(' 1', '').replace('1', '')); // Fallback for "Please select at least one"
    // Wait, I added "select_friends" key. I'll use it.
    if (selected.size === 0) return Alert.alert(t('common.info'), t('info_panel.members.select_friends'));
    
    setSaving(true);
    try {
      const convId = conversation._id || conversation.id;
      await conversationApi.addConversationMembers(convId, [...selected]);
      onMembersAdded?.([...selected]);
      onClose();
    } catch (e) {
      Alert.alert(t('common.error'), e.response?.data?.message || t('common.something_wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: THEME.bgTertiary }}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: THEME.border, backgroundColor: THEME.bgSecondary }}>
          <TouchableOpacity onPress={onClose} style={{ marginRight: 12, padding: 2 }}>
            <Feather name="x" size={22} color={THEME.textMuted} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: THEME.textPrimary }}>
            {t('info_panel.members.add_member_title')}
          </Text>
          {selected.size > 0 && (
            <TouchableOpacity
              onPress={handleAdd}
              disabled={saving}
              style={{ backgroundColor: THEME.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, opacity: saving ? 0.7 : 1 }}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('common.save')} ({selected.size})</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: THEME.border }}>
          <Feather name="search" size={15} color={THEME.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('info_panel.members.search_friends_placeholder')}
            placeholderTextColor={THEME.textMuted}
            style={{ flex: 1, color: THEME.textPrimary, fontSize: 14, paddingVertical: 11 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x-circle" size={15} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected count */}
        {selected.size > 0 && (
          <Text style={{ color: THEME.accent, fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 4 }}>
            {t('info_panel.members.selected_count', { count: selected.size })}
          </Text>
        )}

        {/* List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={THEME.accent} size="large" />
            <Text style={{ color: THEME.textMuted, fontSize: 13, marginTop: 12 }}>{t('common.loading')}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>👥</Text>
            <Text style={{ color: THEME.textPrimary, fontSize: 15, fontWeight: '700' }}>
              {search ? t('info_panel.members.no_results_search') : t('info_panel.members.no_friends_in_group')}
            </Text>
            <Text style={{ color: THEME.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
              {search ? t('info_panel.members.no_results_search') : t('info_panel.members.no_friends_in_group')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id || item.userId || String(item.id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => {
              const id   = item._id || item.userId || item.id;
              const name = item.displayName || item.username || t('user.unknown');
              const sel  = selected.has(id);
              return (
                <TouchableOpacity
                  onPress={() => toggle(id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 12, marginBottom: 6, borderRadius: 10,
                    backgroundColor: sel ? THEME.accent + '18' : THEME.bgPrimary,
                    borderWidth: 1.5, borderColor: sel ? THEME.accent : 'transparent',
                  }}
                >
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={{ width: 42, height: 42, borderRadius: 21, marginRight: 12 }} />
                  ) : (
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: getAvatarColor(name), justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{getInitials(name)}</Text>
                    </View>
                  )}
                  <Text style={{ flex: 1, color: THEME.textPrimary, fontSize: 14, fontWeight: '600' }}>{name}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: sel ? THEME.accent : 'transparent', borderWidth: 2, borderColor: sel ? THEME.accent : THEME.bgHover, justifyContent: 'center', alignItems: 'center' }}>
                    {sel && <Feather name="check" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
