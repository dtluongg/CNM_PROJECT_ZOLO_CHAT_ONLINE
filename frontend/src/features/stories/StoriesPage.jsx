import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import storiesApi from './storiesApi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../chat/hooks/useSocket';
import { useLanguage } from '../../context/LanguageContext';
import StoryCard from './components/StoryCard';
import StoryUploadModal from './components/StoryUploadModal';
import StoryViewer from './components/StoryViewer';

const StoriesPage = () => {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [activeViewer, setActiveViewer] = useState(null); // { userStories: [], startIndex: 0 }

    const fetchFeed = useCallback(async () => {
        try {
            const res = await storiesApi.getFeed();
            setFeed(res.data.feed);
        } catch (err) {
            console.error('Fetch feed error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Kết nối socket để lắng nghe tin mới
    const socketRef = useSocket({
        token: token || localStorage.getItem('accessToken'),
        currentUserId: user?._id
    });

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        // Khi có người đăng tin mới hoặc xóa tin, tự động tải lại feed
        socket.on('story:new', fetchFeed);
        socket.on('story:deleted', fetchFeed);

        return () => {
            socket.off('story:new', fetchFeed);
            socket.off('story:deleted', fetchFeed);
        };
    }, [socketRef, fetchFeed]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    const myFeedItem = feed.find(item => item.user._id === user?._id);
    const friendsFeed = feed.filter(item => item.user._id !== user?._id);

    return (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">{t('stories.title')}</h1>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">

                        {/* My Story Card */}
                        <StoryCard
                            isMe={true}
                            user={user}
                            stories={myFeedItem?.stories || []}
                            onAdd={() => setShowUpload(true)}
                            onView={() => setActiveViewer({ userStories: myFeedItem.stories, startIndex: 0 })}
                        />

                        {/* Friends Stories */}
                        {friendsFeed.map((item) => (
                            <StoryCard
                                key={item.user._id}
                                user={item.user}
                                stories={item.stories}
                                onView={() => setActiveViewer({ userStories: item.stories, startIndex: 0 })}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showUpload && (
                <StoryUploadModal
                    onClose={() => setShowUpload(false)}
                    onSuccess={() => {
                        setShowUpload(false);
                        fetchFeed();
                    }}
                />
            )}

            {activeViewer && (
                <StoryViewer
                    userStories={activeViewer.userStories}
                    startIndex={activeViewer.startIndex}
                    currentUser={user}
                    onClose={() => setActiveViewer(null)}
                    onDeleteSuccess={fetchFeed}
                />
            )}
        </div>
    );
};

export default StoriesPage;
