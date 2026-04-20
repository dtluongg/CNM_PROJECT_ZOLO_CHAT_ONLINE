import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, Modal, Dimensions, Image, 
    TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, 
    Platform, ActivityIndicator, Alert, Pressable, Animated
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import storiesApi from '../api/storiesApi';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function StoryViewerModal({ visible, user: storyUser, stories, startIndex = 0, onClose, onDeleteSuccess }) {
    const { user: currentUser } = useAuth();
    const { theme: THEME } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [viewersData, setViewersData] = useState({ viewers: [], totalViews: 0, totalHearts: 0 });
    const [showViewersList, setShowViewersList] = useState(false);
    const [showHeartAnim, setShowHeartAnim] = useState(false);
    const heartAnimValue = useRef(new Animated.Value(0)).current;
    
    const progress = useRef(0);
    const timerRef = useRef(null);
    const story = stories[currentIndex];
    const isMyStory = storyUser && currentUser && (
        (storyUser._id || storyUser.id)?.toString() === (currentUser._id || currentUser.id)?.toString()
    );

    useEffect(() => {
        if (visible && story) {
            if (!isMyStory) {
                storiesApi.markViewed(story._id || story.id).catch(() => {});
            } else {
                fetchViewers();
            }
            resetStoryTimer();
        }
        return () => clearInterval(timerRef.current);
    }, [visible, currentIndex]);

    const fetchViewers = async () => {
        try {
            const res = await storiesApi.getStoryViewers(story._id || story.id);
            setViewersData(res.data);
        } catch (err) {
            console.error('Fetch viewers error:', err);
        }
    };

    const resetStoryTimer = () => {
        clearInterval(timerRef.current);
        progress.current = 0;
        setLoading(true);
        timerRef.current = setInterval(() => {
            progress.current += 1;
            if (progress.current >= 100) {
                handleNext();
            }
        }, 50); // 5 seconds per story
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleDelete = async () => {
        Alert.alert('Xóa tin', 'Bạn có chắc muốn xóa tin này không?', [
            { text: 'Hủy', style: 'cancel' },
            { 
                text: 'Xóa', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await storiesApi.deleteStory(story._id || story.id);
                        onDeleteSuccess && onDeleteSuccess();
                        handleNext();
                    } catch (err) {
                        Alert.alert('Lỗi', 'Không thể xóa tin.');
                    }
                }
            }
        ]);
    };

    const triggerHeartAnimation = () => {
        setShowHeartAnim(true);
        heartAnimValue.setValue(0);
        
        Animated.sequence([
            Animated.spring(heartAnimValue, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
            Animated.timing(heartAnimValue, {
                toValue: 2, // Scale up more while fading
                duration: 500,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowHeartAnim(false);
            heartAnimValue.setValue(0);
        });
    };

    const handleReply = async (isHeart = false) => {
        if (!replyText.trim() && !isHeart) return;
        setSending(true);
        try {
            await storiesApi.replyToStory(story._id || story.id, replyText, isHeart);
            setReplyText('');
            if (isHeart) {
                // Thả tim visual animation thay vì Alert
                triggerHeartAnimation();
            } else {
                Alert.alert('Thành công', 'Đã gửi phản hồi!');
            }
        } catch (err) {
            Alert.alert('Lỗi', 'Gửi phản hồi thất bại.');
        } finally {
            setSending(false);
        }
    };

    if (!visible || !story) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Media */}
                <View style={styles.mediaContainer}>
                    {story.mediaType === 'video' ? (
                        <Video
                            source={{ uri: story.mediaUrl }}
                            style={styles.media}
                            resizeMode="contain"
                            shouldPlay={visible}
                            isMuted={false}
                            onLoad={() => setLoading(false)}
                        />
                    ) : (
                        <Image 
                            source={{ uri: story.mediaUrl }} 
                            style={styles.media} 
                            resizeMode="contain"
                            onLoad={() => setLoading(false)}
                        />
                    )}
                    {loading && (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    )}

                    {showHeartAnim && (
                        <Animated.View style={[
                            styles.mainHeartArea,
                            {
                                opacity: heartAnimValue.interpolate({
                                    inputRange: [0, 1, 2],
                                    outputRange: [0, 1, 0]
                                }),
                                transform: [{
                                    scale: heartAnimValue.interpolate({
                                        inputRange: [0, 1, 2],
                                        outputRange: [0.5, 1.5, 2]
                                    })
                                }]
                            }
                        ]}>
                            <Ionicons name="heart" size={120} color="#ed4245" />
                        </Animated.View>
                    )}
                </View>

                {/* Touch Overlay for Navigation */}
                <View style={styles.touchOverlay}>
                    <TouchableOpacity style={styles.touchHalf} onPress={handlePrev} />
                    <TouchableOpacity style={styles.touchHalf} onPress={handleNext} />
                </View>

                {/* Progress Bars */}
                <SafeAreaView style={styles.topControls}>
                    <View style={styles.progressRow}>
                        {stories.map((_, index) => (
                            <View key={index} style={[styles.progressBar, { flex: 1 }]}>
                                <View style={[
                                    styles.progressFill, 
                                    { width: index < currentIndex ? '100%' : (index === currentIndex ? `${progress.current}%` : '0%') }
                                ]} />
                            </View>
                        ))}
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Image source={{ uri: storyUser.avatar || 'https://via.placeholder.com/150' }} style={styles.userAvatar} />
                            <View>
                                <Text style={styles.userName}>{storyUser.displayName}</Text>
                                <Text style={styles.timeText}>{new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            {isMyStory && (
                                <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                                    <Feather name="trash-2" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                                <Feather name="x" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>

                {/* Footer / Reply or Viewers */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.footer}
                >
                    {isMyStory ? (
                        <TouchableOpacity 
                            style={styles.viewerSummary} 
                            onPress={() => setShowViewersList(true)}
                        >
                            <View style={styles.viewerAvatars}>
                                {viewersData.viewers.slice(0, 3).map((v, i) => (
                                    <View key={v.userId?._id || i} style={[styles.miniAvatarContainer, { marginLeft: i > 0 ? -12 : 0, zIndex: 10 - i }]}>
                                        <Image source={{ uri: v.userId?.avatar || 'https://via.placeholder.com/150' }} style={styles.miniAvatar} />
                                    </View>
                                ))}
                                {viewersData.totalViews > 3 && (
                                    <View style={[styles.miniAvatarPlaceholder, { marginLeft: -12, zIndex: 0 }]}>
                                        <Text style={styles.plusCount}>+{viewersData.totalViews - 3}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.viewerText}>
                                {viewersData.totalViews} người xem • {viewersData.totalHearts} ❤️
                            </Text>
                            <Feather name="chevron-up" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.replyRow}>
                            <TextInput
                                style={styles.input}
                                placeholder={`Phản hồi ${storyUser?.displayName || 'tin'}...`}
                                placeholderTextColor="rgba(255,255,255,0.6)"
                                value={replyText}
                                onChangeText={setReplyText}
                            />
                            {replyText.trim() ? (
                                <TouchableOpacity onPress={() => handleReply(false)} disabled={sending}>
                                    <Feather name="send" size={24} color="#fff" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => handleReply(true)} disabled={sending}>
                                    <Feather name="heart" size={28} color="#ed4245" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </KeyboardAvoidingView>

                {/* Viewers Detailed List Overlay */}
                {showViewersList && (
                    <Modal visible={showViewersList} animationType="slide" transparent>
                        <View style={styles.viewerModalContainer}>
                            <Pressable style={styles.modalOverlay} onPress={() => setShowViewersList(false)} />
                            <View style={[styles.viewerContent, { backgroundColor: THEME.bgSecondary }]}>
                                <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
                                    <Text style={[styles.modalTitle, { color: THEME.textPrimary }]}>Người đã xem</Text>
                                    <TouchableOpacity onPress={() => setShowViewersList(false)}>
                                        <Feather name="x" size={24} color={THEME.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.viewerList}>
                                    {viewersData.viewers.length > 0 ? (
                                        viewersData.viewers.map((v) => (
                                            <View key={v.userId?._id} style={styles.viewerItem}>
                                                <Image source={{ uri: v.userId?.avatar || 'https://via.placeholder.com/150' }} style={styles.listAvatar} />
                                                <View style={styles.viewerInfo}>
                                                    <Text style={[styles.listName, { color: THEME.textPrimary }]}>{v.userId?.displayName || 'Người dùng'}</Text>
                                                    <Text style={[styles.listTime, { color: THEME.textMuted }]}>
                                                        {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                                {v.hasHeart && <Feather name="heart" size={20} color="#ed4245" fill="#ed4245" />}
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyViewers}>
                                            <Text style={{ color: THEME.textMuted }}>Chưa có lượt xem nào.</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainHeartArea: {
        position: 'absolute',
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: { width, height: height * 0.8 },
    loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    touchOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 1 },
    touchHalf: { flex: 1 },
    topControls: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingHorizontal: 10 },
    progressRow: { flexDirection: 'row', gap: 4, height: 2, marginTop: 10, marginBottom: 15 },
    progressBar: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
    progressFill: { height: 2, backgroundColor: '#fff', borderRadius: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    userAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#fff' },
    userName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconBtn: { padding: 5 },
    footer: { position: 'absolute', bottom: 30, left: 0, right: 0, zIndex: 3, paddingHorizontal: 20 },
    replyRow: { 
        flexDirection: 'row', alignItems: 'center', gap: 15, 
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25, 
        paddingHorizontal: 15, paddingVertical: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
    },
    input: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },
    viewerSummary: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 20
    },
    viewerAvatars: { flexDirection: 'row', alignItems: 'center' },
    miniAvatarContainer: { 
        width: 24, height: 24, borderRadius: 12, 
        borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden' 
    },
    miniAvatar: { width: '100%', height: '100%' },
    miniAvatarPlaceholder: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#fff'
    },
    plusCount: { color: '#fff', fontSize: 8, fontWeight: '700' },
    viewerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
    viewerModalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    viewerContent: { height: height * 0.5, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { 
        flexDirection: 'row', justifyContent: 'space-between', 
        alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1 
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    viewerList: { flex: 1 },
    viewerItem: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
    listAvatar: { width: 44, height: 44, borderRadius: 22 },
    viewerInfo: { flex: 1 },
    listName: { fontSize: 15, fontWeight: '600' },
    listTime: { fontSize: 12 },
    emptyViewers: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
