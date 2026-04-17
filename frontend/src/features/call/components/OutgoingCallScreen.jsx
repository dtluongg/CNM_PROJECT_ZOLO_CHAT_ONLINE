/**
 * OutgoingCallScreen – màn hình chờ callee trả lời
 * Hiển thị: tên, avatar, bộ đếm giây, thông báo "vẫn chờ" sau 5s
 */
import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Video, Phone } from 'lucide-react';
import { useCall, CALL_STATE } from '../CallContext';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

export default function OutgoingCallScreen() {
  const { callState, callType, remoteUser, endCall } = useCall();
  const [ringSeconds, setRingSeconds] = useState(0);
  const timerRef = useRef(null);

  const isVisible = callState === CALL_STATE.CALLING;

  // Đếm số giây đang đổ chuông
  useEffect(() => {
    if (!isVisible) { setRingSeconds(0); return; }
    setRingSeconds(0);
    timerRef.current = setInterval(() => setRingSeconds((p) => p + 1), 1000);
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [isVisible]);

  if (!isVisible) return null;

  const name   = remoteUser?.displayName || 'Người dùng';
  const avatar = remoteUser?.avatar;
  const waited5s = ringSeconds >= 5;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'linear-gradient(160deg, #1a1c2e 0%, #0d0f1a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.25s ease',
    }}>
      {/* Ripple rings */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            inset: -(20 + i * 18),
            borderRadius: '50%',
            border: '1.5px solid rgba(88,101,242,0.35)',
            animation: `ripple 2.4s ease-in-out ${i * 0.6}s infinite`,
          }} />
        ))}
        {avatar
          ? <img src={avatar} alt={name} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
          : (
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: avatarColor(name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: '#fff',
              position: 'relative', zIndex: 1,
            }}>{initials(name)}</div>
          )
        }
      </div>

      <div style={{ color: '#f2f3f5', fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{name}</div>

      {/* Trạng thái + bộ đếm giây */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#80848e', fontSize: 15, marginBottom: 8 }}>
        {callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
        <span>Đang đổ chuông</span>
        <span style={{
          fontVariantNumeric: 'tabular-nums',
          color: '#b5bac1', fontSize: 14,
        }}>
          {`${String(Math.floor(ringSeconds / 60)).padStart(2,'0')}:${String(ringSeconds % 60).padStart(2,'0')}`}
        </span>
      </div>

      {/* Hiển thị sau 5 giây nếu chưa trả lời */}
      <div style={{
        fontSize: 12, color: '#faa61a',
        marginBottom: 52,
        opacity: waited5s ? 1 : 0,
        transition: 'opacity 0.5s',
        height: 18,
      }}>
        {waited5s && 'Vẫn đang chờ phản hồi...'}
      </div>

      {/* Nút cúp máy */}
      <button onClick={endCall} style={{
        width: 68, height: 68, borderRadius: '50%',
        background: '#ed4245', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', boxShadow: '0 4px 20px rgba(237,66,69,0.5)',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#c0282b'}
        onMouseLeave={e => e.currentTarget.style.background = '#ed4245'}
      >
        <PhoneOff size={28} />
      </button>
      <span style={{ color: '#80848e', fontSize: 12, marginTop: 10 }}>Huỷ</span>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ripple {
          0%   { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
