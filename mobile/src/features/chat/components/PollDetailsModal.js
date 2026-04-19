import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * PollDetailsModal - Mobile
 * ─────────────────────────────────────────────────────────────────────
 * Hiển thị danh sách đầy đủ người bình chọn cho từng phương án.
 */
const PollDetailsModal = ({ visible, onClose, topic, options, THEME }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={{
            backgroundColor: THEME.bgSecondary,
            width: '100%',
            maxHeight: SCREEN_HEIGHT * 0.8,
            borderRadius: 8,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: THEME.border
          }}
        >
          {/* Header */}
          <View style={{
            height: 56,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: THEME.border,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Text style={{ flex: 1, color: THEME.textPrimary, fontSize: 18, fontWeight: '600' }}>
              Chi tiết bình chọn
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: THEME.textPrimary, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          <ScrollView style={{ padding: 16 }}>
            {Array.isArray(options) && options.map((opt) => {
              const voters = Array.isArray(opt.voterIds) ? opt.voterIds : [];
              if (voters.length === 0) return null;

              return (
                <View key={opt.id} style={{ marginBottom: 24 }}>
                  <Text style={{ 
                    fontSize: 15, fontWeight: '700', color: THEME.textPrimary, 
                    marginBottom: 12, opacity: 0.9 
                  }}>
                    {opt.text} ({voters.length})
                  </Text>

                  <View style={{ flexDirection: 'column', gap: 14 }}>
                    {voters.map((voter, idx) => {
                      const isObject = typeof voter === 'object' && voter !== null;
                      const displayName = isObject ? (voter.displayName || 'Người dùng Zolo') : 'Người dùng';
                      const avatar = isObject ? voter.avatar : null;

                      return (
                        <View key={isObject ? (voter._id || voter.id) : idx} style={{
                          flexDirection: 'row', alignItems: 'center', marginBottom: 14
                        }}>
                          <View style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: THEME.bgTertiary, overflow: 'hidden',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: THEME.border,
                            marginRight: 12
                          }}>
                            {avatar ? (
                              <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.textSecondary }}>
                                {displayName.charAt(0)}
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '500', color: THEME.textPrimary }}>
                            {displayName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default PollDetailsModal;
