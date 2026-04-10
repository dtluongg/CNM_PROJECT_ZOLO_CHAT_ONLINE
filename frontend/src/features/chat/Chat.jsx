import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, User } from 'lucide-react';
import LeftSidebar from './components/LeftSidebar';
import ChatArea from './components/ChatArea';
import RightSidebar from './components/RightSidebar';
import ProfileSettings from '../user/components/ProfileSettings';
import UserSearchModal from '../user/components/UserSearchModal';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../data/mockData';

const BOTTOM_TABS = [
  { key: 'messages', icon: MessageCircle, label: 'Tin nhắn' },
  { key: 'search', icon: Search, label: 'Tìm kiếm' },
  { key: 'profile', icon: User, label: 'Hồ sơ' },
];

function BottomTabBar({ activeTab, onTabChange, unreadTotal }) {
  return (
    <div style={{
      height: 56,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      flexShrink: 0,
      zIndex: 20,
    }}>
      {/* eslint-disable-next-line no-unused-vars */}
      {BOTTOM_TABS.map(({ key, icon: Icon, label }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.15s',
              position: 'relative',
              minHeight: 0,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                fill={active && key === 'messages' ? 'var(--accent)' : 'none'}
              />
              {key === 'messages' && unreadTotal > 0 && !active && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  minWidth: 16, height: 16, background: '#ed4245', color: '#fff',
                  borderRadius: 8, fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '2px solid var(--bg-secondary)',
                }}>
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.2 }}>
              {label}
            </span>
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 3, background: 'var(--accent)', borderRadius: '0 0 4px 4px',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

const Chat = () => {
  const navigate = useNavigate();
  const [activeConversation, setActiveConversation] = useState(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileView, setMobileView] = useState('list');   // 'list' | 'chat'
  const [mobileTab, setMobileTab] = useState('messages'); // for bottom nav highlight

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelectConversation = useCallback((conv) => {
    setActiveConversation(conv);
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
    );
    if (isMobile) {
      setMobileView('chat');
      setMobileTab('messages');
    }
  }, [isMobile]);

  const handleSendMessage = useCallback((text) => {
    if (!activeConversation || !text.trim()) return;
    const newMsg = {
      id: Date.now(),
      senderId: 'me',
      senderName: 'Tôi',
      content: text.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      reactions: [],
      seenBy: []
    };
    setMessages(prev => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
    }));
    setConversations(prev =>
      prev.map(c => c.id === activeConversation.id
        ? { ...c, lastMessage: text.trim(), time: newMsg.time }
        : c
      )
    );
  }, [activeConversation]);

  const handleViewProfile = useCallback((userId) => {
    navigate(`/user/${userId}`);
  }, [navigate]);

  const handleMobileBack = useCallback(() => {
    setMobileView('list');
    setShowRightSidebar(false);
  }, []);

  const handleMobileTabChange = useCallback((tab) => {
    setMobileTab(tab);
    if (tab === 'search') {
      setShowUserSearch(true);
    } else if (tab === 'profile') {
      setShowProfileSettings(true);
    } else if (tab === 'messages') {
      if (mobileView === 'chat') {
        // stay in chat, just highlight tab
      }
    }
  }, [mobileView]);

  const unreadTotal = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const activeMessages = activeConversation ? messages[activeConversation.id] || [] : [];

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    return (
      <div style={{
        width: '100vw', height: '100%',
        background: 'var(--bg-primary)',
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Sliding views container */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* ── Conversation List (slides from left) ── */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: mobileView === 'list' ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            zIndex: mobileView === 'list' ? 2 : 1,
            willChange: 'transform',
          }}>
            <LeftSidebar
              conversations={conversations}
              activeConv={activeConversation}
              onSelectConv={handleSelectConversation}
              onOpenSettings={() => setShowProfileSettings(true)}
              onOpenSearch={() => setShowUserSearch(true)}
              isMobile
            />
          </div>

          {/* ── Chat Area (slides from right) ── */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: mobileView === 'chat' ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            zIndex: mobileView === 'chat' ? 2 : 1,
            willChange: 'transform',
            display: 'flex', flexDirection: 'column',
          }}>
            <ChatArea
              conversation={activeConversation}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
              onToggleRight={() => setShowRightSidebar(v => !v)}
              showRight={showRightSidebar}
              onBack={handleMobileBack}
              isMobile
            />
          </div>
        </div>

        {/* ── Bottom Navigation Bar ── */}
        <BottomTabBar
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
          unreadTotal={unreadTotal}
        />

        {/* ── Modals ── */}
        {showProfileSettings && (
          <ProfileSettings onClose={() => { setShowProfileSettings(false); setMobileTab('messages'); }} />
        )}
        {showUserSearch && (
          <UserSearchModal onClose={() => { setShowUserSearch(false); setMobileTab('messages'); }} />
        )}

        {/* Right sidebar as full-screen overlay on mobile */}
        {showRightSidebar && activeConversation && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <RightSidebar
              conversation={activeConversation}
              onClose={() => setShowRightSidebar(false)}
              onViewProfile={handleViewProfile}
              isMobile
            />
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ── */
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-primary)',
      position: 'relative',
      display: 'flex', overflow: 'hidden',
    }}>
      {/* Left Sidebar */}
      <LeftSidebar
        conversations={conversations}
        activeConv={activeConversation}
        onSelectConv={handleSelectConversation}
        onOpenSettings={() => setShowProfileSettings(true)}
        onOpenSearch={() => setShowUserSearch(true)}
      />

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <ChatArea
          conversation={activeConversation}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onToggleRight={() => setShowRightSidebar(v => !v)}
          showRight={showRightSidebar}
        />
      </div>

      {/* Right Sidebar */}
      {showRightSidebar && activeConversation && (
        <div style={{ flexShrink: 0 }}>
          <RightSidebar
            conversation={activeConversation}
            onClose={() => setShowRightSidebar(false)}
            onViewProfile={handleViewProfile}
          />
        </div>
      )}

      {showProfileSettings && <ProfileSettings onClose={() => setShowProfileSettings(false)} />}
      {showUserSearch && <UserSearchModal onClose={() => setShowUserSearch(false)} />}
    </div>
  );
};

export default Chat;
