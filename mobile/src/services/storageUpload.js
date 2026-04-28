import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import apiClient from './apiClient';

const BUCKET = 'avatars';

/**
 * Đọc file từ URI và trả về Blob
 * Phương pháp fetch(uri).blob() là cách ổn định nhất trong React Native 
 * để chuyển đổi file:// URI thành dữ liệu có thể upload.
 */
const getFileBlob = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[getFileBlob] Error reading file:', error);
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
    const blob = await getFileBlob(uri);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
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
    const blob = await getFileBlob(uri);
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Xác định mime type cơ bản
    const isVideo = ['mp4', 'mov', 'avi'].includes(fileExt);
    const contentType = isVideo ? `video/${fileExt}` : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, blob, {
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