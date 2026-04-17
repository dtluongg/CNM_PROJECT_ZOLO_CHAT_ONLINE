import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

/**
 * Bottom sheet hiện ra khi người dùng giữ một tin nhắn.
 * Cho phép react, trả lời, chuyển tiếp, sao chép, thu hồi, chỉnh sửa, xoá.
 *
 * @param {object}   msg             - Tin nhắn đang được chọn
 * @param {boolean}  visible         - Có hiển thị không
 * @param {function} onClose         - Callback đóng sheet
 * @param {string}   currentUserId   - ID người dùng hiện tại
 * @param {array}    reactionTypes   - Danh sách reaction từ server
 * @param {function} onReact         - Callback khi chọn emoji react
 * @param {function} onRevoke        - Callback thu hồi tin nhắn
 * @param {function} onEdit          - Callback chỉnh sửa tin nhắn
 * @param {function} onDelete        - Callback xoá tin nhắn phía tôi
 * @param {function} onForward       - Callback chuyển tiếp tin nhắn
 */
const ActionSheet = ({
  msg,
  visible,
  onClose,
  currentUserId,
  reactionTypes,
  onReact,
  onRevoke,
  onEdit,
  onDelete,
  onForward,
  onReply,
  onPin,
  onUnpin,
  isPinned,
  THEME,
  styles,
}) => {
  if (!msg) return null;

  const isMe = msg.senderId === currentUserId;
  const isRevoked = msg.revoked;

  // Danh sách action với điều kiện hiển thị
  const actions = [
    {
      icon: <Ionicons name="arrow-undo" size={20} color={THEME.textPrimary} />,
      label: 'Trả lời',
      action: 'reply',
      show: true,
    },
    {
      icon: <Feather name="corner-up-right" size={20} color={THEME.textPrimary} />,
      label: 'Chuyển tiếp',
      action: 'forward',
      show: true,
    },
    {
      icon: <Feather name="copy" size={20} color={THEME.textPrimary} />,
      label: 'Sao chép tin nhắn',
      action: 'copy',
      // Chỉ hiện với tin nhắn văn bản chưa thu hồi
      show: msg.type === 'text' && !isRevoked,
    },
    {
      icon: <Feather name="bookmark" size={20} color={isPinned ? '#faa61a' : THEME.textPrimary} />,
      label: isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn',
      action: isPinned ? 'unpin' : 'pin',
      show: !isRevoked,
    },
    {
      icon: <MaterialCommunityIcons name="cancel" size={20} color="#ed4245" />,
      label: 'Thu hồi',
      action: 'revoke',
      danger: true,
      // Chỉ hiện với tin của mình chưa thu hồi
      show: isMe && !isRevoked,
    },
    {
      icon: <Feather name="edit-2" size={20} color={THEME.textPrimary} />,
      label: 'Chỉnh sửa',
      action: 'edit',
      // Chỉ hiện với tin văn bản của mình chưa thu hồi
      show: isMe && !isRevoked && msg.type === 'text',
    },
    {
      icon: <Feather name="trash-2" size={20} color="#ed4245" />,
      label: 'Xóa tin nhắn',
      action: 'delete',
      danger: true,
      show: true,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          {/* Hàng emoji react (ẩn khi tin đã thu hồi) */}
          {!isRevoked && (
            <View style={styles.reactRow}>
              {(reactionTypes.length > 0
                ? reactionTypes
                : [
                    { emoji: '👍' },
                    { emoji: '❤️' },
                    { emoji: '😂' },
                    { emoji: '😮' },
                    { emoji: '😢' },
                    { emoji: '🔥' },
                  ]
              ).map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  onPress={() => { onReact(msg, r.emoji); onClose(); }}
                  style={styles.reactBtn}
                >
                  <Text style={styles.reactEmoji}>{r.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Các action */}
          {actions
            .filter((a) => a.show)
            .map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={() => {
                  if (a.action === 'revoke') onRevoke(msg);
                  if (a.action === 'reply') onReply(msg);
                  if (a.action === 'edit') onEdit(msg);
                  if (a.action === 'delete') onDelete(msg);
                  if (a.action === 'forward') onForward(msg);
                  if (a.action === 'pin') onPin(msg);
                  if (a.action === 'unpin') onUnpin(msg._id || msg.id);
                  onClose();
                }}
                style={styles.sheetAction}
              >
                {a.icon}
                <Text style={[styles.sheetActionLabel, a.danger && { color: THEME.danger }]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </Pressable>
    </Modal>
  );
};

export default ActionSheet;