import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const InputBar = ({
  text,
  onChangeText,
  onSend,
  onPickFile,
  onPickImage,
  onPickPoll,
  onStartRecord,
  onToggleEmoji,
  inputRef,
  placeholder,
  THEME,
  styles,
  replyingMessage,
  onCancelReply,
  isGroup,
  // Permission-related
  disabled,
  disabledMessage,
}) => {
  // ── Disabled / read-only state ─────────────────────────────────────────────
  if (disabled) {
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: THEME.border }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: THEME.bgSecondary,
        }}>
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.06)',
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Feather name="lock" size={15} color={THEME.textMuted} />
          </View>
          <Text style={{ flex: 1, color: THEME.textMuted, fontSize: 13, fontStyle: 'italic' }}>
            {disabledMessage || 'Bạn không có quyền gửi tin nhắn trong kênh này'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: THEME.border }}>
      {/* Reply preview */}
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

      {/* Top toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarBtn} onPress={onPickImage}>
          <Feather name="image" size={20} color={THEME.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarBtn} onPress={onPickFile}>
          <Feather name="paperclip" size={20} color={THEME.textMuted} />
        </TouchableOpacity>
        {isGroup && (
          <TouchableOpacity style={styles.toolbarBtn} onPress={onPickPoll}>
            <Feather name="bar-chart-2" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Input row */}
      <View style={styles.inputBar}>
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.inputBtn} onPress={onStartRecord}>
            <Feather name="mic" size={22} color={THEME.textMuted} />
          </TouchableOpacity>
        )}

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

        {text.trim().length > 0 && (
          <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default InputBar;
