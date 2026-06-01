/**
 * ActiveCallScreen – màn hình cuộc gọi đang hoạt động (audio / video)
 *
 * FIX: <audio> element mount vô điều kiện (ngoài mọi conditional/minimized)
 *      useEffect re-assign srcObject + play() mỗi khi remoteStream thay đổi
 *      (bao gồm cả lần re-notify từ track.onunmute)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2,
} from 'lucide-react';
import { useCall, CALL_STATE } from '../CallContext';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

export default function ActiveCallScreen() {
  const {
    callState, callType, remoteUser,
    localStream, remoteStream,
    isMuted, isCameraOff,
    callDuration, formatDuration,
    endCall, toggleMute, toggleCamera,
  } = useCall();

  const setLocalVideoRef = (el) => {
    if (el && localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    }
  };
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [minimized, setMinimized]       = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);

  // ── [FIX] Re-assign srcObject + play() mỗi khi remoteStream thay đổi ────
  // Effect này chạy cả khi onunmute trigger re-notify từ useWebRTC,
  // đảm bảo audio element luôn có data mới nhất và đang play.
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !remoteStream) return;

    // Chỉ re-assign nếu stream thật sự khác (tránh flicker)
    if (el.srcObject !== remoteStream) {
      console.log('[Web] re-assigning srcObject, tracks:',
        remoteStream.getAudioTracks().map(t =>
          `${t.kind} enabled=${t.enabled} muted=${t.muted} readyState=${t.readyState}`
        ));
      el.srcObject = remoteStream;
    }

    el.volume = 1.0;
    el.muted  = false;

    const tryPlay = () => {
      el.play()
        .then(() => console.log('[Web] audio.play() OK, muted:', el.muted))
        .catch((err) => {
          console.warn('[Web] audio.play() blocked:', err.message);
          // Autoplay policy: thử lại sau gesture đầu tiên
          const resume = () => {
            el.play().catch(() => {});
            document.removeEventListener('click', resume);
          };
          document.addEventListener('click', resume, { once: true });
        });
    };

    // Nếu track vẫn đang muted (chưa có data), chờ unmute rồi play
    const audioTracks = remoteStream.getAudioTracks();
    if (audioTracks.length > 0 && audioTracks[0].muted) {
      console.log('[Web] track still muted, waiting for unmute to play...');
      audioTracks[0].addEventListener('unmute', tryPlay, { once: true });
      // Vẫn gọi play() ngay — browser sẽ tự buffer và phát khi có data
      tryPlay();
    } else {
      tryPlay();
    }

    return () => {
      // Không null srcObject ở đây — để audio tiếp tục khi re-render
    };
  }, [remoteStream]); // chạy lại mỗi khi remoteStream reference thay đổi

  // ── Gán localStream vào video ─────────────────────────────────────────────
  useEffect(() => {
    if (setLocalVideoRef.current && localStream) {
      setLocalVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff]); // ← thêm isCameraOff

  // ── Gán remoteStream vào video (video call) ───────────────────────────────
  // Phụ thuộc vào callState vì ontrack có thể bắn TRƯỚC khi video element mount
  // (khi callState còn INCOMING). Khi callState → ACTIVE element mới tồn tại,
  // effect phải chạy lại dù remoteStream reference không đổi.
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, callState]);

  // ── Auto-hide controls (video only) ──────────────────────────────────────
  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (callType === 'video') {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };
  useEffect(() => { if (callType === 'video') resetHideTimer(); }, [callType]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── [FIX] <audio> render vô điều kiện — KHÔNG bao giờ unmount ────────────
  // Đặt thành biến JSX để dùng trong mọi return path bên dưới.
  const audioEl = (
    <audio
      ref={remoteAudioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
    />
  );

  // Nếu không active: vẫn render audio để ref không bị destroy
  if (callState !== CALL_STATE.ACTIVE) return audioEl;

  const name    = remoteUser?.displayName || 'Người dùng';
  const isVideo = callType === 'video';

  // ── Minimized PiP ─────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <>
        {audioEl}
        <div
          onClick={() => setMinimized(false)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
            background: '#1e1f22',
            border: '1px solid #5865f2',
            borderRadius: 16,
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 200,
          }}
        >
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
          <button
            onClick={(e) => { e.stopPropagation(); endCall(); }}
            style={{
              marginLeft: 8, background: '#ed4245', border: 'none',
              borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}
          >
            <PhoneOff size={15} />
          </button>
        </div>
      </>
    );
  }

  // ── Full screen ───────────────────────────────────────────────────────────
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
      {/* [FIX] audio luôn ở đây, không bị bọc trong bất kỳ conditional nào */}
      {audioEl}

      {/* ── Video streams ── */}
      {isVideo && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
            }}
          />
          {!isCameraOff ? (
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute', bottom: 100, right: 20,
                width: 130, height: 100,
                objectFit: 'cover', borderRadius: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute', bottom: 100, right: 20,
              width: 130, height: 100, borderRadius: 12,
              background: '#1e1f22',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#80848e',
            }}>
              <VideoOff size={18} />
            </div>
          )}
        </>
      )}

      {/* ── Audio call: avatar ── */}
      {!isVideo && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          {remoteUser?.avatar ? (
            <img
              src={remoteUser.avatar}
              alt={name}
              style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: avatarColor(name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 700, color: '#fff',
            }}>
              {initials(name)}
            </div>
          )}
          <div style={{ color: '#f2f3f5', fontSize: 22, fontWeight: 700 }}>{name}</div>
          <div style={{ color: '#3ba55c', fontSize: 16, fontWeight: 600 }}>
            {formatDuration(callDuration)}
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 20px',
        background: isVideo ? 'linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)' : 'transparent',
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
        <button
          onClick={() => setMinimized(true)}
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
            width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <Minimize2 size={16} />
        </button>
      </div>

      {/* ── Controls ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 20px 32px',
        background: isVideo ? 'linear-gradient(to top,rgba(0,0,0,0.65),transparent)' : 'transparent',
        display: 'flex', justifyContent: 'center', gap: 20,
        transition: 'opacity 0.3s',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        <ControlBtn
          onClick={toggleMute}
          active={isMuted}
          icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          label={isMuted ? 'Bật mic' : 'Tắt mic'}
        />
        {isVideo && (
          <ControlBtn
            onClick={toggleCamera}
            active={isCameraOff}
            icon={isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
            label={isCameraOff ? 'Bật cam' : 'Tắt cam'}
          />
        )}
        <button
          onClick={endCall}
          style={{
            width: 60, height: 60, borderRadius: '50%',
            background: '#ed4245', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', gap: 3,
            boxShadow: '0 4px 16px rgba(237,66,69,0.45)',
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
    <button
      onClick={onClick}
      style={{
        width: 60, height: 60, borderRadius: '50%',
        background: active ? activeColor : 'rgba(255,255,255,0.18)',
        border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
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