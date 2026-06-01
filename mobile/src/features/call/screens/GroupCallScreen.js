/**
 * GroupCallScreen – Modal toàn màn hình khi cuộc gọi nhóm active (React Native)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Image, Dimensions, Platform,
  PermissionsAndroid, Modal, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';
import { THEME, getAvatarColor, getInitials } from '../../../theme';

let RTCView = null;
try { RTCView = require('react-native-webrtc').RTCView; } catch {}

// ── Participant tile ──────────────────────────────────────────────────────────
function ParticipantTile({ participant, tileSize, localVideoURL, getRemoteVideoURL, isSpeaking }) {
  const [imgErr, setImgErr] = useState(false);
  const videoURL  = participant.isLocal ? localVideoURL : getRemoteVideoURL(participant.identity);
  const showVideo = !!videoURL && participant.hasCamera && RTCView;
  const name      = participant.displayName || participant.name || 'Người dùng';

  return (
    <View style={{
      width: tileSize, height: tileSize * 0.68,
      borderRadius: 14, overflow: 'hidden',
      borderWidth: 2.5,
      borderColor: isSpeaking ? '#57f287' : 'rgba(255,255,255,0.07)',
      backgroundColor: showVideo ? '#000' : getAvatarColor(name),
      margin: 4,
      justifyContent: 'center', alignItems: 'center',
    }}>
      {showVideo ? (
        <RTCView streamURL={videoURL} style={StyleSheet.absoluteFill} objectFit="cover" mirror={participant.isLocal} />
      ) : (
        <View style={{ width: '52%', aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {participant.avatar && !imgErr
            ? <Image source={{ uri: participant.avatar }} style={{ width: '100%', height: '100%' }} onError={() => setImgErr(true)} />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: tileSize * 0.18 }}>{getInitials(name)}</Text>
          }
        </View>
      )}

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {participant.isMuted && <Feather name="mic-off" size={10} color="#ed4245" />}
        <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 11, fontWeight: '700' }}>
          {name}{participant.isLocal ? ' (Bạn)' : ''}
        </Text>
        {isSpeaking && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#57f287' }} />}
      </View>
    </View>
  );
}

// ── Control button ────────────────────────────────────────────────────────────
function CtrlBtn({ icon, label, onPress, active = false, danger = false }) {
  const bg = danger ? '#ed4245' : (active ? '#ed4245' : 'rgba(255,255,255,0.16)');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={22} color="#fff" />
      </View>
      <Text style={{ color: THEME.textMuted, fontSize: 10 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GroupCallScreen() {
  const {
    callState, callType, callDuration, formatDuration,
    isMuted, isCameraOff, isScreenSharing,
    liveParts, localVideoURL, screenURL, speaking,
    getRemoteVideoURL,
    toggleMute, toggleCamera, toggleScreenShare,
    leaveGroupCall,
  } = useGroupCall();

  const isVisible = callState === GROUP_CALL_STATE.ACTIVE || callState === GROUP_CALL_STATE.CALLING;
  const isVideo   = callType === 'video';
  const [minimized, setMinimized] = useState(false);

  const handleToggleCamera = useCallback(async () => {
    if (Platform.OS === 'android' && isCameraOff) {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera trong cài đặt ứng dụng.');
          return;
        }
      } catch {}
    }
    toggleCamera();
  }, [isCameraOff, toggleCamera]);

  const handleToggleScreenShare = useCallback(() => {
    if (Platform.OS === 'android') {
      Alert.alert(
        isScreenSharing ? 'Dừng chia sẻ?' : 'Chia sẻ màn hình',
        isScreenSharing ? 'Dừng chia sẻ màn hình?' : 'Tính năng chia sẻ màn hình sẽ bắt đầu.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: isScreenSharing ? 'Dừng' : 'Bắt đầu', onPress: toggleScreenShare },
        ]
      );
    } else {
      toggleScreenShare();
    }
  }, [isScreenSharing, toggleScreenShare]);

  if (!isVisible) return null;

  const { width: screenW } = Dimensions.get('window');
  const cols     = liveParts.length <= 1 ? 1 : 2;
  const tileSize = (screenW - 16) / cols - 8;

  // ── PiP minimized ────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => setMinimized(false)} style={styles.pip}>
        <View style={styles.pipIcon}>
          <Feather name="users" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
            Gọi nhóm · {liveParts.length} người
          </Text>
          <Text style={{ color: '#57f287', fontSize: 12 }}>{formatDuration(callDuration)}</Text>
        </View>
        <TouchableOpacity onPress={leaveGroupCall} style={styles.pipEnd}>
          <Feather name="phone-off" size={16} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // ── Full screen ──────────────────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" transparent={false} statusBarTranslucent onRequestClose={leaveGroupCall}>
      <StatusBar barStyle="light-content" backgroundColor="#111214" />
      <View style={styles.container}>

        {/* Screen share overlay */}
        {screenURL && RTCView && (
          <View style={StyleSheet.absoluteFill}>
            <RTCView streamURL={screenURL} style={{ flex: 1 }} objectFit="contain" />
            <View style={styles.screenShareBadge}>
              <Feather name="monitor" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, marginLeft: 6 }}>Đang chia sẻ màn hình</Text>
            </View>
          </View>
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topTitle}>
              {callState === GROUP_CALL_STATE.CALLING ? 'Đang chờ người tham gia…' : `Gọi nhóm · ${liveParts.length} người`}
            </Text>
            <Text style={styles.topDuration}>{formatDuration(callDuration)}</Text>
          </View>
          <TouchableOpacity onPress={() => setMinimized(true)} style={styles.minimizeBtn}>
            <Feather name="minimize-2" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Participant grid */}
        <ScrollView contentContainerStyle={styles.grid}>
          {liveParts.length === 0 ? (
            <View style={styles.waitingBox}>
              <Feather name="loader" size={36} color={THEME.textMuted} />
              <Text style={{ color: THEME.textMuted, marginTop: 14, fontSize: 15 }}>
                {callState === GROUP_CALL_STATE.CALLING ? 'Đang đổ chuông…' : 'Đang kết nối…'}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {liveParts.map(p => (
                <ParticipantTile
                  key={p.identity}
                  participant={p}
                  tileSize={tileSize}
                  localVideoURL={localVideoURL}
                  getRemoteVideoURL={getRemoteVideoURL}
                  isSpeaking={speaking instanceof Set ? speaking.has(p.identity) : false}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Controls */}
        <View style={styles.controls}>
          <CtrlBtn
            icon={isMuted ? 'mic-off' : 'mic'}
            label={isMuted ? 'Bật mic' : 'Tắt mic'}
            onPress={toggleMute}
            active={isMuted}
          />

          {isVideo && (
            <CtrlBtn
              icon={isCameraOff ? 'video-off' : 'video'}
              label={isCameraOff ? 'Bật cam' : 'Tắt cam'}
              onPress={handleToggleCamera}
              active={isCameraOff}
            />
          )}

          <CtrlBtn
            icon="monitor"
            label={isScreenSharing ? 'Dừng SD' : 'Chia màn'}
            onPress={handleToggleScreenShare}
            active={isScreenSharing}
          />

          <TouchableOpacity onPress={leaveGroupCall} activeOpacity={0.8} style={{ alignItems: 'center', gap: 5 }}>
            <View style={styles.endBtn}>
              <Feather name="phone-off" size={24} color="#fff" />
            </View>
            <Text style={{ color: THEME.textMuted, fontSize: 10 }}>Rời</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111214' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  topDuration: { color: '#3ba55c', fontSize: 12, marginTop: 2 },
  minimizeBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  grid:        { padding: 8, paddingBottom: 110, flexGrow: 1 },
  waitingBox:  { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  screenShareBadge: {
    position: 'absolute', top: 12, left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(88,101,242,0.85)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
  },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    gap: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  endBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#ed4245',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#ed4245', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8,
  },
  pip: {
    position: 'absolute', bottom: 24, right: 16, left: 16,
    backgroundColor: '#1e1f22',
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#5865f2',
    elevation: 10, zIndex: 9997,
  },
  pipIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#5865f2', alignItems: 'center', justifyContent: 'center' },
  pipEnd:  { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ed4245', alignItems: 'center', justifyContent: 'center' },
});