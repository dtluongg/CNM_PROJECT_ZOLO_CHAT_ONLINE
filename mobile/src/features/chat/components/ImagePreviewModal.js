import React from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Platform } from 'react-native';

/**
 * Modal xem ảnh toàn màn hình với nền tối.
 * Có nút đóng và nút tải ảnh về máy.
 *
 * @param {string}   imageUrl   - URL ảnh cần xem
 * @param {function} onClose    - Callback đóng modal
 * @param {function} onDownload - Callback tải ảnh về (nhận url, fileName)
 */
const ImagePreviewModal = ({ imageUrl, onClose, onDownload, THEME }) => (
  <Modal
    visible={!!imageUrl}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Nút đóng góc trên phải */}
      <TouchableOpacity
        onPress={onClose}
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 54 : 20,
          right: 20,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 20, color: '#fff' }}>✕</Text>
      </TouchableOpacity>

      {/* Ảnh toàn màn hình */}
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '75%' }}
          resizeMode="contain"
        />
      )}

      {/* Nút tải ảnh về */}
      <TouchableOpacity
        onPress={() => onDownload(imageUrl, 'image.jpg')}
        style={{
          marginTop: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: THEME.accent,
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
      >
        <Text style={{ fontSize: 18 }}>⬇️</Text>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Tải ảnh về</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

export default ImagePreviewModal;