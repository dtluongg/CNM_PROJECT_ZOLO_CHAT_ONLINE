import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Platform, PermissionsAndroid,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useVoiceRoomContext } from '../VoiceRoomContext';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { getInitials } from '../../../theme';

// RTCView: try-catch so web / Expo Go doesn't crash
let RTCView = null;
try { RTCView = require('react-native-webrtc').RTCView; } catch {}

const COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarBg = (name) => COLORS[(name || '?').charCodeAt(0) % COLORS.length];

// ── Permission states ─────────────────────────────────────────────────────────
const PERM = { idle: 'idle', checking: 'checking', granted: 'granted', denied: 'denied' };

// ── Permission gate ───────────────────────────────────────────────────────────
function PermissionGate({ topic, onConfirm, onCancel }) {
  const [micStatus, setMicStatus] = useState(PERM.idle);
  const [camStatus, setCamStatus] = useState(PERM.idle);
  const [checking,  setChecking]  = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const requestPermissions = useCallback(async () => {
    setChecking(true);
    setErrorMsg('');
    setMicStatus(PERM.checking);
    setCamStatus(PERM.checking);

    if (Platform.OS === 'android') {
      try {
        const micResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Quyền micro',
            message: 'Ứng dụng cần quyền micro để tham gia phòng thoại',
            buttonPositive: 'Cho phép',
            buttonNegative: 'Từ chối',
          }
        );
        const micOk = micResult === PermissionsAndroid.RESULTS.GRANTED;
        setMicStatus(micOk ? PERM.granted : PERM.denied);

        if (micOk) {
          const camResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Quyền camera',
              message: 'Camera dùng để chia sẻ video trong phòng thoại (tuỳ chọn)',
              buttonPositive: 'Cho phép',
              buttonNegative: 'Bỏ qua',
            }
          );
          setCamStatus(camResult === PermissionsAndroid.RESULTS.GRANTED ? PERM.granted : PERM.denied);
        } else {
          setCamStatus(PERM.denied);
          setErrorMsg('Cần quyền micro để tham gia phòng thoại. Vui lòng cho phép trong Cài đặt.');
        }
      } catch {
        setMicStatus(PERM.denied);
        setCamStatus(PERM.denied);
        setErrorMsg('Không thể yêu cầu quyền. Hãy kiểm tra cài đặt ứng dụng.');
      }
    } else {
      // iOS: system prompt tự hiện khi LiveKit truy cập mic
      setMicStatus(PERM.granted);
      setCamStatus(PERM.granted);
    }
    setChecking(false);
  }, []);

  useEffect(() => { requestPermissions(); }, []); // eslint-disable-line

  const canJoin = micStatus === PERM.granted;

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1b1e', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1b1e" />
      <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#2b2d31', borderRadius: 18, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(87,242,135,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Feather name="volume-2" size={28} color="#57f287" />
          </View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Tham gia kênh thoại</Text>
          <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            🔊 {topic?.name || 'Kênh thoại'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            Cho phép truy cập thiết bị để tham gia phòng thoại
          </Text>
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <PermRow icon="mic"   label="Micro"  desc="Bắt buộc để nói chuyện trong phòng" status={micStatus} required />
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 }} />
          <PermRow icon="video" label="Camera" desc="Tuỳ chọn — có thể bật/tắt sau"       status={camStatus} />
        </View>

        {!!errorMsg && (
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(237,66,69,0.15)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(237,66,69,0.3)' }}>
            <Feather name="alert-circle" size={14} color="#ed4245" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, color: '#ed4245', fontSize: 12, lineHeight: 16 }}>{errorMsg}</Text>
          </View>
        )}

        {camStatus === PERM.denied && micStatus === PERM.granted && (
          <View style={{ backgroundColor: 'rgba(250,166,26,0.12)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(250,166,26,0.25)' }}>
            <Text style={{ color: '#faa61a', fontSize: 12 }}>Camera bị từ chối — bạn vẫn có thể tham gia bằng micro.</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center' }}>
            <Text style={{ color: '#ccc', fontSize: 14, fontWeight: '600' }}>Hủy</Text>
          </TouchableOpacity>

          {!canJoin ? (
            <TouchableOpacity onPress={requestPermissions} disabled={checking}
              style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5865f2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: checking ? 0.7 : 1 }}>
              {checking ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="shield" size={15} color="#fff" />}
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                {checking ? 'Đang kiểm tra...' : 'Cho phép truy cập'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onConfirm}
              style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#57f287', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Feather name="volume-2" size={15} color="#000" />
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '700' }}>Tham gia</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function PermRow({ icon, label, desc, status, required }) {
  const statusColor = { [PERM.idle]: '#888', [PERM.checking]: '#faa61a', [PERM.granted]: '#57f287', [PERM.denied]: '#ed4245' }[status] || '#888';
  const StatusIcon = () => {
    if (status === PERM.checking) return <ActivityIndicator size="small" color="#faa61a" />;
    if (status === PERM.granted)  return <Feather name="check-circle" size={16} color="#57f287" />;
    if (status === PERM.denied)   return <Feather name="x-circle"     size={16} color="#ed4245" />;
    return null;
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name={icon} size={20} color={statusColor} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{label}</Text>
          {required && (
            <View style={{ backgroundColor: 'rgba(88,101,242,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ color: '#5865f2', fontSize: 10, fontWeight: '600' }}>Bắt buộc</Text>
            </View>
          )}
        </View>
        <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{desc}</Text>
      </View>
      <StatusIcon />
    </View>
  );
}

// ── Participant card ───────────────────────────────────────────────────────────
function ParticipantCard({ participant, size, localVideoURL, getRemoteVideoURL }) {
  const videoURL  = participant.isLocal ? localVideoURL : getRemoteVideoURL(participant.identity);
  const showVideo = !!videoURL && participant.hasCamera;
  const name      = participant.displayName || participant.name || 'Người dùng';
  const [imgErr, setImgErr] = useState(false);

  return (
    <View style={{
      width: size, height: size, borderRadius: 14, overflow: 'hidden',
      borderWidth: 3,
      borderColor: participant.isSpeaking ? '#57f287' : 'rgba(255,255,255,0.08)',
      backgroundColor: showVideo ? '#000' : avatarBg(name),
      justifyContent: 'center', alignItems: 'center',
    }}>
      {showVideo && RTCView ? (
        <RTCView
          streamURL={videoURL}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          objectFit="cover"
          mirror={participant.isLocal}
        />
      ) : (
        <View style={{ width: '58%', height: '58%', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {participant.avatar && !imgErr ? (
            <Image source={{ uri: participant.avatar }} style={{ width: '100%', height: '100%' }} onError={() => setImgErr(true)} />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.2 }}>
              {getInitials(name)}
            </Text>
          )}
        </View>
      )}

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: 'rgba(0,0,0,0.65)', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {participant.isMuted && <Feather name="mic-off" size={Math.max(9, size * 0.09)} color="#ed4245" />}
        <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: Math.max(9, size * 0.1), fontWeight: '700' }}>
          {name}
        </Text>
        {participant.isSpeaking && <Feather name="volume-2" size={Math.max(9, size * 0.09)} color="#57f287" />}
      </View>
    </View>
  );
}

// ── Control button ─────────────────────────────────────────────────────────────
function CtrlBtn({ onPress, active, danger, icon, label, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={{
        alignItems: 'center', gap: 5,
        backgroundColor: active ? (danger ? '#ed4245' : 'rgba(87,242,135,0.6)') : 'rgba(255,255,255,0.08)',
        borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
        minWidth: 64, opacity: disabled ? 0.5 : 1,
      }}
    >
      <Feather name={icon} size={20} color={active ? (danger ? '#fff' : '#000') : '#ccc'} />
      <Text style={{ color: active ? (danger ? '#fff' : '#000') : '#ccc', fontSize: 10, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Screen share viewer ────────────────────────────────────────────────────────
function ScreenShareViewer({ screenURL, isRemoteScreenSharing, isScreenSharing }) {
  const [fullscreen, setFullscreen] = useState(false);

  // Không có gì để hiển thị
  if (!isRemoteScreenSharing && !isScreenSharing) return null;

  if (fullscreen) {
    return (
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999, backgroundColor: '#000',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {screenURL && RTCView ? (
          <RTCView
            streamURL={screenURL}
            style={{ width: '100%', height: '100%' }}
            objectFit="contain"
          />
        ) : (
          <Text style={{ color: '#aaa', fontSize: 13 }}>Đang chờ màn hình...</Text>
        )}

        {/* Overlay top bar */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          paddingTop: Platform.OS === 'ios' ? 50 : 16,
          paddingHorizontal: 16, paddingBottom: 12,
          backgroundColor: 'rgba(0,0,0,0.55)',
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#57f287' }} />
          <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' }}>
            Màn hình được chia sẻ
          </Text>
          <TouchableOpacity onPress={() => setFullscreen(false)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Feather name="minimize-2" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Thu nhỏ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mini preview
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setFullscreen(true)}
      style={{
        height: 180,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {screenURL && RTCView ? (
        <RTCView
          streamURL={screenURL}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          objectFit="contain"
        />
      ) : (
        // Local đang share — remote chưa nhận được stream của chính mình
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Feather name="monitor" size={28} color="#57f287" />
          <Text style={{ color: '#aaa', fontSize: 12 }}>Đang chia sẻ màn hình của bạn...</Text>
        </View>
      )}

      {/* Label + fullscreen hint */}
      <View style={{
        position: 'absolute', bottom: 8, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#57f287' }} />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
            {isRemoteScreenSharing ? 'Màn hình được chia sẻ' : 'Bạn đang chia sẻ màn hình'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Feather name="maximize-2" size={10} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>Toàn màn hình</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function VoiceChannelScreen({ route, navigation }) {
  const { conversation, topic } = route.params;
  const { theme: THEME } = useTheme();
  const { user }         = useAuth();

  const convId  = conversation?.id || conversation?._id;
  const topicId = topic?._id || null;

  const {
    getRoomInfo, getMergedParticipants, isInRoom,
    loading, error,
    connected, isMuted, isCameraOff,
    isScreenSharing, isRemoteScreenSharing,
    localVideoURL, screenURL,
    getRemoteVideoURL,
    createRoom, joinRoom, leaveRoom,
    toggleMute, toggleCamera, toggleScreenShare,
    fetchStatus,
  } = useVoiceRoomContext();

  const [permGranted, setPermGranted] = useState(null);

  const roomInfo     = getRoomInfo(topicId);
  const roomActive   = roomInfo?.active;
  const inThisRoom   = isInRoom(topicId);
  const participants = getMergedParticipants(topicId);
  const autoJoinDone = useRef(false);

  useEffect(() => {
    if (convId && topicId) fetchStatus(convId, topicId);
  }, [topicId, convId]);

  useEffect(() => {
    if (!convId || !topicId || inThisRoom || loading || autoJoinDone.current) return;
    if (permGranted !== true) return;
    autoJoinDone.current = true;
    const doJoin = async () => {
      await new Promise(r => setTimeout(r, 300));
      const info = getRoomInfo(topicId);
      if (info?.active) joinRoom(convId, topicId);
      else createRoom(convId, topicId);
    };
    doJoin();
  }, [convId, topicId, permGranted]);

  const handleLeave = useCallback(async () => {
    await leaveRoom(convId, topicId);
    navigation.goBack();
  }, [convId, topicId, leaveRoom, navigation]);

  // ── Permission gate ──────────────────────────────────────────────────────────
  if (permGranted !== true) {
    return (
      <PermissionGate
        topic={topic}
        onConfirm={() => setPermGranted(true)}
        onCancel={() => { setPermGranted(false); navigation.goBack(); }}
      />
    );
  }

  const cardSize = participants.length <= 1 ? 200 : participants.length <= 4 ? 160 : 120;
  const numCols  = participants.length <= 1 ? 1 : 2;
  const hasScreen = isRemoteScreenSharing || isScreenSharing;

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1b1e' }}>
      <StatusBar barStyle="light-content" backgroundColor="#2b2d31" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
        backgroundColor: '#2b2d31',
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
      }}>
        <Feather name="volume-2" size={16} color={inThisRoom && connected ? '#57f287' : '#5865f2'} />
        <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
          🔊 {topic?.name || 'Kênh thoại'}
        </Text>
        {inThisRoom && connected && (
          <View style={{ backgroundColor: '#57f28720', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#57f287', fontSize: 11, fontWeight: '600' }}>✓ {participants.length} người</Text>
          </View>
        )}
        {loading && <ActivityIndicator size="small" color="#aaa" />}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Feather name="x" size={22} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* ✅ Screen share viewer — hiển thị khi có ai đó đang share */}
      <ScreenShareViewer
        screenURL={screenURL}
        isRemoteScreenSharing={isRemoteScreenSharing}
        isScreenSharing={isScreenSharing}
      />

      {/* Error */}
      {!!error && (
        <View style={{ margin: 12, padding: 10, backgroundColor: '#ed424520', borderRadius: 10 }}>
          <Text style={{ color: '#ed4245', fontSize: 13 }}>{error}</Text>
        </View>
      )}

      {/* Participant grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10,
          justifyContent: numCols === 1 ? 'center' : 'flex-start',
        }}
      >
        {inThisRoom && connected ? (
          participants.length > 0 ? (
            participants.map(p => (
              <ParticipantCard
                key={p.userId || p.identity}
                participant={p}
                size={cardSize}
                localVideoURL={localVideoURL}
                getRemoteVideoURL={getRemoteVideoURL}
              />
            ))
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: '#666', fontSize: 13 }}>Chưa có người tham gia</Text>
            </View>
          )
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16, minHeight: 200 }}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#5865f2" />
                <Text style={{ color: '#aaa', fontSize: 14 }}>Đang tham gia phòng thoại...</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 56 }}>🔊</Text>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                  {roomActive ? 'Phòng thoại đang hoạt động' : 'Kênh thoại trống'}
                </Text>
                {roomActive && participants.length > 0 && (
                  <Text style={{ color: '#aaa', fontSize: 13 }}>{participants.length} người đang trong phòng</Text>
                )}
                <TouchableOpacity
                  onPress={() => { autoJoinDone.current = false; }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#57f287', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
                >
                  <Feather name="volume-2" size={16} color="#000" />
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Tham gia lại</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      {inThisRoom && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
          paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28,
          backgroundColor: '#2b2d31',
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
        }}>
          <CtrlBtn
            onPress={toggleMute}
            active={isMuted} danger
            icon={isMuted ? 'mic-off' : 'mic'}
            label={isMuted ? 'Đang tắt' : 'Micro'}
          />
          <CtrlBtn
            onPress={toggleCamera}
            active={!isCameraOff}
            icon={isCameraOff ? 'video-off' : 'video'}
            label="Camera"
          />
          <CtrlBtn
            onPress={toggleScreenShare}
            active={isScreenSharing}
            icon={isScreenSharing ? 'monitor-off' : 'monitor'}
            label={isScreenSharing ? 'Dừng' : 'Màn hình'}
          />
          <View style={{ flex: 1 }} />
          <CtrlBtn
            onPress={handleLeave}
            active danger disabled={loading}
            icon={loading ? 'loader' : 'phone-off'}
            label="Rời phòng"
          />
        </View>
      )}
    </View>
  );
}