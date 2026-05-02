import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { usePresence } from '../../../context/PresenceContext';
import { THEME } from '../../../theme';
import { getSessions, logoutSession, logoutAllOthers } from '../../../services/sessionService';
import DeviceDetailSheet from '../components/DeviceDetailSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DeviceManagementScreen({ navigation }) {
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sessions, setSessions] = useState({ current: null, others: [], history: [] });
    const [selectedSession, setSelectedSession] = useState(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const fetchSessions = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await getSessions();
            setSessions(data);
            
            // Lấy currentSessionId từ token/storage nếu cần đối soát thêm
            const storedSid = await AsyncStorage.getItem('sessionId');
            setCurrentSessionId(storedSid);
        } catch (error) {
            console.warn('[DeviceManagement] Fetch error:', error.message || error);
            Alert.alert(t('common.error'), t('common.something_wrong'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [t]);

    const { sessionUpdateCounter } = usePresence();

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions, sessionUpdateCounter]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSessions(false);
    };

    const handleLogoutSession = async (session) => {
        Alert.alert(
            t('profile.devices.logout_this_confirm'),
            `${session.deviceName}\n${session.location}`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.devices.logout_btn'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logoutSession(session.sessionId);
                            setDetailVisible(false);
                            fetchSessions(false);
                        } catch (error) {
                            Alert.alert(t('common.error'), t('common.something_wrong'));
                        }
                    }
                }
            ]
        );
    };

    const handleLogoutAllOthers = () => {
        Alert.alert(
            t('profile.devices.logout_all'),
            t('profile.devices.logout_all_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.devices.logout_all'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const mySid = await AsyncStorage.getItem('sessionId');
                            if (!mySid) {
                                Alert.alert(t('common.error'), 'Không thể xác định phiên bản hiện tại. Vui lòng thử lại sau.');
                                return;
                            }
                            await logoutAllOthers({ currentSessionId: mySid });
                            fetchSessions(false);
                        } catch (error) {
                            Alert.alert(t('common.error'), t('common.something_wrong'));
                        }
                    }
                }
            ]
        );
    };

    const openDetail = (session) => {
        setSelectedSession(session);
        setDetailVisible(true);
    };

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

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const now = new Date();
        const past = new Date(dateStr);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('profile.devices.just_now');
        if (diffMins < 60) return t('profile.devices.minutes_ago', { count: diffMins });
        if (diffHours < 24) return t('profile.devices.hours_ago', { count: diffHours });
        return t('profile.devices.days_ago', { count: diffDays });
    };

    const renderDeviceItem = (session, isCurrent = false) => (
        <TouchableOpacity
            key={session.sessionId}
            style={[styles.deviceItem, isCurrent && styles.currentDeviceItem]}
            onPress={() => openDetail(session)}
        >
            <View style={styles.deviceIconBox}>
                <Text style={styles.deviceIcon}>{getDeviceIcon(session.platform)}</Text>
            </View>
            <View style={styles.deviceInfo}>
                <View style={styles.deviceHeader}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                        {session.deviceName}
                    </Text>
                    {isCurrent && (
                        <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>{t('profile.devices.this_device')}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.deviceSub} numberOfLines={1}>
                    {session.location} • {formatTime(session.lastActiveAt)}
                </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={THEME.accent} size="large" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.bgSecondary} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.devices.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.accent} />
                }
            >
                {/* SECTION 1: CURRENT DEVICE */}
                <Text style={styles.sectionTitle}>{t('profile.devices.this_device').toUpperCase()}</Text>
                {sessions.current ? renderDeviceItem(sessions.current, true) : (
                    <Text style={styles.emptyText}>Đang cập nhật...</Text>
                )}

                {/* SECTION 2: OTHER ACTIVE DEVICES */}
                {sessions.others.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('profile.devices.other_devices').toUpperCase()}</Text>
                            <TouchableOpacity onPress={handleLogoutAllOthers}>
                                <Text style={styles.logoutAllText}>{t('profile.devices.logout_all')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.card}>
                            {sessions.others.map((s, idx) => (
                                <React.Fragment key={s.sessionId}>
                                    {renderDeviceItem(s)}
                                    {idx < sessions.others.length - 1 && <View style={styles.divider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </>
                )}

                {/* SECTION 3: HISTORY */}
                {sessions.history.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>{t('profile.devices.history').toUpperCase()}</Text>
                        <View style={styles.card}>
                            {sessions.history.map((s, idx) => (
                                <React.Fragment key={s.sessionId}>
                                    <View style={[styles.deviceItem, styles.historyItem]}>
                                        <View style={[styles.deviceIconBox, { backgroundColor: THEME.bgInput }]}>
                                            <Text style={[styles.deviceIcon, { opacity: 0.5 }]}>{getDeviceIcon(s.platform)}</Text>
                                        </View>
                                        <View style={styles.deviceInfo}>
                                            <Text style={[styles.deviceName, { color: THEME.textMuted }]}>{s.deviceName}</Text>
                                            <Text style={styles.deviceSub}>{s.location} • {formatTime(s.updatedAt)}</Text>
                                        </View>
                                    </View>
                                    {idx < sessions.history.length - 1 && <View style={styles.divider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <DeviceDetailSheet
                visible={detailVisible}
                onClose={() => setDetailVisible(false)}
                session={selectedSession}
                isCurrent={selectedSession?.sessionId === sessions.current?.sessionId}
                onLogout={() => handleLogoutSession(selectedSession)}
                t={t}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bgPrimary },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgPrimary },
    loadingText: { color: THEME.textMuted, marginTop: 12 },
    
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        backgroundColor: THEME.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    backBtnText: { fontSize: 32, color: THEME.textPrimary, fontWeight: '300' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary },

    content: { flex: 1, padding: 16 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: THEME.textMuted,
        marginBottom: 10,
        marginTop: 12,
        letterSpacing: 0.5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    logoutAllText: { color: THEME.accent, fontSize: 12, fontWeight: '600' },

    card: {
        backgroundColor: THEME.bgSecondary,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: THEME.border,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: THEME.bgSecondary,
    },
    currentDeviceItem: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: THEME.accent + '44',
        backgroundColor: THEME.accent + '08',
        marginBottom: 10,
    },
    historyItem: { opacity: 0.8 },
    deviceIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: THEME.bgInput,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    deviceIcon: { fontSize: 22 },
    deviceInfo: { flex: 1 },
    deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    deviceName: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
    deviceSub: { fontSize: 12, color: THEME.textMuted },
    currentBadge: {
        backgroundColor: THEME.statusOnline + '22',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    currentBadgeText: { fontSize: 10, fontWeight: '800', color: THEME.statusOnline },
    arrow: { fontSize: 24, color: THEME.textMuted, marginLeft: 8, fontWeight: '300' },
    divider: { height: 1, backgroundColor: THEME.border, marginLeft: 72 },
    emptyText: { color: THEME.textMuted, textAlign: 'center', padding: 20, fontStyle: 'italic' },
});
