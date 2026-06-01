/**
 * IncomingGroupCallScreen – full-screen Modal khi có group call đến
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar, Image, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';
import { THEME, getAvatarColor, getInitials } from '../../../theme';

let InCallManager = null;
try { InCallManager = require('react-native-incall-manager').default; } catch {}

function Avatar({ name, avatar, size = 110 }) {
  if (avatar) {
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

export default function IncomingGroupCallScreen() {
  const { callState, callType, incomingData, acceptGroupCall, declineGroupCall } = useGroupCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef   = useRef(null);

  const isVisible = callState === GROUP_CALL_STATE.INCOMING;

  useEffect(() => {
    if (!isVisible) { loopRef.current?.stop(); return; }
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    try { InCallManager?.startRingtone?.('_DEFAULT_'); } catch {}
    return () => { try { InCallManager?.stopRingtone?.(); } catch {} };
  }, [isVisible]);

  const initiator = incomingData?.initiator || {};
  const name    = initiator.displayName || 'Ai đó';
  const isVideo = callType === 'video';

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={declineGroupCall}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0d0f1a" />
      <View style={styles.container}>
        {[1.6, 2.1, 2.6].map((scale, i) => (
          <Animated.View key={i} style={[styles.ring, { transform: [{ scale: Animated.multiply(pulseAnim, new Animated.Value(scale * 0.55)) }] }]} />
        ))}

        <View style={styles.groupBadge}>
          <Feather name="users" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Gọi nhóm</Text>
        </View>

        <View style={styles.avatarWrap}>
          <Avatar name={name} avatar={initiator.avatar} />
        </View>

        <Text style={styles.name}>{name}</Text>

        <View style={styles.labelRow}>
          <Feather name={isVideo ? 'video' : 'phone'} size={16} color={THEME.textMuted} />
          <Text style={styles.label}>{isVideo ? 'Gọi video nhóm đến' : 'Gọi thoại nhóm đến'}</Text>
        </View>

        <View style={styles.btnRow}>
          <View style={styles.btnWrap}>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={declineGroupCall} activeOpacity={0.8}>
              <Feather name="phone-off" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Từ chối</Text>
          </View>
          <View style={styles.btnWrap}>
            <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={acceptGroupCall} activeOpacity={0.8}>
              <Feather name={isVideo ? 'video' : 'phone'} size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Tham gia</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0f1a', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: 'rgba(88,101,242,0.25)' },
  groupBadge: { position: 'absolute', top: 64, backgroundColor: THEME.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarWrap: { marginBottom: 28, elevation: 8 },
  name:     { color: '#f2f3f5', fontSize: 28, fontWeight: '700', marginBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 64 },
  label:    { color: THEME.textMuted, fontSize: 15 },
  btnRow:   { flexDirection: 'row', gap: 64, alignItems: 'center' },
  btnWrap:  { alignItems: 'center', gap: 12 },
  actionBtn:{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  rejectBtn:{ backgroundColor: '#ed4245' },
  acceptBtn:{ backgroundColor: '#3ba55c' },
  btnLabel: { color: THEME.textMuted, fontSize: 13, fontWeight: '500' },
});