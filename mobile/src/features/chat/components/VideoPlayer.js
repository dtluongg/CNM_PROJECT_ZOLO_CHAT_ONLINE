import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Định dạng số giây thành mm:ss
const fmtDur = (secs) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Component phát video inline trong bong bóng tin nhắn.
 * Hỗ trợ play/pause, progress bar và tự ẩn controls sau 3 giây.
 *
 * @param {string}  url    - URL file video
 * @param {boolean} isMine - Tin nhắn của tôi hay người khác
 */
const VideoPlayer = ({ url, isMine, THEME }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef(null);

  const isPlaying = status.isPlaying;

  // Bật / tắt phát video, tự ẩn controls sau 3s khi đang phát
  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      // Nếu đã xem hết thì replay từ đầu
      if (status.didJustFinish || status.positionMillis >= status.durationMillis - 200) {
        await videoRef.current.replayAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }

    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (!isPlaying) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  // Chạm vào video để toggle hiển thị controls
  const handleTap = () => {
    setShowControls((v) => {
      if (!v) {
        clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
      }
      return !v;
    });
  };

  // Giải phóng tài nguyên khi unmount
  useEffect(() => {
    return () => {
      clearTimeout(controlsTimer.current);
      videoRef.current?.unloadAsync();
    };
  }, []);

  // Tính phần trăm tiến trình phát
  const progress =
    status.durationMillis > 0 ? (status.positionMillis || 0) / status.durationMillis : 0;

  // Thời gian còn lại
  const remaining =
    status.durationMillis > 0
      ? fmtDur(Math.max(0, (status.durationMillis - (status.positionMillis || 0)) / 1000))
      : '0:00';

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleTap}
      style={{ borderRadius: 12, overflow: 'hidden', width: 240 }}
    >
      <Video
        ref={videoRef}
        source={{ uri: url }}
        style={{ width: 240, height: 160 }}
        resizeMode={ResizeMode.COVER}
        onPlaybackStatusUpdate={setStatus}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={false}
      />

      {/* Overlay controls hiển thị khi chạm */}
      {showControls && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Nút play/pause ở giữa */}
          <TouchableOpacity
            onPress={togglePlay}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.25)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.6)',
            }}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
          </TouchableOpacity>

          {/* Thanh tiến trình + thời gian ở phía dưới */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 10,
              paddingBottom: 8,
            }}
          >
            {/* Progress bar */}
            <View
              style={{
                height: 3,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 2,
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: '#fff',
                  width: `${Math.round(progress * 100)}%`,
                }}
              />
            </View>

            {/* Thời gian còn lại */}
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
              {isPlaying
                ? `-${remaining}`
                : fmtDur((status.durationMillis || 0) / 1000)}
            </Text>
          </View>
        </View>
      )}

      {/* Hiển thị khi đang buffer */}
      {status.isBuffering && !status.isPlaying && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Đang tải...</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default VideoPlayer;