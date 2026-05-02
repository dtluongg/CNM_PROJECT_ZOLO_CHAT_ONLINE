import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Dimensions,
} from 'react-native';
import { THEME } from '../../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DeviceDetailSheet({ visible, onClose, session, isCurrent, onLogout, t }) {
    if (!session) return null;

    const getDeviceIcon = (platform) => {
        switch (platform) {
            case 'iOS': return '📱';
            case 'Android': return '🤖';
            case 'Windows': return '💻';
            case 'macOS': return '🖥️';
            case 'Web': return '🌐';
            default: return '❓';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('profile.devices.detail_title')}</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.mainInfo}>
                            <View style={styles.iconBox}>
                                <Text style={styles.icon}>{getDeviceIcon(session.platform)}</Text>
                            </View>
                            <Text style={styles.deviceName}>{session.deviceName}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: session.isActive ? THEME.statusOnline + '22' : THEME.textMuted + '22' }]}>
                                <View style={[styles.statusDot, { backgroundColor: session.isActive ? THEME.statusOnline : THEME.textMuted }]} />
                                <Text style={[styles.statusText, { color: session.isActive ? THEME.statusOnline : THEME.textMuted }]}>
                                    {session.isActive ? t('chat.online') : t('chat.offline')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <InfoRow label={t('profile.devices.login_time')} value={formatDate(session.createdAt)} />
                            <InfoRow label={t('profile.devices.last_active')} value={formatDate(session.lastActiveAt)} />
                            <InfoRow label={t('profile.devices.location')} value={session.location} />
                            <InfoRow label={t('profile.devices.ip_address')} value={session.ipAddress} />
                            <InfoRow 
                                label={t('profile.devices.method')} 
                                value={t(`profile.devices.methods.${session.loginMethod || 'password'}`)} 
                            />
                        </View>

                        {!isCurrent && session.isActive && (
                            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                                <Text style={styles.logoutBtnText}>{t('profile.devices.logout_btn')}</Text>
                            </TouchableOpacity>
                        )}
                        
                        {isCurrent && (
                            <View style={styles.thisDeviceHint}>
                                <Text style={styles.thisDeviceHintText}>
                                    ✨ {t('profile.devices.this_device')}
                                </Text>
                            </View>
                        )}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: THEME.bgSecondary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 40,
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: THEME.textMuted + '44',
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    title: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary },
    closeBtn: {
        position: 'absolute',
        right: 0,
        backgroundColor: THEME.bgInput,
        padding: 6,
        borderRadius: 20,
    },
    closeBtnText: { color: THEME.textMuted, fontSize: 16 },

    content: { alignItems: 'center' },
    mainInfo: { alignItems: 'center', marginBottom: 24 },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: THEME.bgInput,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: { fontSize: 40 },
    deviceName: { fontSize: 22, fontWeight: '800', color: THEME.textPrimary, marginBottom: 8 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '700' },

    infoCard: {
        width: '100%',
        backgroundColor: THEME.bgInput,
        borderRadius: 16,
        padding: 16,
        gap: 16,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: { fontSize: 13, color: THEME.textMuted, fontWeight: '500' },
    infoValue: { fontSize: 14, color: THEME.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 20 },

    logoutBtn: {
        width: '100%',
        paddingVertical: 16,
        backgroundColor: (THEME.danger || '#ed4245') + '18',
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: (THEME.danger || '#ed4245') + '33',
    },
    logoutBtnText: { color: THEME.danger || '#ed4245', fontWeight: '800', fontSize: 16 },

    thisDeviceHint: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: THEME.accent + '15',
        borderRadius: 12,
    },
    thisDeviceHintText: { color: THEME.accent, fontWeight: '700', fontSize: 14 },
});
