/**
 * Upload an image from a local URI to Supabase Storage.
 * Works in React Native using expo-file-system to read bytes.
 */
import * as FileSystem from 'expo-file-system';
import { supabase } from '../config/supabase';

const BUCKET = 'avatars';

export async function uploadImageToSupabase(uri, folder, userId) {
  // Determine mime type from extension
  const rawExt = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const ext = ['jpg','jpeg','png','gif','webp'].includes(rawExt) ? rawExt : 'jpg';
  const mime = ext === 'gif' ? 'image/gif'
    : ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : 'image/jpeg';

  const path = `${folder}/${userId}_${Date.now()}.${ext}`;

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 → Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { upsert: true, contentType: mime });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
