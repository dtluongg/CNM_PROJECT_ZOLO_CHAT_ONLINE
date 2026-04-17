import { useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import messageApi from '../api/messageApi';

const useFileHandler = (conversationId, onMessageSent) => {
  const isSharingRef = useRef(false);

  const pickAndSendImage = async (replyToMessageId = null) => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted' && status !== 'limited') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh trong Cài đặt.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fd = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        fd.append('file', blob, asset.fileName || 'image.jpg');
      } else {
        fd.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'image.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      }

      const up = await messageApi.uploadImage(fd);
      const res = await messageApi.sendImage(conversationId, up.data.file.fileId, replyToMessageId);
      onMessageSent?.(res.data.data);
    } catch (err) {
      console.error('pickAndSendImage error:', err);
      Alert.alert('Lỗi', 'Không thể gửi ảnh. Vui lòng thử lại.');
    }
  };

  const pickAndSendFile = async (replyToMessageId = null) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fd = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        fd.append('file', blob, asset.name);
      } else {
        fd.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        });
      }

      const up = await messageApi.uploadFile(fd);
      const res = await messageApi.sendFile(conversationId, up.data.file.fileId, replyToMessageId);
      onMessageSent?.(res.data.data);
    } catch (err) {
      console.error('pickAndSendFile error:', err);
      Alert.alert('Lỗi', 'Không thể gửi file. Vui lòng thử lại.');
    }
  };

  const openFile = async (url, fileName) => {
    if (!url) return;

    if (isSharingRef.current) return;
    isSharingRef.current = true;

    try {
      if (Platform.OS === 'web') {
        // Web: tạo thẻ <a> ẩn để trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'file';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Android/iOS: mở thẳng trên trình duyệt hệ thống
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Lỗi', 'Không thể mở file này.');
      }
    } catch (err) {
      console.error('openFile error:', err);
      Alert.alert('Lỗi', 'Không thể mở file. Vui lòng thử lại.');
    } finally {
      isSharingRef.current = false;
    }
  };

  return {
    pickAndSendImage,
    pickAndSendFile,
    openFile,
  };
};

export default useFileHandler;
