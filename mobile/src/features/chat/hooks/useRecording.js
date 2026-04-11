import { useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import messageApi from '../api/messageApi';

/**
 * Hook quản lý toàn bộ vòng đời ghi âm:
 * xin quyền → bắt đầu ghi → dừng & upload → gửi tin nhắn voice.
 *
 * @param {string}   conversationId  - ID cuộc hội thoại
 * @param {function} onMessageSent   - Callback nhận tin nhắn voice đã gửi thành công
 */
const useRecording = (conversationId, onMessageSent) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);

  const recordingRef = useRef(null);      // Đối tượng Audio.Recording
  const recordingTimerRef = useRef(null); // Interval đếm giây

  // Bắt đầu ghi âm (chỉ hoạt động trên native iOS/Android)
  const startRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Thông báo', 'Ghi âm chưa được hỗ trợ trên web.');
      return;
    }

    try {
      // Xin quyền truy cập microphone
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập mic', 'Vui lòng cấp quyền microphone để ghi âm.');
        return;
      }

      // Cấu hình chế độ audio cho ghi âm
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Tạo và bắt đầu ghi
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      // Bắt đầu đếm giờ
      setIsRecording(true);
      setRecordingSec(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSec((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('startRecording error:', err);
    }
  };

  // Dừng ghi âm, upload file và gửi tin nhắn voice
  const stopRecording = async () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const duration = recordingSec;

    try {
      const recording = recordingRef.current;
      if (!recording) return;

      await recording.stopAndUnloadAsync();

      // Khôi phục chế độ audio về phát nhạc
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;

      // Upload file ghi âm
      const fd = new FormData();
      fd.append('voice', { uri, name: 'voice.m4a', type: 'audio/mp4' });
      fd.append('duration', String(duration));

      const up = await messageApi.uploadVoice(fd);

      // Gửi tin nhắn voice với fileId vừa upload
      const res = await messageApi.sendVoice(conversationId, up.data.voice.fileId);
      onMessageSent?.(res.data.data);
    } catch (err) {
      console.error('stopRecording error:', err);
    }
  };

  // Huỷ ghi âm mà không gửi
  const cancelRecording = async () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }
    } catch {
      // Bỏ qua lỗi khi huỷ
    }
  };

  return {
    isRecording,
    recordingSec,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};

export default useRecording;