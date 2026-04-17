import React from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, FlatList, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PinLimitModal = ({ isOpen, onClose, pinnedMessages, onConfirm, THEME }) => {
  if (!isOpen) return null;

  const renderItem = ({ item, index }) => {
    const message = item.messageId;
    const previewText = message.revoked ? 'Tin nhắn đã được thu hồi' : 
                       (message.type === 'image' ? '[Hình ảnh]' : 
                       (message.type === 'file' ? `[File] ${message.payload?.fileName || ''}` : 
                       (message.type === 'voice' ? '[Tin nhắn thoại]' : message.content)));

    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: THEME.border }]}
        onPress={() => onConfirm(index)}
      >
        <View style={styles.itemHeader}>
          <Text style={[styles.senderName, { color: THEME.textPrimary }]} numberOfLines={1}>
            {message.senderId?.displayName || 'Thành viên'}
          </Text>
          <Ionicons name="swap-horizontal" size={16} color={THEME.accent} />
        </View>
        <Text style={[styles.previewText, { color: THEME.textMuted }]} numberOfLines={1}>
          {previewText}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRestart={() => onClose()}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: THEME.bgSecondary }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: THEME.border }]}>
            <Text style={[styles.title, { color: THEME.textPrimary }]}>Ghim tin nhắn</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.description, { color: THEME.textSecondary }]}>
              Bạn chỉ có thể ghim tối đa 3 tin nhắn. Hãy chọn một tin nhắn cũ để thay thế:
            </Text>

            <FlatList
              data={pinnedMessages}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              scrollEnabled={false}
              style={styles.list}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.cancelBtn, { backgroundColor: THEME.bgHover }]}
            >
              <Text style={[styles.cancelBtnText, { color: THEME.textPrimary }]}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  list: {
    marginBottom: 8,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  previewText: {
    fontSize: 13,
  },
  footer: {
    padding: 16,
    paddingTop: 0,
    alignItems: 'center',
  },
  cancelBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PinLimitModal;
