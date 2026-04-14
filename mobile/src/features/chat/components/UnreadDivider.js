import React from 'react';
import { View, Text } from 'react-native';

/**
 * UnreadDivider — dòng ngang "── Tin nhắn chưa đọc ──"
 * Hiển thị màu đỏ nhạt giống web.
 */
export default function UnreadDivider({ THEME }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: '#f87171' }} />
      <Text
        style={{
          marginHorizontal: 8,
          fontSize: 11,
          fontWeight: '700',
          color: '#f87171',
          letterSpacing: 0.4,
        }}
      >
        Tin nhắn chưa đọc
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: '#f87171' }} />
    </View>
  );
}
