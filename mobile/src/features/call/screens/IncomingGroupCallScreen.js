/**
 * IncomingGroupCallScreen – overlay khi có group call đến
 * Tương tự IncomingCallScreen nhưng dùng GroupCallContext
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';
import { THEME, getAvatarColor, getInitials } from '../../../theme';

// Ringtone via InCallManager (native only)
let InCallManager = null;
try { InCallManager = require('react-native-incall-manager').default; } catch {}

function Avatar({ name, avatar, size = 100 }) {
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
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

export default function IncomingGroupCallScreen() {
  const { callState, callType, incomingData, acceptGroupCall, declineGroupCall } = useGroupCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isVisible = callState === GROUP_CALL_STATE.INCOMING && incomingData;

  // Pulse animation
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

  // Ringtone
  useEffect(() => {
    if (!isVisible) return;
    try { InCallManager?.startRingtone?.('_DEFAULT_'); } catch {}
    return () => {
      try { InCallManager?.stopRingtone?.(); } catch {}
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const initiator  = incomingData?.initiator || {};
  const group      = incomingData?.group || {};
  const groupName  = group.name || 'Nhóm';
  const isVideo    = callType === 'video';
  const label      = isVideo ? 'Gọi video nhóm' : 'Gọi thoại nhóm';

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

      {/* Group badge */}
      <View style={styles.groupBadge}>
        <Feather name="users" size={14} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{groupName}</Text>
      </View>

      {/* Group avatar (lớn) + initiator avatar (nhỏ góc dưới) */}
      <View style={styles.avatarWrap}>
        <Avatar name={groupName} avatar={group.avatar} size={100} />
        <View style={styles.initiatorBadge}>
          <Avatar name={initiator.displayName || '?'} avatar={initiator.avatar} size={34} />
        </View>
      </View>

      <Text style={styles.name}>{groupName}</Text>
      <Text style={styles.subName}>{initiator.displayName || 'Ai đó'} đang gọi</Text>

      <View style={styles.labelRow}>
        <Feather name={isVideo ? 'video' : 'phone'} size={15} color={THEME.textMuted} />
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.btnRow}>
        {/* Từ chối */}
        <View style={styles.btnWrap}>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={declineGroupCall} activeOpacity={0.8}>
            <Feather name="phone-off" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Từ chối</Text>
        </View>

        {/* Tham gia */}
        <View style={styles.btnWrap}>
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={acceptGroupCall} activeOpacity={0.8}>
            <Feather name={isVideo ? 'video' : 'phone'} size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Tham gia</Text>
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
  groupBadge: {
    position: 'absolute',
    top: 60,
    backgroundColor: THEME.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap:      { marginBottom: 24, elevation: 8, position: 'relative' },
  initiatorBadge:  {
    position: 'absolute', bottom: -4, right: -4,
    borderRadius: 20, borderWidth: 2, borderColor: '#0d0f1a',
  },
  name:    { color: '#f2f3f5', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subName: { color: THEME.textMuted, fontSize: 14, marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 56 },
  label: { color: THEME.textMuted, fontSize: 15 },
  btnRow: { flexDirection: 'row', gap: 60, alignItems: 'center' },
  btnWrap: { alignItems: 'center', gap: 10 },
  actionBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  rejectBtn: { backgroundColor: '#ed4245' },
  acceptBtn: { backgroundColor: '#3ba55c' },
  btnLabel:  { color: THEME.textMuted, fontSize: 13 },
});