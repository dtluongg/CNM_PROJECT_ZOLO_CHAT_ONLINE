import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Định dạng số giây thành mm:ss
const fmtDur = (secs) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Thanh hiển thị khi đang ghi âm.
 * Cho phép huỷ hoặc gửi đoạn ghi âm.
 *
 * @param {number}   recordingSec  - Số giây đã ghi
 * @param {function} onCancel      - Callback huỷ ghi âm
 * @param {function} onStop        - Callback dừng và gửi ghi âm
 */
const RecordingBar = ({ recordingSec, onCancel, onStop, THEME, styles }) => (
  <View style={styles.recordingBar}>
    {/* Chấm đỏ nhấp nháy báo hiệu đang ghi */}
    <View style={styles.recordingDot} />

    {/* Đồng hồ đếm thời gian ghi */}
    <Text style={styles.recordingTimer}>{fmtDur(recordingSec)}</Text>

    <Text style={{ flex: 1, fontSize: 13, color: THEME.textMuted }}>Đang ghi âm...</Text>

    {/* Nút huỷ */}
    <TouchableOpacity onPress={onCancel} style={styles.inputBtn}>
      <Feather name="x" size={22} color={THEME.textMuted} />
    </TouchableOpacity>

    {/* Nút gửi */}
    <TouchableOpacity
      onPress={onStop}
      style={[styles.sendBtn, { backgroundColor: '#ed4245' }]}
    >
      <Feather name="send" size={18} color="#fff" />
    </TouchableOpacity>
  </View>
);

export default RecordingBar;