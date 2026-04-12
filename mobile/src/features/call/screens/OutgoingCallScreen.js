/**
 * OutgoingCallScreen – màn hình chờ callee trả lời (mobile)
 * Hiển thị: tên, avatar, bộ đếm giây, thông báo sau 5s
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCall, CALL_STATE } from '../CallContext';
import { THEME, getAvatarColor, getInitials } from '../../../theme';

function Avatar({ name, avatar, size = 100 }) {
  if (avatar) {
    const Image = require('react-native').Image;
    return (
      <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>{getInitials(name)}</Text>
    </View>
  );
}

export default function OutgoingCallScreen() {
  const { callState, callType, remoteUser, endCall } = useCall();
  const dotAnim = [
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
  ];
  const [ringSeconds, setRingSeconds] = useState(0);
  const timerRef = useRef(null);

  const isVisible = callState === CALL_STATE.CALLING;

  // Bộ đếm giây
  useEffect(() => {
    if (!isVisible) { setRingSeconds(0); return; }
    setRingSeconds(0);
    timerRef.current = setInterval(() => setRingSeconds((p) => p + 1), 1000);
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [isVisible]);

  // Hoạt ảnh dấu chấm
  useEffect(() => {
    if (!isVisible) return;
    const loops = dotAnim.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 220),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(anim, { toValue: 0.4, duration: 400, useNativeDriver: true, easing: Easing.ease }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [isVisible]);

  if (!isVisible) return null;

  const name     = remoteUser?.displayName || 'Người dùng';
  const isVideo  = callType === 'video';
  const waited5s = ringSeconds >= 5;
  const mm = String(Math.floor(ringSeconds / 60)).padStart(2, '0');
  const ss = String(ringSeconds % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Avatar name={name} avatar={remoteUser?.avatar} size={110} />

      <Text style={styles.name}>{name}</Text>

      <View style={styles.statusRow}>
        <Feather name={isVideo ? 'video' : 'phone'} size={14} color={THEME.textMuted} />
        <Text style={styles.statusText}>Đang đổ chuông</Text>
        <View style={styles.dotsWrap}>
          {dotAnim.map((anim, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
          ))}
        </View>
        <Text style={styles.timerText}>{mm}:{ss}</Text>
      </View>

      {/* Thông báo sau 5 giây */}
      <View style={styles.waitRow}>
        {waited5s && (
          <Text style={styles.waitText}>Vẫn đang chờ phản hồi...</Text>
        )}
      </View>

      <View style={styles.endWrap}>
        <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.8}>
          <Feather name="phone-off" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.endLabel}>Huỷ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0d0f1a',
    alignItems: 'center', justifyContent: 'center', gap: 12,
    zIndex: 9998,
  },
  name: { color: '#f2f3f5', fontSize: 26, fontWeight: '700', marginTop: 20 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  statusText:  { color: THEME.textMuted, fontSize: 15 },
  dotsWrap:    { flexDirection: 'row', gap: 4, marginLeft: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: THEME.textMuted },
  timerText: {
    color: '#b5bac1', fontSize: 14, fontVariant: ['tabular-nums'], marginLeft: 4,
  },
  waitRow:  { height: 22, justifyContent: 'center', marginBottom: 36 },
  waitText: { color: '#faa61a', fontSize: 13 },
  endWrap:  { alignItems: 'center', gap: 10 },
  endBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ed4245',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  endLabel: { color: THEME.textMuted, fontSize: 13 },
});
