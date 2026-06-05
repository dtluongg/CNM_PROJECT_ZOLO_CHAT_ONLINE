import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import apiClient from './apiClient';

const BUCKET = 'avatars';

// Bảng tra cứu base64 → byte.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) lookup[B64_CHARS.charCodeAt(i)] = i;
  return lookup;
})();

// Giải mã base64 → Uint8Array (không phụ thuộc atob/Buffer của môi trường).
const base64ToUint8Array = (base64) => {
  // Bỏ mọi ký tự không thuộc bảng base64 (bao gồm cả '=' và xuống dòng).
  const clean = (base64 || '').replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  // clean đã bỏ padding nên số byte = floor(len * 3 / 4).
  const byteLength = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLength > 0 ? byteLength : 0);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = B64_LOOKUP[clean.charCodeAt(i)];
    const e2 = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const e3 = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const e4 = B64_LOOKUP[clean.charCodeAt(i + 3)];

    if (p < byteLength) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < byteLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < byteLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
};

/**
 * Đọc file từ URI và trả về Uint8Array.
 * Trong React Native (Hermes), fetch(uri).blob() rồi upload thẳng lên Supabase
 * hay bị "Network request failed". Đọc base64 rồi gửi bytes là cách ổn định nhất.
 */
const getFileBytes = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToUint8Array(base64);
  } catch (error) {
    console.error('[getFileBytes] Error reading file:', error);
    throw new Error('Could not read file data');
  }
};

/**
 * Upload ảnh lên Supabase Storage (Dùng cho Avatar)
 */
export async function uploadImageToSupabase(uri, folder, userId) {
  try {
    if (!uri || !userId) {
      throw new Error('Missing uri or userId');
    }

    const rawExt = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const mime =
      ext === 'gif' ? 'image/gif' :
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      'image/jpeg';

    const path = `${folder}/${userId}_${Date.now()}.${ext}`;
    const bytes = await getFileBytes(uri);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        upsert: true,
        contentType: mime
      });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;

  } catch (error) {
    console.error('[uploadImageToSupabase] Error:', error.message);
    throw error;
  }
}

/**
 * Hàm upload tổng quát cho Stories (hỗ trợ cả ảnh và video)
 */
export async function uploadToSupabase(uri, fileName, bucketName = 'stories') {
  try {
    const bytes = await getFileBytes(uri);
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';

    // Xác định mime type cơ bản
    const isVideo = ['mp4', 'mov', 'avi'].includes(fileExt);
    const contentType = isVideo ? `video/${fileExt}` : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, bytes, {
        upsert: true,
        contentType
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error('[uploadToSupabase] Error:', error.message);
    throw error;
  }
}

/**
 * Upload media lên Backend (Dùng cho Stories và các chức năng khác)
 */
export async function uploadMediaToBackend(uri, type = 'image') {
  try {
    if (!uri) throw new Error('Missing file uri');

    const formData = new FormData();
    const fileName = uri.split('/').pop();
    const fileExt = fileName.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg');
    
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: fileName || `file_${Date.now()}.${fileExt}`,
      type: type === 'video' ? `video/${fileExt}` : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
    });

    const endpoint = type === 'video' ? '/uploads/video' : '/uploads/image';
    
    // Gọi API của Backend
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // TransformRequest trống để axios tự xử lý FormData trong React Native
      transformRequest: (data) => data,
    });

    if (response.data && response.data.file) {
      console.log('[uploadMediaToBackend] Success:', response.data.file.url);
      return response.data.file.url;
    }
    
    throw new Error('No URL received from server');
  } catch (error) {
    console.error('[uploadMediaToBackend] Error:', error.response?.data || error.message);
    throw error;
  }
}