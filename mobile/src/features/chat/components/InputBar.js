import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

/**
 * Thanh nhập liệu ở cuối màn hình chat.
 * Hiển thị các nút: đính kèm file, nhập text, chọn emoji, gửi ảnh, ghi âm.
 * Khi có nội dung text thì nút gửi thay thế nút ảnh & micro.
 *
 * @param {string}   text           - Nội dung đang nhập
 * @param {function} onChangeText   - Callback khi text thay đổi
 * @param {function} onSend         - Callback khi nhấn gửi
 * @param {function} onPickFile     - Callback khi nhấn đính kèm file
 * @param {function} onPickImage    - Callback khi nhấn chọn ảnh
 * @param {function} onStartRecord  - Callback khi nhấn ghi âm
 * @param {function} onToggleEmoji  - Callback bật/tắt bộ chọn emoji
 * @param {object}   inputRef       - Ref của TextInput để focus từ bên ngoài
 * @param {string}   placeholder    - Placeholder của ô nhập
 */
const InputBar = ({
  text,
  onChangeText,
  onSend,
  onPickFile,
  onPickImage,
  onStartRecord,
  onToggleEmoji,
  inputRef,
  placeholder,
  THEME,
  styles,
  replyingMessage,
  onCancelReply,
}) => (
  <View>
    {/* Thanh xem trước tin nhắn đang trả lời */}
    {replyingMessage && (
      <View style={[styles.replyBar, { borderLeftWidth: 4, borderLeftColor: THEME.accent, paddingLeft: 12, borderTopWidth: 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.replyLabel}>Đang trả lời {replyingMessage.senderName}</Text>
          <Text style={styles.replyContent} numberOfLines={1}>
            {replyingMessage.type === 'text' ? replyingMessage.content : `[${replyingMessage.type}]`}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancelReply} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: THEME.textMuted }}>✕</Text>
        </TouchableOpacity>
      </View>
    )}

    <View style={styles.inputBar}>
    {/* Nút đính kèm file */}
    <TouchableOpacity style={styles.inputBtn} onPress={onPickFile}>
      <Feather name="paperclip" size={22} color={THEME.textMuted} />
    </TouchableOpacity>

    {/* Ô nhập text + nút emoji */}
    <View style={styles.inputWrap}>
      <TextInput
        ref={inputRef}
        style={styles.textInput}
        value={text}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.textMuted}
        multiline
        selectionColor={THEME.accent}
      />
      <TouchableOpacity onPress={onToggleEmoji} style={styles.emojiToggle}>
        <Feather name="smile" size={22} color={THEME.textMuted} />
      </TouchableOpacity>
    </View>

    {/* Nút gửi (hiện khi có text) hoặc nút ảnh + mic */}
    {text.trim().length > 0 ? (
      <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
        <Ionicons name="send" size={18} color="#fff" />
      </TouchableOpacity>
    ) : (
      <>
        {/* Nút chọn ảnh */}
        <TouchableOpacity style={styles.inputBtn} onPress={onPickImage}>
          <Feather name="image" size={22} color={THEME.textMuted} />
        </TouchableOpacity>

        {/* Nút ghi âm — chỉ hiện trên native (iOS/Android) */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.inputBtn} onPress={onStartRecord}>
            <Feather name="mic" size={22} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </>
    )}
    </View>
  </View>
);

export default InputBar;