import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, Modal, Dimensions, Image, 
    TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, 
    Platform, ActivityIndicator, Alert 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
    
    const progress = useRef(0);
    const timerRef = useRef(null);
    const story = stories[currentIndex];
    const isMyStory = storyUser._id === currentUser?._id;

    useEffect(() => {
        if (visible && story) {
            storiesApi.markViewed(story._id || story.id).catch(() => {});
            resetStoryTimer();
        }
        return () => clearInterval(timerRef.current);
    }, [visible, currentIndex]);

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

    const handleReply = async (isHeart = false) => {
        if (!replyText.trim() && !isHeart) return;
        setSending(true);
        try {
            await storiesApi.replyToStory(story._id || story.id, replyText, isHeart);
            setReplyText('');
            if (!isHeart) Alert.alert('Thành công', 'Đã gửi phản hồi!');
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

                {/* Footer / Reply */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.footer}
                >
                    <View style={styles.replyRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Gửi tin nhắn..."
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
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    mediaContainer: { flex: 1, justifyContent: 'center' },
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
    input: { flex: 1, color: '#fff', fontSize: 15, padding: 0 }
});
