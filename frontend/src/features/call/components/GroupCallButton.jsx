/**
 * GroupCallButton – nút gọi nhóm audio/video trong header chat nhóm.
 * Đặt vào ChatArea header hoặc RightSidebar tùy layout.
 */
import React, { useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';

export default function GroupCallButton({ conversationId, style }) {
  const { callState, initiateGroupCall } = useGroupCall();
  const [hover, setHover] = useState(null); // 'audio' | 'video' | null

  const isIdle = callState === GROUP_CALL_STATE.IDLE;

  const start = (type) => {
    if (!isIdle) return;
    initiateGroupCall(conversationId, type);
  };

  return (
    <div style={{ display: 'flex', gap: 6, ...style }}>
      <button
        onClick={() => start('audio')}
        disabled={!isIdle}
        title="Gọi thoại nhóm"
        onMouseEnter={() => setHover('audio')}
        onMouseLeave={() => setHover(null)}
        style={{
          width: 34, height: 34, borderRadius: 8, border: 'none',
          cursor: isIdle ? 'pointer' : 'not-allowed',
          background: hover === 'audio' && isIdle ? 'var(--bg-hover, rgba(255,255,255,0.1))' : 'transparent',
          color: isIdle ? 'var(--text-secondary, #b5bac1)' : 'var(--text-muted, #80848e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <Phone size={18} />
      </button>

      <button
        onClick={() => start('video')}
        disabled={!isIdle}
        title="Gọi video nhóm"
        onMouseEnter={() => setHover('video')}
        onMouseLeave={() => setHover(null)}
        style={{
          width: 34, height: 34, borderRadius: 8, border: 'none',
          cursor: isIdle ? 'pointer' : 'not-allowed',
          background: hover === 'video' && isIdle ? 'var(--bg-hover, rgba(255,255,255,0.1))' : 'transparent',
          color: isIdle ? 'var(--text-secondary, #b5bac1)' : 'var(--text-muted, #80848e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <Video size={18} />
      </button>
    </div>
  );
}