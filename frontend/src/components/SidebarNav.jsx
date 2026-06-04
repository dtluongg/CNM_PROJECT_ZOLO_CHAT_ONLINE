import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, BookOpen, Bell, Settings, ShieldCheck, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import ProfileSettings from '../features/user/components/ProfileSettings';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from '../features/notifications/components/NotificationCenter';
import { useLanguage } from '../context/LanguageContext';
import ArchivedChatsModal from '../features/chat/components/ArchivedChatsModal';

const getInitials = (name) => {
    if (!name) return '?';
    const p = name.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const TinIcon = ({ size = 22, strokeWidth = 2, ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="5" width="9" height="14" rx="2" />
        <rect x="14" y="8" width="7" height="8" rx="2" />
    </svg>
);

const NavBtn = ({ icon: Icon, active, onClick, title, badge }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            position: 'relative',
            width: 42, height: 42,
            borderRadius: 12,
            background: active
                ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))'
                : 'transparent',
            color: active ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: active ? '0 4px 12px rgba(var(--accent-rgb),0.35)' : 'none',
        }}
        onMouseEnter={e => {
            if (!active) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }
        }}
        onMouseLeave={e => {
            if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.transform = 'none';
            }
        }}
    >
        <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
        {badge > 0 && (
            <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', border: '2px solid var(--bg-secondary)',
            }}>
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </button>
);

const SidebarNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [showSettings, setShowSettings] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const { unreadCount } = useNotifications();

    const isChat    = location.pathname.startsWith('/chat');
    const isFriends = location.pathname.startsWith('/friends');
    const isStories = location.pathname.startsWith('/stories');
    const isAdmin   = location.pathname.startsWith('/admin');
    const isAdminUser = ['admin', 'moderator'].includes(user?.role);

    return (
        <div style={{
            width: 62, minWidth: 62, height: '100vh',
            background: 'var(--bg-secondary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '16px 0 12px',
            borderRight: '1px solid var(--glass-border, var(--border))',
            zIndex: 50, position: 'relative',
        }}>
            {/* Logo */}
            <div style={{ marginBottom: 24, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                    src="/logo.svg"
                    alt="Logo"
                    width={32} height={32}
                    draggable={false}
                    style={{ display: 'block', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(var(--accent-rgb),0.4))' }}
                />
            </div>

            {/* Divider */}
            <div style={{ width: 28, height: 1, background: 'var(--border)', marginBottom: 16, borderRadius: 1 }} />

            {/* Nav icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, alignItems: 'center', width: '100%', padding: '0 10px' }}>
                <NavBtn icon={MessageCircle} active={isChat}    onClick={() => navigate('/chat')}    title={t('navbar.chat')} />
                <NavBtn icon={Bell}          active={showNotificationCenter} onClick={() => setShowNotificationCenter(v => !v)} title={t('navbar.notifications')} badge={unreadCount} />
                <NavBtn icon={Users}         active={isFriends} onClick={() => navigate('/friends')} title={t('navbar.friends')} />
                <NavBtn icon={TinIcon}       active={isStories} onClick={() => navigate('/stories')} title={t('navbar.stories')} />
                <NavBtn icon={Archive}       active={showArchived} onClick={() => setShowArchived(true)} title={t('archived.title')} />
                {isAdminUser && (
                    <NavBtn icon={ShieldCheck} active={isAdmin} onClick={() => navigate('/admin')} title="Admin Dashboard" />
                )}
            </div>

            {/* Bottom — settings + avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 10px' }}>
                <NavBtn icon={Settings} active={showSettings} onClick={() => setShowSettings(true)} title={t('navbar.settings')} />

                {/* User avatar */}
                <button
                    onClick={() => setShowSettings(true)}
                    title={user?.displayName || 'Profile'}
                    style={{
                        width: 34, height: 34, borderRadius: '50%',
                        border: '2px solid var(--border)',
                        overflow: 'hidden', cursor: 'pointer',
                        padding: 0, background: 'var(--bg-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-primary)', fontWeight: 700, fontSize: 12,
                        transition: 'border-color 0.18s, box-shadow 0.18s',
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(var(--accent-rgb),0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    {user?.avatar
                        ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                        : getInitials(user?.displayName || user?.email)
                    }
                </button>
            </div>

            {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}
            <NotificationCenter open={showNotificationCenter} onClose={() => setShowNotificationCenter(false)} />
            <ArchivedChatsModal
                visible={showArchived}
                onClose={() => setShowArchived(false)}
                currentUserId={(user?._id || user?.id || '').toString()}
            />
        </div>
    );
};

export default SidebarNav;