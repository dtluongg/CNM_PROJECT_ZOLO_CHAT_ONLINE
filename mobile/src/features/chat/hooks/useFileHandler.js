import { useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import messageApi from '../api/messageApi';

// ── Normalize ảnh: chuyển HEIC/HEIF → JPEG, đảm bảo type hợp lệ ──
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const normalizeImage = (uri, mimeType, fileName) => {
  // Lấy extension từ URI (bỏ query string nếu có)
  const cleanUri = uri.split('?')[0];
  const extFromUri = cleanUri.split('.').pop()?.toLowerCase();

  // Map extension → mime
  const extToMime = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  // Xác định mime cuối cùng
  let resolvedMime = mimeType?.toLowerCase();

  // Nếu mime không hợp lệ hoặc là HEIC/HEIF → thử đoán từ extension
  if (!SUPPORTED_IMAGE_TYPES.includes(resolvedMime)) {
    resolvedMime = extToMime[extFromUri] || null;
  }

  // Vẫn không xác định được → fallback jpeg
  if (!SUPPORTED_IMAGE_TYPES.includes(resolvedMime)) {
    resolvedMime = 'image/jpeg';
  }

  // Xác định extension hợp lệ từ mime
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const resolvedExt = mimeToExt[resolvedMime];

  // Tạo tên file hợp lệ
  const baseName = (fileName || `image_${Date.now()}`)
    .replace(/\.[^.]+$/, ''); // bỏ extension cũ
  const resolvedName = `${baseName}.${resolvedExt}`;

  return { mime: resolvedMime, name: resolvedName };
};

// ─────────────────────────────────────────────────────────────────

const useFileHandler = (conversationId, onMessageSent, topicId = null) => {
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
        // Normalize ngay cả trên web
        const { name } = normalizeImage(asset.uri, asset.mimeType, asset.fileName);
        fd.append('file', blob, name);
      } else {
        // ✅ Normalize MIME và tên file trước khi gửi
        const { mime, name } = normalizeImage(asset.uri, asset.mimeType, asset.fileName);
        console.log(`[pickAndSendImage] uri=${asset.uri} | originalMime=${asset.mimeType} → resolvedMime=${mime} | name=${name}`);
        fd.append('file', {
          uri: asset.uri,
          name,
          type: mime,
        });
      }

      const up = await messageApi.uploadImage(fd);
      const res = await messageApi.sendImage(conversationId, up.data.file.fileId, replyToMessageId, topicId);
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
      const res = await messageApi.sendFile(conversationId, up.data.file.fileId, replyToMessageId, topicId);
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
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'file';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

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