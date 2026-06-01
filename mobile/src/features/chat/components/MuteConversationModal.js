import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useNotifications } from '../../../context/NotificationContext';

const calculateMuteUntil = (duration) => {
    if (duration === 'forever') return null;
    const now = new Date();
    if (duration === '15m') now.setMinutes(now.getMinutes() + 15);
    if (duration === '1h') now.setHours(now.getHours() + 1);
    if (duration === '8h') now.setHours(now.getHours() + 8);
    return now.toISOString();
};

const OPTIONS = [
    { value: '15m', label: 'Trong 15 phút' },
    { value: '1h', label: 'Trong 1 giờ' },
    { value: '8h', label: 'Trong 8 giờ' },
    { value: 'forever', label: 'Cho đến khi được mở lại' },
];

export default function MuteConversationModal({ visible, onClose, conversationId, THEME, onSuccess }) {
    const [muteDuration, setMuteDuration] = useState('15m');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { updateConversationSetting } = useNotifications() || {};

    // 1. QUAN TRỌNG: Nếu không mở, không hiển thị gì cả
    if (!visible) return null;

    const handleConfirmMute = async () => {
        setIsSubmitting(true);
        try {
            const muteUntil = calculateMuteUntil(muteDuration);
            if (updateConversationSetting) {
                await updateConversationSetting(conversationId, {
                    isMuted: true,
                    muteUntil: muteUntil
                });
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Lỗi khi tắt thông báo:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // 2. Thay thẻ <Modal> bằng <View> phủ kín màn hình
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                {/* Dùng stopPropagation để nhấn vào hộp thoại không bị tắt modal */}
                <Pressable style={[styles.modalBox, { backgroundColor: THEME.bgSecondary }]} onPress={(e) => e.stopPropagation()}>
                    <Text style={[styles.modalTitle, { color: THEME.textPrimary }]}>Tắt thông báo</Text>
                    <Text style={[styles.modalSubtitle, { color: THEME.textMuted }]}>
                        Bạn sẽ không nhận được thông báo tin nhắn từ hội thoại này.
                    </Text>

                    <View style={styles.optionsContainer}>
                        {OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={styles.optionRow}
                                onPress={() => setMuteDuration(option.value)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.radioOuter, { borderColor: muteDuration === option.value ? THEME.accent : THEME.textMuted }]}>
                                    {muteDuration === option.value && (
                                        <View style={[styles.radioInner, { backgroundColor: THEME.accent }]} />
                                    )}
                                </View>
                                <Text style={[styles.optionText, { color: THEME.textPrimary }]}>{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: THEME.bgHover }]} onPress={onClose} disabled={isSubmitting}>
                            <Text style={[styles.btnText, { color: THEME.textSecondary }]}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: THEME.danger }]} onPress={handleConfirmMute} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={[styles.btnText, { color: '#fff' }]}>Tắt thông báo</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { width: '100%', borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    modalSubtitle: { fontSize: 13, marginBottom: 20 },
    optionsContainer: { marginBottom: 24, gap: 16 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    optionText: { fontSize: 15, fontWeight: '500' },
    buttonRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
    btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    btnText: { fontWeight: '600', fontSize: 14 }
});