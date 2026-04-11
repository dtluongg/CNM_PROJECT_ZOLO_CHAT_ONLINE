import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import messageApi from '../api/messageApi';

/**
 * Hook cung cấp các hàm xử lý file trong chat:
 * - Chọn và gửi ảnh từ thư viện
 * - Chọn và gửi file từ thiết bị
 * - Mở / tải file nhận được về máy
 *
 * @param {string}   conversationId - ID cuộc hội thoại
 * @param {function} onMessageSent  - Callback nhận tin nhắn sau khi gửi thành công
 */
const useFileHandler = (conversationId, onMessageSent) => {

  // Chọn ảnh từ thư viện và gửi vào chat
  const pickAndSendImage = async () => {
    try {
      // Xin quyền (bỏ qua trên web vì trình duyệt tự xử lý)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        // 'limited' = iOS chỉ cấp quyền ảnh đã chọn — vẫn cho phép tiếp tục
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
        // Web: chuyển blob: URL thành Blob để append vào FormData
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        fd.append('file', blob, asset.fileName || 'image.jpg');
      } else {
        // Native: React Native FormData chấp nhận object { uri, name, type }
        fd.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'image.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      }

      const up = await messageApi.uploadImage(fd);
      const res = await messageApi.sendImage(conversationId, up.data.file.fileId);
      onMessageSent?.(res.data.data);
    } catch (err) {
      console.error('pickAndSendImage error:', err);
      Alert.alert('Lỗi', 'Không thể gửi ảnh. Vui lòng thử lại.');
    }
  };

  // Chọn file từ thiết bị và gửi vào chat
  const pickAndSendFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fd = new FormData();

      if (Platform.OS === 'web') {
        // Web: chuyển blob: URL thành Blob
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
      const res = await messageApi.sendFile(conversationId, up.data.file.fileId);
      onMessageSent?.(res.data.data);
    } catch (err) {
      console.error('pickAndSendFile error:', err);
      Alert.alert('Lỗi', 'Không thể gửi file. Vui lòng thử lại.');
    }
  };

  // Mở hoặc tải file nhận được về máy
  const openFile = async (url, fileName) => {
    if (!url) return;
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

      // Native: tải về cache rồi mở share sheet
      const localUri = FileSystem.cacheDirectory + (fileName || 'file');
      const { uri } = await FileSystem.downloadAsync(url, localUri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        // Fallback: mở trong trình duyệt hệ thống
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      console.error('openFile error:', err);
      Alert.alert('Lỗi', 'Không thể mở file. Vui lòng thử lại.');
    }
  };

  return {
    pickAndSendImage,
    pickAndSendFile,
    openFile,
  };
};

export default useFileHandler;