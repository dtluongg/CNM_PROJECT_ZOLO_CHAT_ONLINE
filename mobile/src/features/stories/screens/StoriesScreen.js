import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    Image, RefreshControl, ActivityIndicator, Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import storiesApi from '../api/storiesApi';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import StoryCard from '../components/StoryCard';
import StoryViewerModal from '../components/StoryViewerModal';
import { uploadToSupabase } from '../../../services/storageUpload';

export default function StoriesScreen() {
    const { user } = useAuth();
    const { theme: THEME } = useTheme();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeViewer, setActiveViewer] = useState(null);

    const fetchFeed = useCallback(async () => {
        try {
            const res = await storiesApi.getFeed();
            setFeed(res.data.feed || []);
        } catch (err) {
            console.error('Fetch stories feed error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFeed();
    };

    const handlePickMedia = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để đăng tin.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            handleUpload(asset);
        }
    };

    const handleUpload = async (asset) => {
        setUploading(true);
        try {
            const mediaType = asset.type === 'video' ? 'video' : 'image';
            const fileName = `story_${Date.now()}_${user._id}.${asset.uri.split('.').pop()}`;
            
            // Re-use existing upload logic
            const publicUrl = await uploadToSupabase(asset.uri, fileName, 'stories');
            
            if (publicUrl) {
                await storiesApi.createStory(publicUrl, mediaType);
                fetchFeed();
                Alert.alert('Thành công', 'Tin của bạn đã được đăng!');
            }
        } catch (err) {
            console.error('Upload story error:', err);
            Alert.alert('Lỗi', 'Không thể tải tin lên lúc này.');
        } finally {
            setUploading(false);
        }
    };

    const myFeedItem = feed.find(item => item.user._id === user?._id);
    const friendsFeed = feed.filter(item => item.user._id !== user?._id);

    if (loading && !refreshing) {
        return (
            <View style={[styles.center, { backgroundColor: THEME.bgPrimary }]}>
                <ActivityIndicator size="large" color={THEME.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: THEME.bgPrimary }]}>
            <View style={[styles.header, { backgroundColor: THEME.bgSecondary, borderBottomColor: THEME.border }]}>
                <Text style={[styles.headerTitle, { color: THEME.textPrimary }]}>Tin mới</Text>
                {uploading && <ActivityIndicator size="small" color={THEME.accent} style={{ marginRight: 10 }} />}
                <TouchableOpacity onPress={handlePickMedia} disabled={uploading}>
                    <Feather name="camera" size={24} color={THEME.accent} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={feed}
                keyExtractor={(item) => item.user._id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />
                }
                renderItem={({ item }) => (
                    <StoryCard 
                        user={item.user} 
                        stories={item.stories} 
                        isMe={item.user._id === user?._id}
                        onPress={() => setActiveViewer({ user: item.user, stories: item.stories, startIndex: 0 })}
                        onAdd={handlePickMedia}
                        THEME={THEME}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: THEME.textMuted }}>Hiện chưa có tin nào mới.</Text>
                    </View>
                }
            />

            {activeViewer && (
                <StoryViewerModal
                    visible={!!activeViewer}
                    user={activeViewer.user}
                    stories={activeViewer.stories}
                    startIndex={activeViewer.startIndex}
                    onClose={() => setActiveViewer(null)}
                    onDeleteSuccess={fetchFeed}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        height: 56, flexDirection: 'row', 
        alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    listContent: { padding: 8 },
    emptyContainer: { flex: 1, paddingTop: 100, alignItems: 'center' }
});
