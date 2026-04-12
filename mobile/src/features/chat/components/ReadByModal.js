import React from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';

/**
 * Modal hiển thị danh sách thành viên đã đọc tin nhắn trong nhóm chat.
 * Mỗi mục hiển thị avatar, tên và thời gian đọc.
 *
 * @param {boolean}  visible   - Có hiển thị không
 * @param {function} onClose   - Callback đóng modal
 * @param {array}    readByList - Danh sách { userId, displayName, avatar, readAt }
 */
const ReadByModal = ({ visible, onClose, readByList, THEME, styles }) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={styles.sheetOverlay} onPress={onClose}>
      <View style={[styles.sheet, { paddingBottom: 20 }]}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: THEME.border,
          }}
        >
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary }}>
            Người đã xem
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 22, color: THEME.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách người đã đọc */}
        <ScrollView style={{ maxHeight: 400 }}>
          {readByList.map((r) => (
            <View
              key={r.userId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: THEME.accent,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {r.avatar ? (
                  <Image source={{ uri: r.avatar }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {r.displayName?.charAt(0)}
                  </Text>
                )}
              </View>

              {/* Tên + thời gian đọc */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: THEME.textPrimary }}>
                  {r.displayName}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.textMuted }}>
                  Đã xem lúc{' '}
                  {new Date(r.readAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

export default ReadByModal;