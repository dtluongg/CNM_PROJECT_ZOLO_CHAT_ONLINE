import { Phone, Video } from 'lucide-react';
import { getAvatarColor } from '../utils/avatarUtils';
import MiniAvatar from './MiniAvatar'

const SystemMessage = ({ msg }) => {
  const isVideo = msg.payload?.callType === 'video';
  const status = msg.payload?.status;
  const isMissed = status === 'missed';
  const isRejected = status === 'rejected';
  const isBad = isMissed || isRejected;

  const callerName =
    msg.callerName ||
    msg.payload?.callerName ||
    '?';

  const callerAvatar =
    msg.callerAvatar ||
    msg.payload?.callerAvatar ||
    null;

  const calleeName =
    msg.calleeName ||
    msg.payload?.calleeName ||
    '?';

  const calleeAvatar =
    msg.calleeAvatar ||
    msg.payload?.calleeAvatar ||
    null;

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

  const color = isBad ? '#ed4245' : 'var(--text-muted)';
  const bg = isBad ? '#ed424512' : 'var(--bg-secondary)';
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
        <MiniAvatar
          name={callerName}
          avatar={callerAvatar}
        />

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

        <MiniAvatar
          name={calleeName}
          avatar={calleeAvatar}
        />
      </div>
    </div>
  );
};

export default SystemMessage;