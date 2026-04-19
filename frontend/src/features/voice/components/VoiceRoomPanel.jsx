// VoiceRoomPanel: floating button/panel used outside of voice channels
// (kept for backward compat; main voice UI is VoiceChannelView)
import React from 'react';
import { Volume2, PhoneOff } from 'lucide-react';
import { useVoiceRoomContext } from '../VoiceRoomContext';

export default function VoiceRoomPanel({ visible, conversation, currentUserId, onClose }) {
  const { inRoom, leaveRoom, activeKey } = useVoiceRoomContext();

  if (!visible || !inRoom) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 20, zIndex: 300,
      background: 'var(--bg-secondary)', borderRadius: 12,
      border: '1px solid var(--border)', padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3ba55c' }} />
      <Volume2 size={14} color="#3ba55c" />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#3ba55c' }}>Đang trong phòng thoại</span>
      <button
        onClick={() => leaveRoom(conversation?.id)}
        style={{ background: '#ed424520', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#ed4245', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <PhoneOff size={11} /> Rời
      </button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}
