import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import messageApi from '../api/messageApi';

/**
 * AiSummaryCard — dòng "── ✨ Tóm tắt bằng AI ──" cuối khối unread.
 *
 * Props:
 *   conversationId    — ID conversation
 *   snapshotLastReadId — lastReadMessageId tại thời điểm mở màn (trước markAsRead)
 *   initialSummary    — { summary, ... } từ DB nếu đã tóm tắt trước
 *   THEME             — theme object của app
 */
export default function AiSummaryCard({
  conversationId,
  snapshotLastReadId,
  initialSummary,
  THEME,
}) {
  const startState   = initialSummary?.summary ? 'done' : 'idle';
  const startSummary = initialSummary?.summary || '';

  const [status, setStatus]   = useState(startState);
  const [summary, setSummary] = useState(startSummary);
  const [errMsg, setErrMsg]   = useState('');

  const handleSummarize = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setSummary('');
    setErrMsg('');
    try {
      const res  = await messageApi.getAiSummary(conversationId, snapshotLastReadId || null);
      const data = res.data;
      if (data.reason === 'no_unread') {
        setSummary('Không có tin nhắn nào cần tóm tắt.');
      } else {
        setSummary(data.summary || '');
      }
      setStatus('done');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể tóm tắt, vui lòng thử lại.';
      setErrMsg(msg);
      setStatus('error');
    }
  };

  const accentColor  = '#a78bfa';
  const borderColor  = 'rgba(167,139,250,0.3)';
  const bg           = THEME?.bgSecondary || '#1e2030';

  // ── Divider line với label ────────────────────────────────────────────
  const DividerLine = ({ label, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 6,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
      <Text style={{
        marginHorizontal: 8,
        fontSize: 11,
        fontWeight: '700',
        color: accentColor,
        letterSpacing: 0.4,
      }}>
        ✨ {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
    </TouchableOpacity>
  );

  // ── idle ────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return <DividerLine label="Tóm tắt bằng AI" onPress={handleSummarize} />;
  }

  // ── loading ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <>
        <DividerLine label="AI Tóm tắt" />
        <View style={{
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(167,139,250,0.07)',
          borderWidth: 1,
          borderColor,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={{ fontSize: 13, color: THEME?.textMuted || '#aaa', fontStyle: 'italic' }}>
            AI đang phân tích tin nhắn...
          </Text>
        </View>
      </>
    );
  }

  // ── error ──────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <>
        <DividerLine label="AI Tóm tắt" />
        <View style={{
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(237,66,69,0.07)',
          borderWidth: 1,
          borderColor: 'rgba(237,66,69,0.3)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{ fontSize: 12, color: '#ed4245', flex: 1 }}>{errMsg}</Text>
          <TouchableOpacity
            onPress={handleSummarize}
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginLeft: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: accentColor }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ── done ────────────────────────────────────────────────────────────
  return (
    <>
      <DividerLine label="AI Tóm tắt" />
      <View style={{
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(108,99,255,0.07)',
        borderWidth: 1,
        borderColor,
      }}>
        <Text style={{
          fontSize: 13,
          color: THEME?.textMuted || '#aaa',
          fontStyle: 'italic',
          lineHeight: 20,
        }}>
          {summary}
        </Text>
        <View style={{
          marginTop: 8,
          alignItems: 'flex-end',
        }}>
          <TouchableOpacity
            onPress={handleSummarize}
            style={{
              borderWidth: 1,
              borderColor,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: accentColor }}>Làm mới</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
