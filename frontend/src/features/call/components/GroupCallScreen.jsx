/**
 * GroupCallScreen – màn hình cuộc gọi nhóm (audio/video) đang active.
 * Layout thích nghi theo số người + screen share sidebar mode.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, Minimize2, Users, MonitorOff,
} from 'lucide-react';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  '#5865f2','#eb459e','#00b4d8','#57f287',
  '#faa61a','#ed4245','#9b59b6','#e67e22',
];
const avatarColor = (n = '?') =>
  AVATAR_COLORS[(n).charCodeAt(0) % AVATAR_COLORS.length];
const initials = (n = '') => {
  const p = n.trim().split(' ');
  return p.length === 1 ? p[0][0]?.toUpperCase() ?? '?' :
    (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

/**
 * Tính gridTemplateColumns thích nghi:
 *  1 → 1 cột (full width)
 *  2 → 2 cột
 *  3 → 3 cột
 *  4 → 2×2
 *  5-6 → 3 cột
 *  7-9 → 3 cột
 *  10+ → 4 cột (scroll)
 */
const getGridCols = (count) => {
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  if (count <= 6)  return 3;
  if (count <= 9)  return 3;
  return 4;
};

/* ─── ParticipantTile ─────────────────────────────────────────────────── */
function ParticipantTile({ participant, cameraTrack, isSpeaking, isLocal, compact = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !cameraTrack) return;
    cameraTrack.attach(el);
    return () => { try { cameraTrack.detach(el); } catch {} };
  }, [cameraTrack]);

  const name = participant.displayName || participant.name || 'Người dùng';

  return (
    <div style={{
      position: 'relative',
      borderRadius: compact ? 8 : 12,
      overflow: 'hidden',
      background: '#1a1b1e',
      border: `2px solid ${isSpeaking ? '#57f287' : 'transparent'}`,
      transition: 'border-color 0.2s',
      width: '100%',
      height: '100%',
      minHeight: compact ? 80 : 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Video */}
      {cameraTrack && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }}
        />
      )}

      {/* Avatar fallback */}
      {!cameraTrack && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {participant.avatar
            ? <img src={participant.avatar} alt={name}
                style={{ width: compact ? 36 : 64, height: compact ? 36 : 64, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{
                width: compact ? 40 : 64, height: compact ? 40 : 64, borderRadius: '50%',
                background: avatarColor(name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: compact ? 15 : 24, fontWeight: 700, color: '#fff',
                flexShrink: 0,
              }}>
                {initials(name)}
              </div>
          }
        </div>
      )}

      {/* Bottom overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: compact ? '4px 8px' : '6px 10px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 4,
        zIndex: 2,
      }}>
        <span style={{
          color: '#fff', fontSize: compact ? 10 : 12, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}{isLocal ? ' (Bạn)' : ''}
        </span>
        {participant.isMuted && <MicOff size={compact ? 11 : 13} color="#ed4245" style={{ flexShrink: 0 }} />}
      </div>

      {/* Speaking dot */}
      {isSpeaking && (
        <div style={{
          position: 'absolute', top: compact ? 5 : 8, right: compact ? 5 : 8,
          background: '#57f287', borderRadius: '50%',
          width: compact ? 7 : 10, height: compact ? 7 : 10,
          boxShadow: '0 0 6px #57f287', zIndex: 2,
          animation: 'pulse 1s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */
export default function GroupCallScreen() {
  const {
    callState, callType, callDuration, formatDuration,
    isMuted, isCameraOff, isScreenSharing,
    liveParts, localVideoTrack, screenTrack, speaking,
    getRemoteCameraTrack,
    toggleMute, toggleCamera, toggleScreenShare,
    leaveGroupCall,
  } = useGroupCall();

  const screenRef  = useRef(null);
  const [minimized, setMinimized] = useState(false);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const hideTimer  = useRef(null);

  const isActive = callState === GROUP_CALL_STATE.ACTIVE || callState === GROUP_CALL_STATE.CALLING;
  const isVideo  = callType === 'video';
  const hasScreen = !!screenTrack;

  /* attach screen share */
  useEffect(() => {
    const el = screenRef.current;
    if (!el || !screenTrack) return;
    screenTrack.attach(el);
    return () => { try { screenTrack.detach(el); } catch {} };
  }, [screenTrack]);

  /* auto-hide controls */
  const resetHide = useCallback(() => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    if (isVideo) hideTimer.current = setTimeout(() => setShowCtrl(false), 3500);
  }, [isVideo]);

  useEffect(() => { if (isVideo) resetHide(); }, [isVideo, resetHide]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (!isActive) return null;

  /* ── Minimized PiP ──────────────────────────────────────────────────── */
  if (minimized) {
    return (
      <div onClick={() => setMinimized(false)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: '#1e1f22',
        border: '1px solid rgba(88,101,242,0.6)',
        borderRadius: 16, padding: '12px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 210,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#5865f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Users size={18} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#f2f3f5', fontSize: 13, fontWeight: 600 }}>
            Gọi nhóm · {liveParts.length} người
          </div>
          <div style={{ color: '#3ba55c', fontSize: 12 }}>{formatDuration(callDuration)}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); leaveGroupCall(); }}
          style={{
            marginLeft: 'auto', background: '#ed4245', border: 'none',
            borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            flexShrink: 0,
          }}
        >
          <PhoneOff size={15} />
        </button>
      </div>
    );
  }

  /* ── Grid layout (no screen share) ─────────────────────────────────── */
  const count = liveParts.length;
  const cols  = getGridCols(count);

  /* ── Full screen render ─────────────────────────────────────────────── */
  return (
    <>
      {/* Keyframe cho speaking dot */}
      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform: scale(1); }
          50%      { opacity:.6; transform: scale(1.3); }
        }
      `}</style>

      <div
        onMouseMove={resetHide}
        onClick={resetHide}
        style={{
          position: 'fixed', inset: 0, zIndex: 9997,
          background: '#0e0f11',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── TOP BAR ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          padding: '14px 18px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          opacity: showCtrl ? 1 : 0, transition: 'opacity 0.35s',
          pointerEvents: showCtrl ? 'auto' : 'none',
        }}>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>
              Gọi nhóm
              <span style={{
                marginLeft: 8, fontSize: 12, fontWeight: 500,
                background: 'rgba(255,255,255,0.12)', borderRadius: 6,
                padding: '2px 8px', verticalAlign: 'middle',
              }}>
                {liveParts.length} người
              </span>
            </div>
            <div style={{ color: '#3ba55c', fontSize: 12, marginTop: 2 }}>
              {formatDuration(callDuration)}
            </div>
          </div>
          <button onClick={() => setMinimized(true)} style={iconBtn} title="Thu nhỏ">
            <Minimize2 size={16} />
          </button>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          paddingTop: 56,
          paddingBottom: 90,
          overflow: 'hidden',
        }}>
          {/* Screen share mode: large screen + participant strip on right */}
          {hasScreen ? (
            <ScreenShareLayout
              screenRef={screenRef}
              liveParts={liveParts}
              localVideoTrack={localVideoTrack}
              getRemoteCameraTrack={getRemoteCameraTrack}
              speaking={speaking}
            />
          ) : (
            /* Grid mode */
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '8px 10px',
              /* auto rows height to fill viewport */
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 8,
              alignContent: count <= 4 ? 'center' : 'start',
              /* Each tile has aspect-ratio 16/9 */
            }}>
              {liveParts.map(p => (
                <div key={p.identity} style={{ aspectRatio: '16/9' }}>
                  <ParticipantTile
                    participant={p}
                    cameraTrack={p.isLocal
                      ? (localVideoTrack || null)
                      : getRemoteCameraTrack(p.identity)}
                    isSpeaking={speaking.has(p.identity)}
                    isLocal={p.isLocal}
                  />
                </div>
              ))}

              {count === 0 && (
                <div style={{
                  gridColumn: '1/-1',
                  color: '#4e5058', textAlign: 'center',
                  padding: 60, fontSize: 14,
                }}>
                  Đang chờ người tham gia…
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CONTROLS ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          padding: '16px 20px 28px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
          opacity: showCtrl ? 1 : 0, transition: 'opacity 0.35s',
          pointerEvents: showCtrl ? 'auto' : 'none',
        }}>
          <CtrlBtn
            onClick={toggleMute}
            active={isMuted}
            icon={isMuted ? <MicOff size={20}/> : <Mic size={20}/>}
            label={isMuted ? 'Bật mic' : 'Tắt mic'}
          />

          {isVideo && (
            <CtrlBtn
              onClick={toggleCamera}
              active={isCameraOff}
              icon={isCameraOff ? <VideoOff size={20}/> : <Video size={20}/>}
              label={isCameraOff ? 'Bật cam' : 'Tắt cam'}
            />
          )}

          <CtrlBtn
            onClick={toggleScreenShare}
            active={isScreenSharing}
            icon={isScreenSharing ? <MonitorOff size={20}/> : <Monitor size={20}/>}
            label={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
            activeColor="#5865f2"
          />

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          {/* Leave */}
          <button
            onClick={leaveGroupCall}
            title="Rời cuộc gọi"
            style={{ ...ctrlBtnBase, background: '#ed4245', boxShadow: '0 4px 20px rgba(237,66,69,0.5)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#c02b2e'}
            onMouseLeave={e => e.currentTarget.style.background = '#ed4245'}
          >
            <PhoneOff size={22} />
            <span style={{ fontSize: 10 }}>Rời</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Screen share layout ─────────────────────────────────────────────── */
function ScreenShareLayout({ screenRef, liveParts, localVideoTrack, getRemoteCameraTrack, speaking }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 8, padding: '0 8px', overflow: 'hidden' }}>
      {/* Large screen area */}
      <div style={{
        flex: 1, borderRadius: 12, overflow: 'hidden',
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 0,
      }}>
        <video
          ref={screenRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Participant strip – vertical scroll */}
      <div style={{
        width: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflowY: 'auto',
        flexShrink: 0,
        paddingRight: 2,
      }}>
        {liveParts.map(p => (
          <div key={p.identity} style={{ flexShrink: 0, height: 105, borderRadius: 8, overflow: 'hidden' }}>
            <ParticipantTile
              participant={p}
              cameraTrack={p.isLocal
                ? (localVideoTrack || null)
                : getRemoteCameraTrack(p.identity)}
              isSpeaking={speaking.has(p.identity)}
              isLocal={p.isLocal}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Style helpers ───────────────────────────────────────────────────── */
const ctrlBtnBase = {
  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  color: '#fff', gap: 3, transition: 'background 0.15s, transform 0.1s',
  flexShrink: 0,
};

const iconBtn = {
  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
  width: 34, height: 34, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
  transition: 'background 0.15s',
};

function CtrlBtn({ onClick, active, icon, label, activeColor = '#ed4245' }) {
  const bg = active ? activeColor : 'rgba(255,255,255,0.15)';
  const bgHover = active ? activeColor : 'rgba(255,255,255,0.26)';
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ ...ctrlBtnBase, background: bg }}
      onMouseEnter={e => { e.currentTarget.style.background = bgHover; e.currentTarget.style.transform = 'scale(1.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg;     e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
    </button>
  );
}