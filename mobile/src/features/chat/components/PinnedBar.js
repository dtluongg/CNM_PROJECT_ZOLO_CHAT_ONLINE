import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

const { width } = Dimensions.get('window');

const PinnedBar = ({ pinnedMessages = [], onJump, onUnpin }) => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Tự động điều chỉnh currentIndex khi danh sách ghim thay đổi
  useEffect(() => {
    if (pinnedMessages.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= pinnedMessages.length) {
      setCurrentIndex(pinnedMessages.length - 1);
    }
  }, [pinnedMessages.length, currentIndex]);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const currentPin = pinnedMessages[currentIndex];
  const message = currentPin?.messageId;

  if (!message) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  const getPreviewText = () => {
    if (message.revoked) return t('chat.revoked_preview');
    if (message.type === 'image') return t('chat.image_preview');
    if (message.type === 'file') return `${t('chat.file_preview')} ${message.payload?.fileName || ''}`;
    if (message.type === 'voice') return t('chat.voice_preview');
    return message.content;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.content} 
        onPress={() => onJump((message._id || message.id)?.toString())}
        activeOpacity={0.7}
      >
        <View style={styles.pinIconContainer}>
          <Ionicons name="pin" size={18} color="#0084ff" />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {t('chat.pinned_messages_title')} {pinnedMessages.length > 1 && `(${currentIndex + 1}/${pinnedMessages.length})`}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.senderName} numberOfLines={1}>
              {message.senderId?.displayName || t('chat.me')}
            </Text>
          </View>
          <Text style={styles.previewText} numberOfLines={1}>
            {getPreviewText()}
          </Text>
        </View>

        <View style={styles.actions}>
          {pinnedMessages.length > 1 && (
            <View style={styles.navButtons}>
              <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity 
            onPress={() => onUnpin((message._id || message.id)?.toString())} 
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pinIconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0084ff',
  },
  dot: {
    marginHorizontal: 4,
    fontSize: 10,
    color: '#999',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    maxWidth: width * 0.3,
  },
  previewText: {
    fontSize: 13,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  navButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  navButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
});

export default PinnedBar;
