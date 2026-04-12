/**
 * CallHistoryTab – hiển thị lịch sử cuộc gọi với một người dùng (mobile)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import callApi from '../api/callApi';
import { useAuth } from '../../../context/AuthContext';
import { useCall } from '../CallContext';
import { THEME } from '../../../theme';

const STATUS_CONFIG = {
  ended:    { label: 'Đã kết thúc',    color: THEME.textMuted },
  missed:   { label: 'Nhỡ',            color: THEME.danger },
  rejected: { label: 'Từ chối',        color: THEME.danger },
  ongoing:  { label: 'Đang gọi',       color: THEME.statusOnline },
  calling:  { label: 'Đang đổ chuông', color: THEME.statusIdle },
  busy:     { label: 'Máy bận',        color: THEME.statusIdle },
};

const formatDur = (secs) => {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 1) return 'Hôm qua';
  if (diff < 7)  return `${diff} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

function StatusIcon({ type, status, isOutgoing }) {
  const color = STATUS_CONFIG[status]?.color || THEME.textMuted;
  if (status === 'missed' || status === 'rejected') return <Feather name="phone-missed" size={16} color={color} />;
  if (!isOutgoing) return <Feather name="phone-incoming" size={16} color={color} />;
  return <Feather name={type === 'video' ? 'video' : 'phone'} size={16} color={color} />;
}

export default function CallHistoryTab({ otherUserId, otherUserName, otherUserAvatar }) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const [calls,   setCalls]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const currentUserId = user?._id?.toString();

  const fetchCalls = useCallback(async (p = 1) => {
    if (!otherUserId) return;
    setLoading(true);
    try {
      const res = await callApi.getHistory({ page: p, limit: 20 });
      const all = res.data?.calls || [];
      const filtered = all.filter((c) => {
        const cId = c.caller._id.toString();
        const eId = c.callee._id.toString();
        return (
          (cId === currentUserId && eId === otherUserId) ||
          (eId === currentUserId && cId === otherUserId)
        );
      });
      setCalls((prev) => p === 1 ? filtered : [...prev, ...filtered]);
      setHasMore(res.data?.pagination?.page < res.data?.pagination?.totalPages);
      setPage(p);
    } catch (err) {
      console.error('fetchCalls error:', err);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, currentUserId]);

  useEffect(() => { fetchCalls(1); }, [fetchCalls]);

  const callBack = (type) =>
    initiateCall({ _id: otherUserId, displayName: otherUserName, avatar: otherUserAvatar || null }, type);

  if (loading && calls.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.accent} />
        <Text style={styles.muted}>Đang tải...</Text>
      </View>
    );
  }

  if (calls.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="phone-off" size={32} color={THEME.textMuted} />
        <Text style={[styles.muted, { marginTop: 8, textAlign: 'center' }]}>
          Chưa có cuộc gọi nào
        </Text>
        <View style={styles.quickBtns}>
          <TouchableOpacity style={[styles.qBtn, { backgroundColor: '#3ba55c' }]} onPress={() => callBack('audio')}>
            <Feather name="phone" size={15} color="#fff" />
            <Text style={styles.qBtnText}>Gọi thoại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qBtn, { backgroundColor: THEME.accent }]} onPress={() => callBack('video')}>
            <Feather name="video" size={15} color="#fff" />
            <Text style={styles.qBtnText}>Gọi video</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Quick call buttons */}
      <View style={styles.quickBtns}>
        <TouchableOpacity style={[styles.qBtn, styles.qBtnOutline, { borderColor: '#3ba55c' }]} onPress={() => callBack('audio')}>
          <Feather name="phone" size={14} color="#3ba55c" />
          <Text style={[styles.qBtnText, { color: '#3ba55c' }]}>Gọi thoại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.qBtn, styles.qBtnOutline, { borderColor: THEME.accent }]} onPress={() => callBack('video')}>
          <Feather name="video" size={14} color={THEME.accent} />
          <Text style={[styles.qBtnText, { color: THEME.accent }]}>Gọi video</Text>
        </TouchableOpacity>
      </View>

      {calls.map((c) => {
        const cfg   = STATUS_CONFIG[c.status] || STATUS_CONFIG.ended;
        const isOut = c.isOutgoing;
        return (
          <TouchableOpacity
            key={c._id}
            style={styles.item}
            onPress={() => callBack(c.type)}
            activeOpacity={0.7}
          >
            <StatusIcon type={c.type} status={c.status} isOutgoing={isOut} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.itemRow}>
                <Text style={styles.itemTitle}>{isOut ? 'Gọi đi' : 'Gọi đến'}</Text>
                <Text style={[styles.itemSub, { color: THEME.textMuted, marginLeft: 4 }]}>
                  · {c.type === 'video' ? 'video' : 'thoại'}
                </Text>
              </View>
              <Text style={[styles.itemSub, { color: cfg.color }]}>
                {cfg.label}{c.duration ? ` · ${formatDur(c.duration)}` : ''}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatTime(c.createdAt)}</Text>
            <Feather name="phone-call" size={14} color={THEME.textMuted} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        );
      })}

      {hasMore && (
        <TouchableOpacity style={styles.loadMore} onPress={() => fetchCalls(page + 1)} disabled={loading}>
          <Text style={styles.muted}>{loading ? 'Đang tải...' : 'Tải thêm'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  muted:  { color: THEME.textMuted, fontSize: 13 },
  quickBtns: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  qBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 10,
  },
  qBtnOutline: { borderWidth: 1, backgroundColor: 'transparent' },
  qBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: THEME.bgHover,
  },
  itemRow:  { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { color: THEME.textPrimary, fontSize: 14, fontWeight: '600' },
  itemSub:  { fontSize: 12 },
  timeText: { color: THEME.textMuted, fontSize: 11 },
  loadMore: { alignItems: 'center', paddingVertical: 12 },
});
