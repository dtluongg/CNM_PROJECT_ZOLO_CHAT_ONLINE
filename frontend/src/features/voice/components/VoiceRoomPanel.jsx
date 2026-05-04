import React, { useRef, useEffect, useState } from 'react';
import { PhoneOff, Volume2, X, Maximize2, Minimize2 } from 'lucide-react';
import { useVoiceRoomContext } from '../VoiceRoomContext';

export default function VoiceRoomPanel({ visible, conversation, currentUserId, onClose }) {
  const {
    connected, inRoom, leaveRoom,
    activeKey, activeConversationId,
    screenTrack, isScreenSharing,
  } = useVoiceRoomContext();

  const screenRef = useRef(null);
  const [expanded, setExpanded] = useState(false); // fullscreen overlay

  // Attach/detach screen track to <video>
  useEffect(() => {
    const el = screenRef.current;
    if (!el || !screenTrack) return;
    screenTrack.attach(el);
    return () => { try { screenTrack.detach(el); } catch {} };
  }, [screenTrack, expanded]); // re-run when toggling expanded (new video el mounts)

  if (!visible || !inRoom || !connected) return null;

  const hasScreen = !!screenTrack || isScreenSharing;

  const handleLeave = () => {
    const convId  = activeConversationId || conversation?.id;
    const topicId = (!activeKey || activeKey === '__general__') ? null : activeKey;
    leaveRoom(convId, topicId);
    onClose?.();
  };

  // ── Fullscreen overlay ──────────────────────────────────────────────────
  if (expanded && hasScreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
          background: 'rgba(0,0,0,0.6)',
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#57f287', boxShadow: '0 0 6px #57f287' }} />
          <Volume2 size={15} color="#57f287" />
          <span style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 600 }}>
            Màn hình được chia sẻ
          </span>
          <button onClick={() => setExpanded(false)} title="Thu nhỏ"
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Minimize2 size={15} /> <span style={{ fontSize: 12 }}>Thu nhỏ</span>
          </button>
          <button onClick={handleLeave} title="Rời phòng"
            style={{ background: '#ed4245', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <PhoneOff size={14} />
          </button>
        </div>

        {/* Full-area video */}
        <video
          ref={screenRef}
          autoPlay playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  // ── Mini panel (default) ────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, background: '#23272a',
      borderRadius: 14,
      display: 'flex', flexDirection: 'column', gap: 0,
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      border: '1px solid rgba(87,242,135,0.25)',
      minWidth: 220, maxWidth: 'calc(100vw - 32px)',
      overflow: 'hidden',
    }}>

      {/* Screen share preview — chỉ hiện khi có share */}
      {hasScreen && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            position: 'relative', background: '#000',
            height: 110, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <video
            ref={screenRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
          {/* Tap-to-expand hint */}
          <div style={{
            position: 'absolute', bottom: 6, right: 8,
            background: 'rgba(0,0,0,0.6)', borderRadius: 6,
            padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Maximize2 size={11} color="#fff" />
            <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>Toàn màn hình</span>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#57f287', flexShrink: 0, boxShadow: '0 0 6px #57f287' }} />
        <Volume2 size={16} color="#57f287" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {hasScreen ? 'Đang chia sẻ màn hình' : 'Đang trong phòng thoại'}
        </span>
        {hasScreen && (
          <button onClick={() => setExpanded(true)} title="Xem toàn màn hình"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Maximize2 size={14} />
          </button>
        )}
        <button onClick={handleLeave} title="Rời phòng"
          style={{ background: '#ed4245', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}