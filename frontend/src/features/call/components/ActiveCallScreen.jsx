/**
 * ActiveCallScreen – màn hình cuộc gọi đang hoạt động (audio / video)
 * - Video call: remote video toàn màn hình + PiP local
 * - Audio call: hiển thị avatar + tên + timer
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Maximize2, Minimize2,
} from 'lucide-react';
import { useCall, CALL_STATE } from '../CallContext';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

export default function ActiveCallScreen() {
  const {
    callState, callType, remoteUser,
    localStream, remoteStream,
    isMuted, isCameraOff,
    callDuration, formatDuration,
    endCall, toggleMute, toggleCamera,
  } = useCall();

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);   // ← thêm dòng này


  const [minimized, setMinimized] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);
  // SAU
  useEffect(() => {
    if (!remoteAudioRef.current || !remoteStream) return;
    remoteAudioRef.current.srcObject = remoteStream;
    remoteAudioRef.current.volume = 1.0;
    remoteAudioRef.current.muted = false;
    remoteAudioRef.current.play()
      .then(() => console.log('[Web] Audio đang phát'))
      .catch(err => console.error('[Web] Audio bị block:', err));
  }, [remoteStream]);

  /* Gán srcObject khi stream thay đổi */
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);


  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /* Tự ẩn controls sau 3s không tương tác (chỉ khi video) */
  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (callType === 'video') {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };
  useEffect(() => { if (callType === 'video') resetHideTimer(); }, [callType]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (callState !== CALL_STATE.ACTIVE) return null;

  const name = remoteUser?.displayName || 'Người dùng';
  const isVideo = callType === 'video';

  /* ── Minimized mode (mini pip góc phải) ── */
  if (minimized) {
    return (
      <div onClick={() => setMinimized(false)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
        background: '#1e1f22',
        border: '1px solid #5865f2',
        borderRadius: 16,
        padding: '12px 16px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: 200,
        animation: 'slideInBR 0.2s ease',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#3ba55c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isVideo ? <Video size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
        </div>
        <div>
          <div style={{ color: '#f2f3f5', fontSize: 13, fontWeight: 600 }}>{name}</div>
          <div style={{ color: '#3ba55c', fontSize: 12 }}>{formatDuration(callDuration)}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); endCall(); }} style={{
          marginLeft: 8, background: '#ed4245', border: 'none',
          borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <PhoneOff size={15} />
        </button>
        <style>{`@keyframes slideInBR { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  /* ── Full screen ── */
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        background: isVideo ? '#000' : 'linear-gradient(160deg,#1a1c2e 0%,#0d0f1a 100%)',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
    >
    <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          muted={false}
          style={{ display: 'none' }}
        />
      {/* ── Video streams ── */}
      {isVideo && (
        <>
          {/* Remote (toàn màn hình) */}
          <video ref={remoteVideoRef} autoPlay playsInline style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
          }} />

          {/* Local (PiP góc phải dưới) */}
          <video ref={localVideoRef} autoPlay playsInline muted style={{
            position: 'absolute', bottom: 100, right: 20,
            width: 130, height: 100,
            objectFit: 'cover', borderRadius: 12,
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transform: isCameraOff ? 'none' : undefined,
            display: isCameraOff ? 'none' : 'block',
          }} />

          {/* Placeholder khi tắt camera local */}
          {isCameraOff && (
            <div style={{
              position: 'absolute', bottom: 100, right: 20,
              width: 130, height: 100, borderRadius: 12,
              background: '#1e1f22',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#80848e', fontSize: 11,
            }}>
              <VideoOff size={18} />
            </div>
          )}
        </>
      )}

      {/* ── Audio call: hiển thị avatar giữa màn hình ── */}
      {!isVideo && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          {remoteUser?.avatar
            ? <img src={remoteUser.avatar} alt={name} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover' }} />
            : (
              <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: avatarColor(name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, fontWeight: 700, color: '#fff',
              }}>{initials(name)}</div>
            )
          }
          <div style={{ color: '#f2f3f5', fontSize: 22, fontWeight: 700 }}>{name}</div>
          <div style={{ color: '#3ba55c', fontSize: 16, fontWeight: 600 }}>{formatDuration(callDuration)}</div>
        </div>
      )}

      {/* ── Overlay top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 20px',
        background: isVideo ? 'linear-gradient(to bottom,rgba(0,0,0,0.5) 0%,transparent 100%)' : 'transparent',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'opacity 0.3s',
        opacity: showControls ? 1 : 0,
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{name}</div>
          <div style={{ color: isVideo ? 'rgba(255,255,255,0.7)' : '#3ba55c', fontSize: 13 }}>
            {formatDuration(callDuration)}
          </div>
        </div>
        <button onClick={() => setMinimized(true)} style={{
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
          width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Minimize2 size={16} />
        </button>
      </div>

      {/* ── Controls ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 20px 32px',
        background: isVideo ? 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%)' : 'transparent',
        display: 'flex', justifyContent: 'center', gap: 20,
        transition: 'opacity 0.3s',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        {/* Mute */}
        <ControlBtn
          onClick={toggleMute}
          active={isMuted}
          icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          label={isMuted ? 'Bật mic' : 'Tắt mic'}
          activeColor="#ed4245"
        />

        {/* Camera (chỉ video) */}
        {isVideo && (
          <ControlBtn
            onClick={toggleCamera}
            active={isCameraOff}
            icon={isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
            label={isCameraOff ? 'Bật cam' : 'Tắt cam'}
            activeColor="#ed4245"
          />
        )}

        {/* Kết thúc */}
        <button onClick={endCall} style={{
          width: 60, height: 60, borderRadius: '50%',
          background: '#ed4245', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', gap: 3,
          boxShadow: '0 4px 16px rgba(237,66,69,0.45)',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#c0282b'}
          onMouseLeave={e => e.currentTarget.style.background = '#ed4245'}
        >
          <PhoneOff size={24} />
          <span style={{ fontSize: 10 }}>Cúp máy</span>
        </button>
      </div>
    </div>
  );
}

function ControlBtn({ onClick, active, icon, label, activeColor = '#ed4245' }) {
  return (
    <button onClick={onClick} style={{
      width: 60, height: 60, borderRadius: '50%',
      background: active ? activeColor : 'rgba(255,255,255,0.18)',
      border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', gap: 3,
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = active ? activeColor : 'rgba(255,255,255,0.28)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? activeColor : 'rgba(255,255,255,0.18)'}
      title={label}
    >
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </button>
  );
}
