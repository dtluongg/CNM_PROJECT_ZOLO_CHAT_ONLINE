import React from 'react';
import { Plus } from 'lucide-react';

const StoryCard = ({ user, stories = [], isMe = false, onAdd, onView }) => {
    const hasStories = stories.length > 0;
    const latestStory = hasStories ? stories[0] : null;

    // Hiển thị Avatar của người đăng ở góc
    const renderAvatarOverlay = () => (
        <div className="absolute top-3 left-3 z-10">
            <div className={`w-10 h-10 rounded-full border-2 ${hasStories ? 'border-[var(--accent)]' : 'border-white'} overflow-hidden shadow-lg`}>
                {user?.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                    <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white font-bold">
                        {user?.displayName?.[0] || '?'}
                    </div>
                )}
            </div>
        </div>
    );

    if (isMe && !hasStories) {
        return (
            <div 
                onClick={onAdd}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group bg-gray-200 border-2 border-dashed border-gray-300 hover:border-[var(--accent)] transition-all"
            >
                {/* User Avatar Placeholder */}
                <div className="w-full h-full flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                    {user?.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover blur-sm" alt="Me" />
                    ) : (
                        <Plus size={48} className="text-gray-500" />
                    )}
                </div>
                
                {/* Plus Button Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-white flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white mb-1 shadow-md -mt-7 border-4 border-white">
                        <Plus size={18} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-gray-800">Thêm vào tin</span>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onView}
            className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group bg-black shadow-lg hover:scale-[1.02] transition-transform"
        >
            {/* Background Preview */}
            <div className="absolute inset-0 w-full h-full">
                {latestStory?.mediaType === 'video' ? (
                    <video 
                        src={latestStory.mediaUrl} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                ) : (
                    <img 
                        src={latestStory?.mediaUrl || user?.avatar} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                        alt="Story"
                    />
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
            </div>

            {/* Avatar Top-Left */}
            {renderAvatarOverlay()}

            {/* Name Bottom */}
            <div className="absolute bottom-3 left-3 right-3 z-10">
                <span className="text-white text-xs font-bold shadow-sm truncate block">
                    {isMe ? 'Tin của bạn' : user?.displayName}
                </span>
            </div>

            {/* Quick Add Button if Me */}
            {isMe && (
                <div 
                    onClick={(e) => { e.stopPropagation(); onAdd(); }}
                    className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors z-20"
                >
                    <Plus size={16} className="text-white" />
                </div>
            )}
        </div>
    );
};

export default StoryCard;
