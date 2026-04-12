import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Danh sách emoji phổ biến dùng trong chat
const EMOJIS = [
  '😀', '😂', '😍', '🥺', '😭', '😊', '😎', '🤔',
  '😅', '🥰', '😢', '😡', '😴', '🤗', '😏', '🙄',
  '❤️', '🔥', '✨', '🎉', '👍', '👏', '🙏', '💯',
];

/**
 * Lưới emoji để chèn nhanh vào ô nhập liệu.
 *
 * @param {function} onSelect - Callback khi chọn emoji, nhận vào chuỗi emoji
 */
const EmojiPicker = ({ onSelect, styles }) => (
  <View style={styles.emojiPicker}>
    <View style={styles.emojiGrid}>
      {EMOJIS.map((e) => (
        <TouchableOpacity key={e} onPress={() => onSelect(e)} style={styles.emojiBtn}>
          <Text style={styles.emojiChar}>{e}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export default EmojiPicker;