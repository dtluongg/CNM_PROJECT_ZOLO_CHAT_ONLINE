import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, ChevronUp, CheckCircle, Users, MoreHorizontal, Trash2 } from 'lucide-react';
import storiesApi from '../storiesApi';
import { useSocket } from '../../chat/hooks/useSocket';

const STORY_DURATION = 5000; // 5 seconds per story

const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return 'vừa xong';
    if (diffInMins < 60) return `${diffInMins}ph`;
    if (diffInHours < 24) return `${diffInHours}giờ`;
    return `${diffInDays}ngày`;
};

const StoryViewer = ({ userStories, startIndex = 0, currentUser, onClose, onDeleteSuccess }) => {
    // Sử dụng state nội bộ cho danh sách stories để có thể cập nhật ngay lập tức khi xóa
    const [localStories, setLocalStories] = useState(userStories);
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [sending, setSending] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [viewerData, setViewerData] = useState({ viewers: [], totalViews: 0, totalHearts: 0 });

    const timerRef = useRef();
    const viewedStoriesRef = useRef(new Set());
    
    // Kết nối socket để lắng nghe sự kiện xóa
    const socketRef = useSocket({
        token: localStorage.getItem('accessToken'),
        currentUserId: currentUser?._id
    });

    const currentStory = localStories[currentIndex];
    const user = currentStory?.user;
    const isOwner = currentUser?._id && (user?._id || user) 
        ? String(currentUser._id) === String(user?._id || user)
        : false;

    // Lắng nghe sự kiện Story bị xóa từ phía người khác (chủ sở hữu)
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleRemoteDelete = ({ storyId }) => {
            setLocalStories(prev => {
                const indexToDelete = prev.findIndex(s => s._id === storyId);
                if (indexToDelete === -1) return prev;

                const newList = prev.filter(s => s._id !== storyId);
                
                // Nếu tin đang hiển thị chính là tin bị xóa
                if (currentIndex === indexToDelete) {
                    if (newList.length === 0) {
                        onClose();
                    } else {
                        // Nếu là tin cuối cùng thì phải giảm index, nếu không cứ giữ index cũ 
                        // (tin tiếp theo sẽ tự động nhảy vào index này)
                        if (currentIndex >= newList.length) {
                            setCurrentIndex(newList.length - 1);
                        }
                        setProgress(0); // Reset progress cho tin mới nhảy vào
                    }
                } else if (indexToDelete < currentIndex) {
                    // Nếu tin bị xóa nằm trước tin đang xem, giảm index để không bị nhảy tin
                    setCurrentIndex(prevIdx => prevIdx - 1);
                }

                return newList;
            });
        };

        socket.on('story:deleted', handleRemoteDelete);
        return () => socket.off('story:deleted', handleRemoteDelete);
    }, [socketRef, currentIndex, onClose]);

    // Cập nhật localStories nếu prop userStories thay đổi
    useEffect(() => {
        setLocalStories(userStories);
    }, [userStories]);

    // Timer logic
    useEffect(() => {
        if (!currentStory || paused || showViewers || showOptions) {
            clearInterval(timerRef.current);
            return;
        }

        const step = 100;
        timerRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + (100 / (STORY_DURATION / step));
            });
        }, step);

        return () => clearInterval(timerRef.current);
    }, [currentIndex, paused, showViewers, showOptions, localStories]);

    // Mark as viewed and fetch viewers
    useEffect(() => {
        if (!currentStory) return;
        
        const markViewed = async () => {
            if (viewedStoriesRef.current.has(currentStory._id)) {
                if (isOwner) fetchViewers();
                return;
            }

            try {
                if (!isOwner) {
                    await storiesApi.markViewed(currentStory._id);
                    viewedStoriesRef.current.add(currentStory._id);
                } else {
                    fetchViewers();
                }
            } catch (err) {
                console.error('Mark viewed error:', err);
            }
        };

        markViewed();
        setIsLiked(false);
        setProgress(0);
        setShowToast(false);
        setShowOptions(false);
    }, [currentIndex, currentStory]);

    const fetchViewers = async () => {
        if (!isOwner || !currentStory) return;
        try {
            const res = await storiesApi.getStoryViewers(currentStory._id);
            setViewerData(res.data);
        } catch (err) {
            console.error('Fetch viewers error:', err);
        }
    };

    const handleNext = () => {
        if (currentIndex < localStories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleReply = async (e) => {
        e?.preventDefault();
        if (!replyContent.trim() || sending || !currentStory) return;

        setSending(true);
        setPaused(true);
        try {
            await storiesApi.replyToStory(currentStory._id, replyContent, false);
            setReplyContent('');
            setToastMessage(`Đã phản hồi ${user?.displayName}`);
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                setPaused(false);
            }, 3000);
        } catch (err) {
            console.error('Reply error:', err);
            setPaused(false);
        } finally {
            setSending(false);
        }
    };

    const handleReaction = async (emoji) => {
        if (sending || !currentStory) return;
        setSending(true);
        setPaused(true);
        const isHeart = emoji === '❤️';
        try {
            await storiesApi.replyToStory(currentStory._id, emoji, isHeart);
            if (isHeart) {
                setIsLiked(true);
            } else {
                setToastMessage(`Đã phản hồi ${user?.displayName}`);
                setShowToast(true);
            }

            setTimeout(() => {
                setShowToast(false);
                setPaused(false);
                if (!isHeart) handleNext();
            }, 3000);
        } catch (err) {
            setPaused(false);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteStory = async () => {
        if (!isOwner || sending || !currentStory) return;
        setSending(true);
        try {
            const storyIdToDelete = currentStory._id;
            await storiesApi.deleteStory(storyIdToDelete);
            
            // 1. Thông báo cho cha cập nhật lại feed (vòng tròn bên ngoài)
            if (onDeleteSuccess) {
                onDeleteSuccess();
            }

            setToastMessage('Đã xóa tin thành công');
            setShowToast(true);
            setShowOptions(false);
            
            // 2. Cập nhật state nội bộ ngay lập tức
            setTimeout(() => {
                setShowToast(false);
                const newList = localStories.filter(s => s._id !== storyIdToDelete);
                
                if (newList.length === 0) {
                    onClose();
                } else {
                    setLocalStories(newList);
                    // Nếu là tin cuối cùng thì phải giảm index, nếu không cứ để index đó (tin sau sẽ nhảy lên)
                    if (currentIndex >= newList.length) {
                        setCurrentIndex(newList.length - 1);
                    }
                }
            }, 1000);
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setSending(false);
        }
    };

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300 backdrop-blur-xl">
            
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-white/50 hover:text-white z-[250] transition-colors hidden md:block"
            >
                <X size={36} />
            </button>

            <div className="relative w-full max-w-[400px] h-full max-h-[100vh] md:max-h-[650px] flex items-center justify-center">
                
                {!showViewers && !showOptions && (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleBack(); }}
                            className="absolute -left-4 md:-left-20 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-sm z-[250] border border-white/10"
                            title="Tin trước"
                        >
                            <ChevronLeft size={28} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute -right-4 md:-right-20 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-sm z-[250] border border-white/10"
                            title="Tin tiếp theo"
                        >
                            <ChevronRight size={28} />
                        </button>
                    </>
                )}

                <div className="relative w-full h-full bg-black shadow-2xl flex flex-col md:rounded-2xl overflow-hidden ring-1 ring-white/10">
                
                    <div className="absolute top-2 inset-x-2 flex gap-1 z-[260]">
                        {localStories.map((_, idx) => (
                            <div key={idx} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white transition-all duration-100 ease-linear"
                                    style={{ 
                                        width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="absolute top-6 inset-x-3 flex items-center justify-between z-[260]">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border border-white/30 overflow-hidden">
                                <img src={user?.avatar || '/default-avatar.png'} className="w-full h-full object-cover" alt="Avatar" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-white text-[13px] font-semibold">{user?.displayName}</span>
                                <span className="text-white/40 text-[13px]">•</span>
                                <span className="text-white/60 text-[13px] font-medium">{formatTimeAgo(currentStory.createdAt)}</span>
                            </div>
                        </div>

                        {isOwner && (
                            <div className="relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
                                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                >
                                    <MoreHorizontal size={22} />
                                </button>

                                {showOptions && (
                                    <div className="absolute top-10 right-0 w-[160px] bg-white rounded-2xl shadow-2xl py-1.5 z-[300] animate-in fade-in zoom-in-95 duration-200">
                                        <button 
                                            onClick={handleDeleteStory}
                                            className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                                        >
                                            <Trash2 size={18} />
                                            <span className="text-[14px] font-semibold">Xóa tin</span>
                                        </button>

                                        <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-100" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div 
                        className="flex-1 relative cursor-pointer"
                        onMouseDown={() => setPaused(true)}
                        onMouseUp={() => setPaused(false)}
                    >
                        {currentStory.mediaType === 'video' ? (
                            <video 
                                src={currentStory.mediaUrl} 
                                className="w-full h-full object-contain"
                                autoPlay
                                muted
                                onEnded={handleNext}
                            />
                        ) : (
                            <img src={currentStory.mediaUrl} className="w-full h-full object-contain" alt="Story content" />
                        )}

                        <div className="absolute inset-y-0 left-0 w-1/4 z-[215]" onClick={(e) => { e.stopPropagation(); handleBack(); }} />
                        <div className="absolute inset-y-0 right-0 w-1/4 z-[215]" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

                        {showToast && (
                            <div className="absolute bottom-24 inset-x-4 z-[310] animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="bg-[#1a1a1a] text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <CheckCircle size={14} strokeWidth={3} />
                                        </div>
                                        <span className="text-[14px] font-medium">{toastMessage}</span>
                                    </div>
                                    <button 
                                        onClick={() => setShowToast(false)}
                                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X size={16} className="text-white/60" />
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                    
                    {/* UI Layer: Viewer List (Owner) */}
                    {isOwner && !showViewers && !showOptions && (
                        <div 
                            className="absolute bottom-6 left-4 z-[260] flex flex-col gap-2 cursor-pointer group"
                            onClick={(e) => { e.stopPropagation(); setShowViewers(true); fetchViewers(); }}
                        >
                            <ChevronUp className="text-white animate-bounce" size={20} />
                            <div className="flex flex-col">
                                <span className="text-white text-[15px] font-bold drop-shadow-md">
                                    {viewerData.totalViews} người xem
                                </span>
                                <div className="flex -space-x-2 mt-1">
                                    {viewerData.viewers.slice(0, 5).map((v, i) => (
                                        <div key={i} className="w-6 h-6 rounded-full border border-white/50 overflow-hidden ring-2 ring-black">
                                            <img src={v.userId?.avatar || '/default-avatar.png'} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UI Layer: Reply Footer (Not Owner) */}
                    {!isOwner && (
                        <div className="absolute bottom-0 inset-x-0 p-3 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[260] flex items-center gap-3">
                            <form onSubmit={handleReply} className="flex-1 flex gap-2 items-center bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 focus-within:border-white/50 transition-all">
                                <input 
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    onFocus={() => { setPaused(true); setShowToast(false); }}
                                    onBlur={() => setPaused(false)}
                                    placeholder={`Phản hồi ${user?.displayName || 'tin'}...`}
                                    className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-white/40"
                                />
                            </form>
                            <div className="flex items-center gap-4 px-1">
                                <button 
                                    onClick={() => handleReaction('❤️')}
                                    className={`flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none`}
                                    title="Thả tim"
                                >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isLiked ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/20 shadow-lg' : 'bg-white/20 hover:bg-white/40'}`}>
                                        <Heart 
                                            size={20} 
                                            className={`${isLiked ? 'text-white fill-white' : 'text-white'} transition-colors`} 
                                        />
                                    </div>
                                </button>
                                <button 
                                    onClick={handleReply}
                                    disabled={!replyContent.trim() || sending}
                                    className="flex items-center justify-center text-white hover:scale-110 active:scale-95 disabled:opacity-30 transition-all ml-1"
                                    title="Gửi"
                                >
                                    <Send size={26} />
                                </button>
                            </div>
                        </div>
                    )}

                    {showViewers && (
                        <div className="absolute inset-0 z-[300] animate-in fade-in duration-300">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowViewers(false)} />
                            
                            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[32px] max-h-[75%] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
                                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-[17px] font-bold text-gray-900">Người xem tin</h3>
                                        <div className="flex items-center gap-2 text-gray-400 text-[13px] font-medium mt-0.5">
                                            <span>{viewerData.totalViews} lượt xem</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span>{viewerData.totalHearts} cảm xúc</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowViewers(false)}
                                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all active:scale-90"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-2 py-2">
                                    {viewerData.viewers.length > 0 ? (
                                        viewerData.viewers.map((viewer, idx) => (
                                            <div key={idx} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-1 ring-gray-100 shadow-sm">
                                                        <img src={viewer.userId?.avatar || '/default-avatar.png'} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800 text-[16px] leading-tight">{viewer.userId?.displayName}</span>
                                                        {viewer.hasHeart && (
                                                            <div className="mt-1.5 flex items-center">
                                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-sm">
                                                                    <Heart size={10} className="text-white fill-white" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                                <Users size={32} className="opacity-20" />
                                            </div>
                                            <span className="text-[15px] font-medium">Chưa có lượt xem nào</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
