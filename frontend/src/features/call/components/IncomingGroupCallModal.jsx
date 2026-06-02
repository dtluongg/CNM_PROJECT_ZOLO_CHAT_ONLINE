/**
 * IncomingGroupCallModal – overlay khi có group call đến
 */
import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Users } from 'lucide-react';
import { useGroupCall, GROUP_CALL_STATE } from '../GroupCallContext';

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

export default function IncomingGroupCallModal() {
  const { callState, callType, incomingData, acceptGroupCall, declineGroupCall } = useGroupCall();
  const isVisible = callState === GROUP_CALL_STATE.INCOMING && incomingData;

  // Ringtone
  useEffect(() => {
    if (!isVisible) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;
    const ring = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      if (!stopped) setTimeout(ring, 1800);
    };
    ring();
    return () => { stopped = true; ctx.close(); };
  }, [isVisible]);

  if (!isVisible) return null;

  const initiator  = incomingData?.initiator || {};
  const group      = incomingData?.group || {};
  const groupName  = group.name || 'Nhóm';
  const groupAvatar = group.avatar;
  const label      = callType === 'video' ? 'Gọi video nhóm' : 'Gọi thoại nhóm';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      animation: 'gcFadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 20,
        padding: '36px 40px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, width: 300,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid var(--border)',
      }}>
        {/* Group avatar (lớn) + initiator avatar (nhỏ, góc dưới phải) */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <div style={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            background: '#5865f2', opacity: 0.15,
            animation: 'gcPulse 1.5s ease-in-out infinite',
          }} />
          {groupAvatar
            ? <img src={groupAvatar} alt={groupName} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 80, height: 80, borderRadius: '50%', background: avatarColor(groupName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: '#fff' }}>{initials(groupName)}</div>
          }
          {/* Initiator avatar nhỏ góc dưới */}
          <div style={{ position: 'absolute', bottom: -2, right: -2, borderRadius: '50%', border: '2px solid var(--bg-secondary)' }}>
            {initiator.avatar
              ? <img src={initiator.avatar} alt={initiator.displayName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(initiator.displayName || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{initials(initiator.displayName)}</div>
            }
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>{groupName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{initiator.displayName || 'Ai đó'} đang gọi</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, opacity: 0.8 }}>{label}</div>
        </div>

        <div style={{ display: 'flex', gap: 28, marginTop: 16 }}>
          <button onClick={declineGroupCall} style={btnStyle('#ed4245')}
            onMouseEnter={e => e.currentTarget.style.background = '#c0282b'}
            onMouseLeave={e => e.currentTarget.style.background = '#ed4245'}
            title="Từ chối">
            <PhoneOff size={24} />
          </button>
          <button onClick={acceptGroupCall} style={btnStyle('#3ba55c')}
            onMouseEnter={e => e.currentTarget.style.background = '#2d8249'}
            onMouseLeave={e => e.currentTarget.style.background = '#3ba55c'}
            title="Tham gia">
            {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 32, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Từ chối</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tham gia</span>
        </div>
      </div>

      <style>{`
        @keyframes gcFadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes gcPulse  { 0%,100% { transform: scale(1); opacity: 0.15; } 50% { transform: scale(1.3); opacity: 0.08; } }
      `}</style>
    </div>
  );
}

const btnStyle = (bg) => ({
  width: 62, height: 62, borderRadius: '50%', border: 'none',
  background: bg, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', transition: 'background 0.15s',
});