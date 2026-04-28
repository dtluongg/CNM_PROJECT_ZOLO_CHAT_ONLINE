import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, FlatList, Dimensions, Pressable
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

const { width } = Dimensions.get('window');

const PinLimitModal = ({ isOpen, onClose, pinnedMessages = [], onConfirm, THEME }) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedIndex);
    setSelectedIndex(0);
  };

  const renderItem = ({ item, index }) => {
    const message = item.messageId;
    const isSelected = selectedIndex === index;
    const previewText = message.revoked ? t('chat.revoked_msg') : 
                       (message.type === 'image' ? t('chat.image_preview') : 
                       (message.type === 'file' ? `${t('chat.file_preview')} ${message.payload?.fileName || ''}` : 
                       (message.type === 'voice' ? t('chat.voice_preview') : message.content)));

    return (
      <TouchableOpacity
        style={[
          styles.item, 
          { 
            borderColor: isSelected ? THEME.accent : THEME.border,
            backgroundColor: isSelected ? THEME.accent + '08' : 'transparent',
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => setSelectedIndex(index)}
        activeOpacity={0.7}
      >
        <View style={styles.itemIconContainer}>
          <View style={[styles.messageIconCircle, { backgroundColor: THEME.bgPrimary }]}>
            <Feather name="message-square" size={16} color={THEME.textMuted} />
          </View>
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: THEME.textPrimary }]}>{t('chat.pin_item_type')}</Text>
            {isSelected && (
              <Text style={[styles.changeLabel, { color: THEME.accent }]}>{t('chat.pin_replace_action')}</Text>
            )}
          </View>
          <Text style={[styles.previewText, { color: THEME.textMuted }]} numberOfLines={1}>
            {message.senderId?.displayName || t('chat.member')}: {previewText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: THEME.bgSecondary }]} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: THEME.textPrimary }]}>{t('chat.update_pin_list')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.description, { color: THEME.textSecondary }]}>
              {t('chat.pin_limit_desc')}
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
              style={[styles.btn, styles.cancelBtn, { backgroundColor: 'transparent' }]}
            >
              <Text style={[styles.btnText, { color: THEME.textPrimary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleConfirm} 
              style={[styles.btn, styles.confirmBtn, { backgroundColor: THEME.accent }]}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>{t('chat.pin_confirm_update')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  list: {
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  itemIconContainer: {
    marginRight: 12,
  },
  messageIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  changeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    justifyContent: 'flex-end',
    gap: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confirmBtn: {
    elevation: 2,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PinLimitModal;
