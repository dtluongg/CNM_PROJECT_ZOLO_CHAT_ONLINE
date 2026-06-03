import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

const SUPPORT_EMAIL = 'support@zolochat.com';

export default function BannedScreen() {
    const { user, logout } = useAuth();
    const { THEME } = useTheme();
    const s = makeStyles(THEME);

    const handleContact = () => {
        Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Khiếu nại khóa tài khoản ZoloChat&body=Tên tài khoản: ${user?.displayName || ''}\nEmail: ${user?.email || ''}\n\nLý do khiếu nại:`);
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={s.iconWrap}>
                    <Text style={s.iconText}>🔒</Text>
                </View>

                <Text style={s.title}>Tài khoản bị khóa</Text>
                <Text style={s.subtitle}>
                    Tài khoản của bạn đã bị khóa bởi đội ngũ quản trị ZoloChat.
                </Text>

                {/* Reason box */}
                {user?.bannedReason ? (
                    <View style={s.reasonBox}>
                        <Text style={s.reasonLabel}>LÝ DO</Text>
                        <Text style={s.reasonText}>{user.bannedReason}</Text>
                    </View>
                ) : null}

                <Text style={s.helpText}>
                    Nếu bạn cho rằng đây là nhầm lẫn hoặc muốn khiếu nại, hãy liên hệ đội ngũ hỗ trợ:
                </Text>

                <TouchableOpacity style={s.contactBtn} onPress={handleContact} activeOpacity={0.82}>
                    <Text style={s.contactBtnText}>✉️  Liên hệ hỗ trợ</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.75}>
                    <Text style={s.logoutBtnText}>Đăng xuất</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (THEME) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: THEME?.bgPrimary || '#1e1f22' },
    container: {
        flexGrow: 1, alignItems: 'center', justifyContent: 'center',
        padding: 32,
    },
    iconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(237,66,69,0.15)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
    },
    iconText: { fontSize: 36 },
    title: {
        fontSize: 22, fontWeight: '800',
        color: THEME?.textPrimary || '#fff',
        marginBottom: 10, textAlign: 'center',
    },
    subtitle: {
        fontSize: 14, color: THEME?.textMuted || '#aaa',
        textAlign: 'center', lineHeight: 22, marginBottom: 24,
    },
    reasonBox: {
        backgroundColor: 'rgba(237,66,69,0.1)',
        borderLeftWidth: 4, borderLeftColor: '#ed4245',
        borderRadius: 8, padding: 16,
        width: '100%', marginBottom: 24,
    },
    reasonLabel: {
        fontSize: 10, fontWeight: '700', color: '#ed4245',
        letterSpacing: 1, marginBottom: 4,
    },
    reasonText: {
        fontSize: 14, color: THEME?.textPrimary || '#fff', fontWeight: '600',
    },
    helpText: {
        fontSize: 13, color: THEME?.textMuted || '#aaa',
        textAlign: 'center', lineHeight: 20, marginBottom: 20,
    },
    contactBtn: {
        backgroundColor: THEME?.accent || '#5865f2',
        borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32,
        width: '100%', alignItems: 'center', marginBottom: 12,
    },
    contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    logoutBtn: {
        borderWidth: 1, borderColor: THEME?.border || '#333',
        borderRadius: 12, paddingVertical: 11, paddingHorizontal: 32,
        width: '100%', alignItems: 'center',
    },
    logoutBtnText: { color: THEME?.textMuted || '#aaa', fontSize: 14 },
});