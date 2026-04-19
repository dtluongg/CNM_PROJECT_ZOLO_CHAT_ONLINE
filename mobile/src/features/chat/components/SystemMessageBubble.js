import { Phone, Video, LogIn, LogOut, UserX } from 'lucide-react';
import MiniAvatar from './Avatar'

const SystemMessage = ({ msg }) => {
  const event = msg.payload?.event;

  // ── Sự kiện thành viên ─────────────────────────────────────────────────────
  if (event === 'member_join') {
    const actorName   = msg.payload?.actorName   || '?';
    const actorAvatar = msg.payload?.actorAvatar || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 16px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #5865f212 0%, #43b58112 100%)',
          border: '1px solid #5865f230',
          borderRadius: 14,
          padding: '14px 24px',
          minWidth: 220,
        }}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MiniAvatar name={actorName} avatar={actorAvatar} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5865f2' }}>
              {actorName} đã tham gia nhóm!
            </span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>
            {msg.time}
          </span>
        </div>
      </div>
    );
  }

  if (event === 'member_leave') {
    const actorName   = msg.payload?.actorName   || '?';
    const actorAvatar = msg.payload?.actorAvatar || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 30,
          padding: '7px 14px',
          userSelect: 'none',
        }}>
          <MiniAvatar name={actorName} avatar={actorAvatar} />
          <LogOut size={12} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {actorName} đã rời khỏi nhóm
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            {msg.time}
          </span>
        </div>
      </div>
    );
  }

  if (event === 'member_kick') {
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    const reason       = msg.payload?.reason       || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#ed424512',
          border: '1px solid #ed424540',
          borderRadius: 30,
          padding: '7px 14px',
          userSelect: 'none',
        }}>
          <MiniAvatar name={targetName} avatar={targetAvatar} />
          <UserX size={12} color="#ed4245" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ed4245' }}>
              {targetName} đã bị xóa khỏi nhóm
            </span>
            {reason && (
              <span style={{ fontSize: 10, color: '#ed4245', opacity: 0.75 }}>
                Lý do: {reason}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#ed4245', opacity: 0.6 }}>
            {msg.time}
          </span>
        </div>
      </div>
    );
  }

  // ── Sự kiện cuộc gọi ───────────────────────────────────────────────────────
  const isVideo = msg.payload?.callType === 'video';
  const status = msg.payload?.status;
  const isMissed = status === 'missed';
  const isRejected = status === 'rejected';
  const isBad = isMissed || isRejected;

  const callerName   = msg.callerName   || msg.payload?.callerName   || '?';
  const callerAvatar = msg.callerAvatar || msg.payload?.callerAvatar || null;
  const calleeName   = msg.calleeName   || msg.payload?.calleeName   || '?';
  const calleeAvatar = msg.calleeAvatar || msg.payload?.calleeAvatar || null;

  let label;
  if (status === 'ended') {
    const dur = msg.payload?.duration || 0;
    const m = Math.floor(dur / 60);
    const s = dur % 60;
    const durStr = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
    label = `Cuộc gọi ${isVideo ? 'video' : 'thoại'} · ${durStr}`;
  } else if (isMissed) {
    label = 'Cuộc gọi nhỡ';
  } else if (isRejected) {
    label = 'Cuộc gọi bị từ chối';
  } else {
    label = msg.content;
  }

  const color  = isBad ? '#ed4245' : 'var(--text-muted)';
  const bg     = isBad ? '#ed424512' : 'var(--bg-secondary)';
  const border = isBad ? '1px solid #ed424540' : '1px solid var(--border)';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: bg,
        border,
        borderRadius: 30,
        padding: '8px 14px',
        userSelect: 'none',
      }}>
        <MiniAvatar name={callerName} avatar={callerAvatar} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {isVideo
              ? <Video size={12} color={color} />
              : <Phone size={12} color={color} />}
            <span style={{ fontSize: 12, fontWeight: 600, color }}>
              {label}
            </span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>
            {msg.time}
          </span>
        </div>

        <MiniAvatar name={calleeName} avatar={calleeAvatar} />
      </div>
    </div>
  );
};

export default SystemMessage;
