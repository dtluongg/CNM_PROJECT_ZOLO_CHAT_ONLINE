import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Cloud, Briefcase, Settings, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import ProfileSettings from '../features/user/components/ProfileSettings';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from '../features/notifications/components/NotificationCenter';
import { useLanguage } from '../context/LanguageContext';

const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const TinIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <rect x="3" y="5" width="9" height="14" rx="2" />
        <rect x="14" y="8" width="7" height="8" rx="2" />
    </svg>
);

const SidebarNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [showSettings, setShowSettings] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const { unreadCount } = useNotifications();

    // Kiểm tra tab hiện tại
    const isChat = location.pathname.startsWith('/chat');
    const isFriends = location.pathname.startsWith('/friends');
    const isStories = location.pathname.startsWith('/stories');

    const handleNavigate = (path) => {
        navigate(path);
    };

    return (
        <div 
            style={{ 
                width: 64, 
                minWidth: 64, 
                height: '100vh', 
                backgroundColor: 'var(--bg-secondary)', // Bắt nguồn biến CSS thay vì fix cứng màu
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                padding: '24px 0',
                borderRight: '1px solid var(--border)',
                zIndex: 50,
                position: 'relative',
            }}
        >
            {/* User Avatar */}
            <div 
                style={{
                    width: 44, height: 44, 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--bg-hover)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 32, cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: 'bold', fontSize: 16,
                    overflow: 'hidden'
                }}
                onClick={() => setShowSettings(true)}
            >
                {user?.avatar ? (
                    <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                    getInitials(user?.displayName || user?.email)
                )}
            </div>

            {/* Navigation Icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26, flex: 1, width: '100%', alignItems: 'center' }}>
                
                {/* Tin Nhắn */}
                <button 
                    onClick={() => handleNavigate('/chat')}
                    title={t('navbar.chat')}
                    style={{
                        width: 44, height: 44,
                        borderRadius: 12,
                        backgroundColor: isChat ? 'var(--bg-hover)' : 'transparent',
                        color: isChat ? 'var(--accent)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    <MessageCircle strokeWidth={isChat ? 2.5 : 2} size={24} />
                </button>

                {/* Notification Center */}
                <button
                    onClick={() => setShowNotificationCenter((v) => !v)}
                    title={t('navbar.notifications')}
                    style={{
                        position: 'relative',
                        width: 44, height: 44,
                        borderRadius: 12,
                        backgroundColor: showNotificationCenter ? 'var(--bg-hover)' : 'transparent',
                        color: showNotificationCenter ? 'var(--accent)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    <Bell strokeWidth={showNotificationCenter ? 2.5 : 2} size={24} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute', top: -2, right: -2,
                            backgroundColor: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800,
                            padding: '1px 5px', borderRadius: 10, border: '2px solid var(--bg-secondary)',
                            minWidth: 18, textAlign: 'center',
                        }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Danh bạ */}
                <button 
                    onClick={() => handleNavigate('/friends')}
                    title={t('navbar.friends')}
                    style={{
                        width: 44, height: 44,
                        borderRadius: 12,
                        backgroundColor: isFriends ? 'var(--bg-hover)' : 'transparent',
                        color: isFriends ? 'var(--accent)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    <Users strokeWidth={isFriends ? 2.5 : 2} size={24} />
                </button>

                {/* Bản tin (Custom Tin Icon) */}
                <button 
                    onClick={() => handleNavigate('/stories')}
                    title={t('navbar.stories')}
                    style={{
                        width: 44, height: 44, borderRadius: 12,
                        backgroundColor: isStories ? 'var(--bg-hover)' : 'transparent',
                        color: isStories ? 'var(--accent)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    <TinIcon strokeWidth={isStories ? 2.5 : 2} size={24} />
                </button>

                {/* Đám mây (Static for UI) */}
                <button 
                    title={t('navbar.cloud')}
                    style={{
                        width: 44, height: 44, borderRadius: 12, backgroundColor: 'transparent',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'not-allowed', opacity: 0.6
                    }}
                >
                    <Cloud strokeWidth={2} size={24} />
                </button>
                
                {/* Công cụ (Static for UI) */}
                <button 
                    title={t('navbar.tools')}
                    style={{
                        width: 44, height: 44, borderRadius: 12, backgroundColor: 'transparent',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'not-allowed', opacity: 0.6
                    }}
                >
                    <Briefcase strokeWidth={2} size={24} />
                </button>

            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Cài đặt */}
                <button 
                    onClick={() => setShowSettings(true)}
                    title={t('navbar.settings')}
                    style={{
                        width: 44, height: 44, borderRadius: 12, backgroundColor: showSettings ? 'var(--bg-hover)' : 'transparent',
                        color: showSettings ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    <Settings strokeWidth={showSettings ? 2.5 : 2} size={24} />
                </button>
            </div>
            
            {/* Modal Settings */}
            {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}
            <NotificationCenter
                open={showNotificationCenter}
                onClose={() => setShowNotificationCenter(false)}
            />
        </div>
    );
};

export default SidebarNav;
