import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import conversationApi from '../api/conversationApi';
import { getAvatarColor, getInitials } from '../../../theme';
import { useLanguage } from '../../../context/LanguageContext';

export default function JoinRequestsTab({ conversation, THEME }) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const convId = conversation._id || conversation.id;
      const res = await conversationApi.listJoinRequests(convId);
      setRequests(res.data?.data || res.data || []);
    } catch (e) {
      console.log('Error fetching join requests:', e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [conversation]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (reqId, action) => {
    setBusy(`${action}-${reqId}`);
    try {
      const convId = conversation._id || conversation.id;
      await conversationApi.reviewJoinRequest(convId, reqId, action);
      setRequests(prev => prev.filter(r => r._id !== reqId));
    } catch (e) {
      Alert.alert(t('common.error'), e.response?.data?.message || t('common.something_wrong'));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
        <ActivityIndicator color={THEME.accent} />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Feather name="user-check" size={48} color={THEME.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
        <Text style={{ color: THEME.textPrimary, fontSize: 16, fontWeight: '700' }}>
          {t('info_panel.members.no_requests_found')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={item => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const u = item.userId || {};
        const name = u.displayName || u.username || t('user.unknown');
        const isApproveBusy = busy === `approve-${item._id}`;
        const isRejectBusy = busy === `reject-${item._id}`;
        const anyBusy = busy !== '';

        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bgPrimary, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: THEME.border }}>
            {u.avatar ? (
              <Image source={{ uri: u.avatar }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getAvatarColor(name), justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{getInitials(name)}</Text>
              </View>
            )}
            
            <View style={{ flex: 1 }}>
              <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 15 }}>{name}</Text>
              {item.message ? (
                <Text numberOfLines={2} style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2, fontStyle: 'italic' }}>"{item.message}"</Text>
              ) : (
                <Text style={{ color: THEME.textMuted, fontSize: 12, marginTop: 2 }}>{t('info_panel.members.requests_waiting')}</Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                disabled={anyBusy}
                onPress={() => handleReview(item._id, 'reject')}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: THEME.bgTertiary, minWidth: 70, alignItems: 'center' }}
              >
                {isRejectBusy ? (
                  <ActivityIndicator size="small" color={THEME.textPrimary} />
                ) : (
                  <Text style={{ color: THEME.textPrimary, fontWeight: '600', fontSize: 13 }}>{t('info_panel.members.reject')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                disabled={anyBusy}
                onPress={() => handleReview(item._id, 'approve')}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: THEME.accent, minWidth: 70, alignItems: 'center' }}
              >
                {isApproveBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('info_panel.members.approve')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}
