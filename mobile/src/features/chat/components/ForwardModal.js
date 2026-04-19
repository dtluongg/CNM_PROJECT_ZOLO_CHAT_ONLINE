import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, Modal, Alert, Platform, Image,
} from 'react-native';
import Avatar from './Avatar';
import conversationApi from '../api/conversationApi';
import messageApi from '../api/messageApi';

/**
 * Modal chuyển tiếp tin nhắn sang một hoặc nhiều cuộc trò chuyện khác.
 * Hiển thị danh sách tất cả cuộc hội thoại, cho phép tìm kiếm và chọn nhiều.
 *
 * @param {boolean}  isOpen  - Có hiển thị không
 * @param {function} onClose - Callback đóng modal
 * @param {object}   msg     - Tin nhắn cần chuyển tiếp
 */
const ForwardModal = ({ isOpen, onClose, msg, THEME, styles }) => {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Tải danh sách cuộc trò chuyện khi mở modal
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      conversationApi
        .listMyConversations()
        .then((res) => setConversations(res.data.data || []))
        .catch((err) => console.error('listMyConversations error:', err))
        .finally(() => setLoading(false));
    } else {
      // Reset state khi đóng
      setSearch('');
      setSelectedIds([]);
      setSending(false);
    }
  }, [isOpen]);

  // Lọc danh sách theo từ khoá tìm kiếm
  const filtered = conversations.filter((c) => {
    const name = c.type === 'dm' ? c.otherUser?.displayName : c.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  // Toggle chọn / bỏ chọn cuộc hội thoại
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Gửi tin nhắn đến các cuộc hội thoại đã chọn
  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      for (const convId of selectedIds) {
        await messageApi.forwardMessage(convId, msg._id || msg.id);
      }
      onClose();
      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn');
    } catch (err) {
      console.error('Forward error:', err);
      Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false}>
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.bgTertiary,
          paddingTop: Platform.OS === 'ios' ? 50 : 10,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: THEME.bgSecondary,
            borderBottomWidth: 1,
            borderBottomColor: THEME.border,
          }}
        >
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary }}>
            Chuyển tiếp
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 24, color: THEME.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Ô tìm kiếm */}
        <View style={{ padding: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: THEME.bgInput,
              borderRadius: 10,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 18 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, padding: 10, color: THEME.textPrimary }}
              placeholder="Tìm kiếm người hoặc nhóm..."
              placeholderTextColor={THEME.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Danh sách cuộc hội thoại */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const name = item.type === 'dm' ? item.otherUser?.displayName : item.name;
            const avatar = item.type === 'dm' ? item.otherUser?.avatar : item.avatar;
            const isSelected = selectedIds.includes(item._id);

            return (
              <TouchableOpacity
                onPress={() => toggleSelect(item._id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  gap: 12,
                  backgroundColor: isSelected ? THEME.bgHover : 'transparent',
                }}
              >
                <Avatar name={name} avatar={avatar} size={44} THEME={THEME} styles={styles} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: THEME.textPrimary }}>
                    {name}
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.textMuted }}>
                    {item.type === 'dm' ? 'Cá nhân' : `${item.totalMembers || 0} thành viên`}
                  </Text>
                </View>

                {/* Checkbox */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isSelected ? THEME.accent : THEME.border,
                    backgroundColor: isSelected ? THEME.accent : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {isSelected && <Text style={{ color: '#fff', fontSize: 14 }}>✔️</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: THEME.textMuted }}>
              Không tìm thấy kết quả
            </Text>
          }
        />

        {/* Footer: nút gửi */}
        <View
          style={{
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: THEME.border,
            backgroundColor: THEME.bgSecondary,
          }}
        >
          <TouchableOpacity
            disabled={selectedIds.length === 0 || sending}
            onPress={handleSend}
            style={{
              backgroundColor: selectedIds.length > 0 ? THEME.accent : THEME.border,
              padding: 14,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {sending
                ? 'Đang gửi...'
                : `Chuyển tiếp${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ForwardModal;