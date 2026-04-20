import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import conversationApi from '../api/conversationApi';
import { getAvatarColor, getInitials } from '../../../theme';

export default function JoinRequestsTab({ conversation, THEME }) {
  const convId = conversation?._id || conversation?.id;
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conversationApi.listJoinRequests(convId);
      setRequests(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, [convId]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (reqId, action) => {
    setBusy(`${action}-${reqId}`);
    try {
      await conversationApi.reviewJoinRequest(convId, reqId, action);
      setRequests(prev => prev.filter(r => r._id !== reqId));
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể thực hiện');
    } finally { setBusy(''); }
  };

  if (loading) return <ActivityIndicator color={THEME.accent} style={{ marginVertical: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: THEME.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {requests.length} yêu cầu chờ duyệt
        </Text>
        <TouchableOpacity onPress={load} style={{ padding: 4 }}>
          <Feather name="refresh-cw" size={14} color={THEME.accent} />
        </TouchableOpacity>
      </View>

      {requests.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 32, marginBottom: 10 }}>✅</Text>
          <Text style={{ color: THEME.textMuted, fontSize: 13 }}>Không có yêu cầu nào đang chờ duyệt</Text>
        </View>
      )}

      {requests.map(req => {
        const name   = req.userId?.displayName || req.userId?.username || '?';
        const avatar = req.userId?.avatar;
        const date   = req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : '';

        return (
          <View key={req._id} style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            padding: 12, backgroundColor: THEME.bgPrimary, borderRadius: 10, marginBottom: 8,
          }}>
            {/* Avatar */}
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 42, height: 42, borderRadius: 21, flexShrink: 0 }} />
            ) : (
              <View style={{ width: 42, height: 42, borderRadius: 21, flexShrink: 0, backgroundColor: getAvatarColor(name), justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{getInitials(name)}</Text>
              </View>
            )}

            {/* Info */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.textPrimary }}>{name}</Text>
              {req.message ? (
                <Text numberOfLines={2} style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2, fontStyle: 'italic' }}>"{req.message}"</Text>
              ) : null}
              <Text style={{ fontSize: 10, color: THEME.textMuted, marginTop: 1 }}>{date}</Text>
            </View>

            {/* Actions */}
            <View style={{ gap: 5, flexShrink: 0 }}>
              <TouchableOpacity
                onPress={() => handleReview(req._id, 'approve')}
                disabled={!!busy}
                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(87,242,135,0.15)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(87,242,135,0.35)', alignItems: 'center', minWidth: 76 }}
              >
                {busy === `approve-${req._id}` ? (
                  <ActivityIndicator size="small" color="#57f287" />
                ) : (
                  <Text style={{ color: '#57f287', fontSize: 12, fontWeight: '700' }}>✓ Duyệt</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReview(req._id, 'reject')}
                disabled={!!busy}
                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(237,66,69,0.12)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(237,66,69,0.3)', alignItems: 'center', minWidth: 76 }}
              >
                {busy === `reject-${req._id}` ? (
                  <ActivityIndicator size="small" color="#ed4245" />
                ) : (
                  <Text style={{ color: '#ed4245', fontSize: 12, fontWeight: '600' }}>✕ Từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
