/**
 * GroupCallScreen – màn hình cuộc gọi nhóm (audio/video) đang active.
 * Tái dụng LiveKit infrastructure từ VoiceRoom.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, Minimize2, Maximize2, Users,
} from 'lucide-react';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarColor = (n) => AVATAR_COLORS[(n || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (n) => {
  if (!n) return '?';
  const p = n.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

// Video tile cho 1 participant
function ParticipantTile({ participant, cameraTrack, isSpeaking, isLocal }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (cameraTrack) {
      cameraTrack.attach(el);
      return () => { try { cameraTrack.detach(el); } catch {} };
    }
  }, [cameraTrack]);

  const name      = participant.displayName || participant.name || 'Người dùng';
  const hasCamera = !!cameraTrack && !participant.isMuted;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#1e1f22',
      border: isSpeaking ? '2px solid #57f287' : '2px solid transparent',
      transition: 'border-color 0.2s',
      aspectRatio: '16/9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {cameraTrack
        ? <video ref={videoRef} autoPlay playsInline muted={isLocal}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {participant.avatar
              ? <img src={participant.avatar} alt={name}
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: avatarColor(name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 700, color: '#fff',
                }}>{initials(name)}</div>
            }
          </div>
        )
      }

      {/* Overlay: name + mute indicator */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 10px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
          {name}{isLocal ? ' (Bạn)' : ''}
        </span>
        {participant.isMuted && <MicOff size={13} color="#ed4245" />}
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#57f287', borderRadius: '50%',
          width: 10, height: 10,
          boxShadow: '0 0 8px #57f287',
        }} />
      )}
    </div>
  );
}

export default function GroupCallScreen() {
  const {
    callState, callType, callDuration, formatDuration,
    connected, isMuted, isCameraOff, isScreenSharing,
    liveParts, localVideoTrack, screenTrack, speaking,
    getRemoteCameraTrack,
    toggleMute, toggleCamera, toggleScreenShare,
    leaveGroupCall, endGroupCall,
  } = useGroupCall();

  const screenRef   = useRef(null);
  const [minimized, setMinimized] = useState(false);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const hideTimer = useRef(null);

  const isActive  = callState === GROUP_CALL_STATE.ACTIVE || callState === GROUP_CALL_STATE.CALLING;
  const isVideo   = callType === 'video';

  useEffect(() => {
    const el = screenRef.current;
    if (!el || !screenTrack) return;
    screenTrack.attach(el);
    return () => { try { screenTrack.detach(el); } catch {} };
  }, [screenTrack]);

  const resetHide = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    if (isVideo) hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  };
  useEffect(() => { if (isVideo) resetHide(); }, [isVideo]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (!isActive) return null;

  // ── Minimized PiP ─────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div onClick={() => setMinimized(false)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
        background: '#1e1f22',
        border: '1px solid #5865f2',
        borderRadius: 16, padding: '12px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 210,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#5865f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18} color="#fff" />
        </div>
        <div>
          <div style={{ color: '#f2f3f5', fontSize: 13, fontWeight: 600 }}>
            Gọi nhóm · {liveParts.length} người
          </div>
          <div style={{ color: '#3ba55c', fontSize: 12 }}>{formatDuration(callDuration)}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); leaveGroupCall(); }} style={{
          marginLeft: 8, background: '#ed4245', border: 'none',
          borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}><PhoneOff size={15} /></button>
      </div>
    );
  }

  // ── Full screen ────────────────────────────────────────────────────────
  const cols = Math.ceil(Math.sqrt(liveParts.length || 1));
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.min(cols, 4)}, 1fr)`,
    gap: 8,
    padding: '60px 12px 90px',
    flex: 1,
    overflowY: 'auto',
    alignContent: 'start',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        background: '#111214',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseMove={resetHide}
      onClick={resetHide}
    >
      {/* Screen share overlay */}
      {screenTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <video ref={screenRef} autoPlay playsInline
            style={{ flex: 1, width: '100%', objectFit: 'contain' }} />
        </div>
      )}

      {/* Participant grid */}
      <div style={gridStyle}>
        {liveParts.map(p => (
          <ParticipantTile
            key={p.identity}
            participant={p}
            cameraTrack={p.isLocal ? (localVideoTrack || null) : getRemoteCameraTrack(p.identity)}
            isSpeaking={speaking.has(p.identity)}
            isLocal={p.isLocal}
          />
        ))}
        {liveParts.length === 0 && (
          <div style={{ color: '#80848e', textAlign: 'center', padding: 40 }}>
            Đang chờ người tham gia…
          </div>
        )}
      </div>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '14px 18px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: showCtrl ? 1 : 0, transition: 'opacity 0.3s',
        zIndex: 10,
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
            Gọi nhóm · {liveParts.length} người
          </div>
          <div style={{ color: '#3ba55c', fontSize: 12 }}>{formatDuration(callDuration)}</div>
        </div>
        <button onClick={() => setMinimized(true)} style={iconBtn}>
          <Minimize2 size={16} />
        </button>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 20px 28px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
        display: 'flex', justifyContent: 'center', gap: 16,
        opacity: showCtrl ? 1 : 0, transition: 'opacity 0.3s',
        pointerEvents: showCtrl ? 'auto' : 'none',
        zIndex: 10,
      }}>
        <CtrlBtn onClick={toggleMute} active={isMuted}
          icon={isMuted ? <MicOff size={20}/> : <Mic size={20}/>}
          label={isMuted ? 'Bật mic' : 'Tắt mic'} />

        {isVideo && (
          <CtrlBtn onClick={toggleCamera} active={isCameraOff}
            icon={isCameraOff ? <VideoOff size={20}/> : <Video size={20}/>}
            label={isCameraOff ? 'Bật cam' : 'Tắt cam'} />
        )}

        <CtrlBtn onClick={toggleScreenShare} active={isScreenSharing}
          icon={<Monitor size={20}/>}
          label={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
          activeColor="#5865f2" />

        <button onClick={leaveGroupCall} style={{
          ...ctrlBtnBase, background: '#ed4245',
          boxShadow: '0 4px 16px rgba(237,66,69,0.45)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#c0282b'}
          onMouseLeave={e => e.currentTarget.style.background = '#ed4245'}
        >
          <PhoneOff size={22} />
          <span style={{ fontSize: 10 }}>Rời</span>
        </button>
      </div>
    </div>
  );
}

const ctrlBtnBase = {
  width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  color: '#fff', gap: 3, transition: 'background 0.15s',
};
const iconBtn = {
  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
  width: 34, height: 34, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
};

function CtrlBtn({ onClick, active, icon, label, activeColor = '#ed4245' }) {
  return (
    <button onClick={onClick} style={{ ...ctrlBtnBase, background: active ? activeColor : 'rgba(255,255,255,0.18)' }}
      onMouseEnter={e => e.currentTarget.style.background = active ? activeColor : 'rgba(255,255,255,0.28)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? activeColor : 'rgba(255,255,255,0.18)'}
      title={label}>
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </button>
  );
}