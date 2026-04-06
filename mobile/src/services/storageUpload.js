import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';

const BUCKET = 'avatars';

export async function uploadImageToSupabase(uri, folder, userId) {
  const rawExt = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const ext = ['jpg','jpeg','png','gif','webp'].includes(rawExt) ? rawExt : 'jpg';
  const mime =
    ext === 'gif'  ? 'image/gif'  :
    ext === 'png'  ? 'image/png'  :
    ext === 'webp' ? 'image/webp' :
    'image/jpeg';

  const path = `${folder}/${userId}_${Date.now()}.${ext}`;

  // ✅ Dùng string literal thay vì FileSystem.EncodingType.Base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  // ✅ Dùng decode thủ công thay vì Buffer (an toàn hơn trên Hermes)
  const byteCharacters = atob(base64);
  const bytes = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { upsert: true, contentType: mime });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}