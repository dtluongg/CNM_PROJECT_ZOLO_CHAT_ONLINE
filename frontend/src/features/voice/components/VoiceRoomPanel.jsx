import React from 'react';
import { PhoneOff, Volume2 } from 'lucide-react';
import { useVoiceRoomContext } from '../VoiceRoomContext';

export default function VoiceRoomPanel({ visible, conversation, currentUserId, onClose }) {
  const { connected, inRoom, leaveRoom, activeKey, activeConversationId } = useVoiceRoomContext();

  if (!visible || !inRoom || !connected) return null;

  const handleLeave = () => {
    const convId  = activeConversationId || conversation?.id;
    const topicId = (!activeKey || activeKey === '__general__') ? null : activeKey;
    leaveRoom(convId, topicId);
    onClose?.();
  };

  return (
    <div style={{
      position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, background: '#23272a',
      borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      border: '1px solid rgba(87,242,135,0.25)',
      minWidth: 220, maxWidth: 'calc(100vw - 32px)',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#57f287', flexShrink: 0, boxShadow: '0 0 6px #57f287' }} />
      <Volume2 size={16} color="#57f287" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Đang trong phòng thoại
      </span>
      <button
        onClick={handleLeave}
        title="Rời phòng"
        style={{
          background: '#ed4245', border: 'none', borderRadius: 8,
          color: '#fff', padding: '5px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}
      >
        <PhoneOff size={14} />
      </button>
    </div>
  );
}
