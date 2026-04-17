import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Định dạng số giây thành mm:ss (ví dụ: 75 → "1:15")
const fmtDur = (secs) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Component phát âm thanh dạng voice message.
 * Bao gồm nút play/pause và animation sóng âm.
 *
 * @param {string}  url       - URL file âm thanh
 * @param {number}  duration  - Thời lượng tính bằng giây
 * @param {boolean} isMine    - Tin nhắn của tôi hay người khác (ảnh hưởng màu sắc)
 */
const VoicePlayer = ({ url, duration, isMine, THEME }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);

  // 12 thanh sóng âm, mỗi thanh có Animated.Value riêng
  const animValues = useRef([...Array(12)].map(() => new Animated.Value(0.3))).current;
  const animRef = useRef(null);

  // Bắt đầu animation sóng âm khi đang phát
  const startWaveAnim = () => {
    const animations = animValues.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(val, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    animRef.current = Animated.parallel(animations);
    animRef.current.start();
  };

  // Dừng animation và reset các thanh về trạng thái ban đầu
  const stopWaveAnim = () => {
    animRef.current?.stop();
    animValues.forEach((v) => v.setValue(0.3));
  };

  // Bật / tắt phát âm thanh
  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await soundRef.current?.pauseAsync();
        setIsPlaying(false);
        stopWaveAnim();
      } else {
        // Tạo Sound object nếu chưa có
        if (!soundRef.current) {
          if (Platform.OS !== 'web') {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              allowsRecordingIOS: false,
            });
          }
          const { sound } = await Audio.Sound.createAsync({ uri: url });
          soundRef.current = sound;

          // Lắng nghe khi phát xong thì reset
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
              stopWaveAnim();
              soundRef.current?.unloadAsync();
              soundRef.current = null;
            }
          });
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
        startWaveAnim();
      }
    } catch (err) {
      console.error('VoicePlayer error:', err);
    }
  };

  // Giải phóng tài nguyên khi component unmount
  useEffect(() => {
    return () => {
      stopWaveAnim();
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Màu thanh sóng tuỳ thuộc tin nhắn của ai
  const barColor = isMine ? 'rgba(255,255,255,0.9)' : THEME.accent;

  return (
    <TouchableOpacity
      onPress={togglePlay}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160, paddingVertical: 2 }}
    >
      {/* Nút Play / Pause */}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : THEME.accent + '22',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={16}
          color={isMine ? '#fff' : THEME.accent}
        />
      </View>

      {/* Các thanh sóng âm */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, height: 28 }}>
        {animValues.map((val, i) => (
          <Animated.View
            key={i}
            style={{
              width: 3,
              height: 28,
              borderRadius: 2,
              backgroundColor: barColor,
              transform: [{ scaleY: val }],
            }}
          />
        ))}
      </View>

      {/* Thời lượng */}
      <Text
        style={{
          fontSize: 12,
          color: isMine ? 'rgba(255,255,255,0.75)' : THEME.textMuted,
          minWidth: 32,
        }}
      >
        {fmtDur(duration)}
      </Text>
    </TouchableOpacity>
  );
};

export default VoicePlayer;