/**
 * IncomingCallScreen – màn hình hiện ra khi có cuộc gọi đến (overlay toàn màn hình)
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCall, CALL_STATE } from '../CallContext';
import { THEME, getAvatarColor, getInitials } from '../../../theme';

function Avatar({ name, avatar, size = 90 }) {
  if (avatar) {
    const Image = require('react-native').Image;
    return (
      <Image
        source={{ uri: avatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: getAvatarColor(name),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

export default function IncomingCallScreen() {
  const { callState, callType, incomingData, answerCall, rejectCall } = useCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isVisible = callState === CALL_STATE.INCOMING && incomingData;

  useEffect(() => {
    if (!isVisible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isVisible, pulseAnim]);

  if (!isVisible) return null;

  const caller = incomingData?.callerInfo || {};
  const name   = caller.displayName || 'Người dùng';
  const isVideo = callType === 'video';
  const label  = isVideo ? 'Gọi video đến' : 'Gọi thoại đến';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Pulse rings */}
      {[1.5, 1.9, 2.3].map((scale, i) => (
        <Animated.View key={i} style={[
          styles.ring,
          { transform: [{ scale: Animated.multiply(pulseAnim, new Animated.Value(scale * 0.6)) }] },
        ]} />
      ))}

      <View style={styles.avatarWrap}>
        <Avatar name={name} avatar={caller.avatar} size={100} />
      </View>

      <Text style={styles.name}>{name}</Text>
      <View style={styles.labelRow}>
        <Feather name={isVideo ? 'video' : 'phone'} size={15} color={THEME.textMuted} />
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.btnRow}>
        {/* Từ chối */}
        <View style={styles.btnWrap}>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={rejectCall} activeOpacity={0.8}>
            <Feather name="phone-off" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Từ chối</Text>
        </View>

        {/* Chấp nhận */}
        <View style={styles.btnWrap}>
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={answerCall} activeOpacity={0.8}>
            <Feather name={isVideo ? 'video' : 'phone'} size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Chấp nhận</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0d0f1a',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  ring: {
    position: 'absolute',
    width: 100, height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(88,101,242,0.3)',
  },
  avatarWrap: {
    marginBottom: 24,
    elevation: 8,
  },
  name: {
    color: '#f2f3f5', fontSize: 26, fontWeight: '700', marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 56,
  },
  label: {
    color: THEME.textMuted, fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row', gap: 60, alignItems: 'center',
  },
  btnWrap: {
    alignItems: 'center', gap: 10,
  },
  actionBtn: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  rejectBtn: { backgroundColor: '#ed4245' },
  acceptBtn: { backgroundColor: '#3ba55c' },
  btnLabel: { color: THEME.textMuted, fontSize: 13 },
});
