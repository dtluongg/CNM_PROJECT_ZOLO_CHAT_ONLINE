import React, { useState, useEffect } from 'react';
import LeftSidebar from '../components/chat/LeftSidebar';
import ChatArea from '../components/chat/ChatArea';
import RightSidebar from '../components/chat/RightSidebar';
import ProfileSettings from '../components/settings/ProfileSettings';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../data/mockData';

const Chat = () => {
  const [activeConversation, setActiveConversation] = useState(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
    );
    if (isMobile) setShowMobileSidebar(false);
  };

  const handleSendMessage = (text) => {
    if (!activeConversation || !text.trim()) return;
    const newMsg = {
      id: Date.now(),
      senderId: 'me',
      senderName: 'Tôi',
      content: text.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };
    setMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, lastMessage: text.trim(), time: newMsg.time }
          : c
      )
    );
  };

  const activeMessages = activeConversation
    ? messages[activeConversation.id] || []
    : [];

  return (
    <div
      className="flex overflow-hidden"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-primary)',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      {/* Mobile sidebar overlay */}
      {isMobile && showMobileSidebar && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Left Sidebar */}
      <div
        style={{
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: isMobile ? 50 : 'auto',
          transform: isMobile
            ? showMobileSidebar ? 'translateX(0)' : 'translateX(-100%)'
            : 'none',
          transition: 'transform 0.25s ease',
          flexShrink: 0,
        }}
      >
        <LeftSidebar
          conversations={conversations}
          activeConv={activeConversation}
          onSelectConv={handleSelectConversation}
          onOpenSettings={() => setShowProfileSettings(true)}
        />
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <ChatArea
          conversation={activeConversation}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onToggleRight={() => setShowRightSidebar((v) => !v)}
          showRight={showRightSidebar}
          onToggleMobileSidebar={() => setShowMobileSidebar((v) => !v)}
          isMobile={isMobile}
        />
      </div>

      {/* Right Sidebar */}
      {showRightSidebar && activeConversation && (
        <div
          style={{
            position: isMobile ? 'fixed' : 'relative',
            right: 0,
            top: 0,
            height: '100%',
            zIndex: isMobile ? 50 : 'auto',
            flexShrink: 0,
          }}
        >
          <RightSidebar
            conversation={activeConversation}
            onClose={() => setShowRightSidebar(false)}
          />
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}
    </div>
  );
};

export default Chat;
