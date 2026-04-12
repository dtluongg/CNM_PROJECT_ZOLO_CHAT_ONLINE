import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Chỉ import expo-file-system khi KHÔNG phải web
let FileSystem;
if (Platform.OS !== 'web') {
    FileSystem = require('expo-file-system/legacy');
}

const BUCKET = 'avatars';

/**
 * Đọc file từ URI và trả về Uint8Array/Blob
 */
const getFileData = async (uri) => {
  // ============ WEB ============
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  // ============ iOS / ANDROID ============
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  const byteCharacters = atob(base64);
  const bytes = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }

  return bytes;
};

/**
 * Upload ảnh lên Supabase Storage
 */
export async function uploadImageToSupabase(uri, folder, userId) {
  try {
    if (!uri || !userId) {
      throw new Error('Thiếu uri hoặc userId');
    }

    const rawExt = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const mime =
      ext === 'gif' ? 'image/gif' :
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      'image/jpeg';

    const path = `${folder}/${userId}_${Date.now()}.${ext}`;
    const fileData = await getFileData(uri);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileData, {
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