/**
 * ActiveCallScreen – màn hình cuộc gọi đang hoạt động (audio / video)
 *
 * - Video: RTCView remote toàn màn hình + RTCView local PiP
 * - Audio: avatar + tên + timer
 * - Controls: mute, camera (video only), cúp máy
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCall, CALL_STATE } from '../CallContext';
import { RTCView, RN_RTC_AVAILABLE } from '../hooks/useCallWebRTC';
import { THEME, getAvatarColor, getInitials } from '../../../theme';

function AvatarLarge({ name, avatar }) {
  const size = 110;
  if (avatar) {
    const Image = require('react-native').Image;
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 40, fontWeight: '700' }}>{getInitials(name)}</Text>
    </View>
  );
}

function CtrlBtn({ icon, label, onPress, active, activeColor = '#ed4245' }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.ctrlBtn, active && { backgroundColor: activeColor }]}
      activeOpacity={0.75}
    >
      <Feather name={icon} size={24} color="#fff" />
      {label ? <Text style={styles.ctrlLabel}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

export default function ActiveCallScreen() {
  const {
    callState, callType, remoteUser,
    localStream, remoteStream,
    isMuted, isCameraOff,
    callDuration, formatDuration,
    endCall, toggleMute, toggleCamera,
  } = useCall();

  const [minimized, setMinimized] = useState(false);
  const isVideo = callType === 'video';

  if (callState !== CALL_STATE.ACTIVE) return null;

  const name = remoteUser?.displayName || 'Người dùng';

  /* ── Mini pip ── */
  if (minimized) {
    return (
      <TouchableOpacity onPress={() => setMinimized(false)} style={styles.miniContainer} activeOpacity={0.9}>
        <View style={[styles.miniIcon, { backgroundColor: '#3ba55c' }]}>
          <Feather name={isVideo ? 'video' : 'phone'} size={16} color="#fff" />
        </View>
        <View>
          <Text style={styles.miniName}>{name}</Text>
          <Text style={styles.miniTimer}>{formatDuration(callDuration)}</Text>
        </View>
        <TouchableOpacity onPress={endCall} style={styles.miniEnd}>
          <Feather name="phone-off" size={16} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Video streams ── */}
      {isVideo && RN_RTC_AVAILABLE && remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL ? remoteStream.toURL() : ''}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={false}
          zOrder={0}
        />
      )}
      {isVideo && RN_RTC_AVAILABLE && localStream && !isCameraOff && (
        <RTCView
          streamURL={localStream.toURL ? localStream.toURL() : ''}
          style={styles.localVideo}
          objectFit="cover"
          mirror={true}
          zOrder={1}
        />
      )}

      {/* ── Audio call: avatar ── */}
      {!isVideo && (
        <View style={styles.audioCenter}>
          <AvatarLarge name={name} avatar={remoteUser?.avatar} />
          <Text style={styles.audioName}>{name}</Text>
          <Text style={styles.timerText}>{formatDuration(callDuration)}</Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          {isVideo && <Text style={styles.headerName}>{name}</Text>}
          {isVideo && <Text style={styles.headerTimer}>{formatDuration(callDuration)}</Text>}
        </View>
        <TouchableOpacity onPress={() => setMinimized(true)} style={styles.minimizeBtn}>
          <Feather name="minimize-2" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        <CtrlBtn icon={isMuted ? 'mic-off' : 'mic'} label={isMuted ? 'Bật mic' : 'Tắt mic'} onPress={toggleMute} active={isMuted} />
        {isVideo && (
          <CtrlBtn icon={isCameraOff ? 'video-off' : 'video'} label={isCameraOff ? 'Bật cam' : 'Tắt cam'} onPress={toggleCamera} active={isCameraOff} />
        )}

        {/* Kết thúc */}
        <TouchableOpacity onPress={endCall} style={styles.endBtn} activeOpacity={0.8}>
          <Feather name="phone-off" size={28} color="#fff" />
          <Text style={styles.ctrlLabel}>Cúp máy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0d0f1a', zIndex: 9997,
  },
  audioCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  audioName: {
    color: '#f2f3f5', fontSize: 24, fontWeight: '700', marginTop: 12,
  },
  timerText: {
    color: '#3ba55c', fontSize: 18, fontWeight: '600',
  },
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16,
    left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerName:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTimer: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  minimizeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 8,
  },
  localVideo: {
    position: 'absolute', bottom: 110, right: 16,
    width: 110, height: 90, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 2,
  },
  controls: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 24,
  },
  ctrlBtn: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlLabel: { color: '#fff', fontSize: 10, marginTop: 2, textAlign: 'center' },
  endBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#ed4245',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  // Mini PiP
  miniContainer: {
    position: 'absolute', bottom: 24, right: 16,
    backgroundColor: '#1e1f22',
    borderRadius: 16, borderWidth: 1, borderColor: THEME.accent,
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 10, zIndex: 9997, minWidth: 190,
    elevation: 10,
  },
  miniIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  miniName:  { color: '#f2f3f5', fontSize: 13, fontWeight: '600' },
  miniTimer: { color: '#3ba55c', fontSize: 12 },
  miniEnd: {
    marginLeft: 4, backgroundColor: '#ed4245',
    borderRadius: 16, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});
