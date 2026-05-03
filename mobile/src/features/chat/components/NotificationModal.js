import React from 'react';
import {
    Modal, Pressable, View, Text, TouchableOpacity,
    ActivityIndicator, FlatList, Image
} from 'react-native';
import { useNotifications } from '../../../context/NotificationContext';
import { getAvatarColor, getInitials } from '../../../theme';

// Hàm định dạng thời gian thu gọn
const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// Component Avatar dùng riêng cho Thông báo
const NotificationAvatar = ({ name, avatar, THEME }) => {
    const size = 46; // Tăng nhẹ kích thước để nhìn rõ icon phân loại
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: getAvatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
            {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: size, height: size }} />
            ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>
                    {getInitials(name)}
                </Text>
            )}
        </View>
    );
};

// 1. NHẬN THÊM BIẾN `navigation` VÀO ĐÂY
export default function NotificationModal({ visible, onClose, THEME, styles, navigation }) {
    // Lấy dữ liệu từ Context thông báo
    const { notifications, unreadCount, markAsRead, loading } = useNotifications();

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.modalBox, { maxHeight: '85%', height: '85%', paddingBottom: 20 }]} onPress={() => { }}>
                    {/* Thanh cầm kéo (tay cầm của modal) */}
                    <View style={styles.modalHandle} />

                    {/* Tiêu đề và nút Đánh dấu đã đọc */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Thông báo</Text>
                        {unreadCount > 0 && (
                            <TouchableOpacity onPress={() => markAsRead('all')}>
                                <Text style={{ color: THEME.accent, fontSize: 13, fontWeight: '600' }}>Đánh dấu đã đọc</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Danh sách thông báo */}
                    {loading ? (
                        <ActivityIndicator color={THEME.accent} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={item => item._id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                // 2. BÓC TÁCH DỮ LIỆU TỪ BACKEND
                                // Lấy thông tin người gửi an toàn
                                const actor = item.actorId || {};
                                const actorName = actor.displayName || actor.username || 'Ai đó';
                                const actorAvatar = actor.avatar || null;

                                // Lấy tiêu đề và nội dung
                                const title = item.title || '';
                                const bodyText = item.body || item.content || '';
                                const isMention = item.type === 'mention';

                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Đánh dấu đã đọc nếu chưa đọc
                                            if (!item.isRead) markAsRead(item._id);
                                            // Tạm thời đóng modal khi bấm vào
                                            onClose();

                                            // 3. LOGIC CHUYỂN HƯỚNG VÀO TIN NHẮN
                                            // Nếu thông báo có gắn ID cuộc trò chuyện thì đưa người dùng tới đó
                                            if (item.conversationId && navigation) {
                                                navigation.navigate('Message', {
                                                    conversation: { id: item.conversationId }
                                                });
                                            }
                                        }}
                                        style={{
                                            flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1,
                                            borderBottomColor: THEME.border, gap: 12,
                                            backgroundColor: item.isRead ? 'transparent' : THEME.accent + '15',
                                            paddingHorizontal: 8, borderRadius: 8, marginBottom: 4
                                        }}
                                    >
                                        {/* Hiển thị Avatar và Icon phân loại nhỏ ở góc */}
                                        <View style={{ position: 'relative' }}>
                                            <NotificationAvatar name={actorName} avatar={actorAvatar} THEME={THEME} />
                                            <View style={{
                                                position: 'absolute', bottom: -2, right: -2,
                                                backgroundColor: isMention ? THEME.danger : THEME.accent,
                                                width: 18, height: 18, borderRadius: 9,
                                                alignItems: 'center', justifyContent: 'center',
                                                borderWidth: 2, borderColor: THEME.bgSecondary
                                            }}>
                                                <Text style={{ fontSize: 9, color: '#fff' }}>{isMention ? '@' : '💬'}</Text>
                                            </View>
                                        </View>

                                        {/* Nội dung thông báo */}
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 14, color: THEME.textPrimary, fontWeight: item.isRead ? '400' : '700', marginBottom: 2 }}>
                                                <Text style={{ fontWeight: '800' }}>{actorName}</Text> {title.replace(actorName, '').trim() || 'có tương tác mới'}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: THEME.textMuted }} numberOfLines={2}>
                                                {bodyText}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: THEME.accent, marginTop: 4, fontWeight: '600' }}>
                                                {formatTime(item.createdAt)}
                                            </Text>
                                        </View>

                                        {/* Dấu chấm báo chưa đọc */}
                                        {!item.isRead && (
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.accent, alignSelf: 'center' }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={{ color: THEME.textMuted, textAlign: 'center', marginTop: 40 }}>
                                    Không có thông báo nào.
                                </Text>
                            }
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}