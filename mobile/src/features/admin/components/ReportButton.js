import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal, TextInput,
    StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import apiClient from '../../../services/apiClient';

const REASONS = [
    { value: 'spam',           label: 'Spam' },
    { value: 'harassment',     label: 'Quấy rối' },
    { value: 'hate_speech',    label: 'Ngôn từ thù địch' },
    { value: 'violence',       label: 'Bạo lực' },
    { value: 'sexual_content', label: 'Nội dung không phù hợp' },
    { value: 'fake_account',   label: 'Tài khoản giả mạo' },
    { value: 'scam',           label: 'Lừa đảo' },
    { value: 'other',          label: 'Khác' },
];

/**
 * Props: targetType ('user'|'message'|'conversation'), targetId, targetSnapshot (tên hiển thị)
 */
export default function ReportButton({ targetType, targetId, targetSnapshot, style }) {
    const { token } = useAuth();
    const { THEME } = useTheme();
    const s = makeStyles(THEME);

    const [open, setOpen]     = useState(false);
    const [reason, setReason] = useState('spam');
    const [desc, setDesc]     = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone]     = useState(false);

    const submit = async () => {
        if (!token) return;
        setLoading(true);
        try {
            await apiClient.post('/reports', {
                targetType, targetId, targetSnapshot, reason, description: desc,
            });
            setDone(true);
            setTimeout(() => {
                setOpen(false);
                setDone(false);
                setDesc('');
                setReason('spam');
            }, 1800);
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <TouchableOpacity style={[s.triggerBtn, style]} onPress={() => setOpen(true)} activeOpacity={0.75}>
                <Text style={s.triggerIcon}>🚩</Text>
                <Text style={s.triggerLabel}>Báo cáo</Text>
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
                <View style={s.sheet}>
                    {done ? (
                        <View style={s.doneWrap}>
                            <Text style={s.doneIcon}>✅</Text>
                            <Text style={s.doneTitle}>Đã gửi báo cáo</Text>
                            <Text style={s.doneSub}>Cảm ơn! Chúng tôi sẽ xem xét sớm nhất.</Text>
                        </View>
                    ) : (
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={s.title}>Báo cáo vi phạm</Text>
                            {targetSnapshot ? (
                                <Text style={s.target}>Mục tiêu: <Text style={{ color: THEME?.textPrimary || '#fff' }}>{targetSnapshot}</Text></Text>
                            ) : null}

                            <Text style={s.label}>Lý do</Text>
                            <View style={s.reasonList}>
                                {REASONS.map((r) => (
                                    <TouchableOpacity
                                        key={r.value}
                                        style={[s.reasonChip, reason === r.value && s.reasonChipActive]}
                                        onPress={() => setReason(r.value)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[s.reasonChipText, reason === r.value && s.reasonChipTextActive]}>
                                            {r.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={s.label}>Mô tả thêm (tuỳ chọn)</Text>
                            <TextInput
                                value={desc}
                                onChangeText={setDesc}
                                placeholder="Mô tả chi tiết..."
                                placeholderTextColor={THEME?.textMuted || '#888'}
                                multiline
                                numberOfLines={3}
                                style={s.input}
                            />

                            <View style={s.btnRow}>
                                <TouchableOpacity style={s.cancelBtn} onPress={() => setOpen(false)} activeOpacity={0.75}>
                                    <Text style={s.cancelBtnText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading} activeOpacity={0.82}>
                                    {loading
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={s.submitBtnText}>Gửi báo cáo</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </>
    );
}

const makeStyles = (THEME) => StyleSheet.create({
    triggerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 10, borderWidth: 1,
        borderColor: 'rgba(237,66,69,0.35)',
        backgroundColor: 'rgba(237,66,69,0.08)',
    },
    triggerIcon: { fontSize: 14 },
    triggerLabel: { color: '#ed4245', fontSize: 13, fontWeight: '600' },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
        backgroundColor: THEME?.bgSecondary || '#2b2d31',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, maxHeight: '80%',
    },
    title: { fontSize: 18, fontWeight: '800', color: THEME?.textPrimary || '#fff', marginBottom: 6 },
    target: { fontSize: 13, color: THEME?.textMuted || '#aaa', marginBottom: 16 },
    label: { fontSize: 13, color: THEME?.textMuted || '#aaa', marginBottom: 8, marginTop: 12 },

    reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    reasonChip: {
        paddingVertical: 6, paddingHorizontal: 12,
        borderRadius: 20, borderWidth: 1, borderColor: THEME?.border || '#444',
        backgroundColor: 'transparent',
    },
    reasonChipActive: { backgroundColor: THEME?.accent || '#5865f2', borderColor: THEME?.accent || '#5865f2' },
    reasonChipText: { fontSize: 13, color: THEME?.textMuted || '#aaa' },
    reasonChipTextActive: { color: '#fff', fontWeight: '600' },

    input: {
        borderWidth: 1, borderColor: THEME?.border || '#444',
        borderRadius: 10, padding: 12,
        color: THEME?.textPrimary || '#fff',
        backgroundColor: THEME?.bgPrimary || '#1e1f22',
        fontSize: 14, textAlignVertical: 'top', marginBottom: 4,
    },

    btnRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
    cancelBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 10,
        borderWidth: 1, borderColor: THEME?.border || '#444',
        alignItems: 'center',
    },
    cancelBtnText: { color: THEME?.textMuted || '#aaa', fontSize: 14 },
    submitBtn: {
        flex: 2, paddingVertical: 12, borderRadius: 10,
        backgroundColor: '#ed4245', alignItems: 'center',
    },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    doneWrap: { alignItems: 'center', paddingVertical: 32 },
    doneIcon: { fontSize: 40, marginBottom: 12 },
    doneTitle: { fontSize: 18, fontWeight: '800', color: THEME?.textPrimary || '#fff', marginBottom: 6 },
    doneSub: { fontSize: 13, color: THEME?.textMuted || '#aaa', textAlign: 'center' },
});