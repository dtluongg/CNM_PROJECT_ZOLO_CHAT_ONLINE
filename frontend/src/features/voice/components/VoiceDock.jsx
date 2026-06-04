/**
 * VoiceDock – widget nổi ở góc màn hình, hiển thị khi user đang trong phòng thoại.
 * Mount global (App.jsx) nên vẫn hiện khi điều hướng sang trang khác (Bạn bè, Story...).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Volume2, Users } from 'lucide-react';
import { useVoiceRoomContext } from '../VoiceRoomContext';

export default function VoiceDock() {
  const {
    inRoom, connected, activeConversationId, activeKey, activeTopic,
    isMuted, toggleMute, leaveRoom, getMergedParticipants, requestExpand,
  } = useVoiceRoomContext();
  const navigate = useNavigate();

  if (!inRoom) return null;

  const topicId      = activeKey === '__general__' ? null : activeKey;
  const participants = getMergedParticipants(topicId);
  const count        = participants.length;
  const speaking     = participants.some(p => p.isSpeaking);
  const roomName     = activeTopic?.name || 'Phòng thoại';

  const handleExpand = () => {
    // Báo cho Chat mở lại màn hình gọi (chọn đúng conversation + topic thoại)
    requestExpand();
    navigate('/chat', { state: { openConversationId: activeConversationId } });
  };

  const handleLeave = (e) => {
    e.stopPropagation();
    leaveRoom(activeConversationId, topicId);
  };

  const handleMute = (e) => {
    e.stopPropagation();
    toggleMute();
  };

  return (
    <div
      onClick={handleExpand}
      title="Quay lại màn hình gọi"
      style={{
        position: 'fixed',
        bottom: 28,
        /* 62px SidebarNav + 16px gap — widget không bị che khuất */
        left: 78,
        zIndex: 9996,
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'var(--bg-secondary, #1e1f22)',
        border: `2px solid ${speaking ? '#3ba55c' : 'var(--border, #3a3b3e)'}`,
        borderRadius: 20, padding: '14px 18px', cursor: 'pointer',
        minWidth: 280,
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        boxShadow: speaking
          ? '0 12px 40px rgba(0,0,0,0.55), 0 0 0 4px rgba(59,165,92,0.22)'
          : '0 12px 40px rgba(0,0,0,0.55)',
        animation: 'dockIn 0.22s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Pulsing voice icon */}
      <div style={{
        width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
        background: connected ? '#3ba55c' : '#faa61a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: speaking ? '0 0 0 6px rgba(59,165,92,0.25)' : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        <Volume2 size={24} color="#fff" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: 'var(--text-primary, #f2f3f5)', fontSize: 15, fontWeight: 800,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {roomName}
        </div>
        <div style={{
          color: connected ? '#3ba55c' : '#faa61a', fontSize: 12.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
        }}>
          <Users size={13} />
          {connected ? `${count} người tham gia` : 'Đang kết nối...'}
        </div>
      </div>

      {/* Mute toggle */}
      <button
        onClick={handleMute}
        title={isMuted ? 'Bật mic' : 'Tắt mic'}
        style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: isMuted ? '#ed4245' : 'rgba(255,255,255,0.1)',
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}
      >
        {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
      </button>

      {/* Leave */}
      <button
        onClick={handleLeave}
        title="Rời phòng"
        style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: '#ed4245', border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <PhoneOff size={18} />
      </button>

      <style>{`
        @keyframes dockIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}