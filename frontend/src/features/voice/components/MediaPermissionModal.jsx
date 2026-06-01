import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, CheckCircle, XCircle, Loader, Volume2 } from 'lucide-react';

const STATUS = { idle: 'idle', checking: 'checking', granted: 'granted', denied: 'denied' };

export default function MediaPermissionModal({ onConfirm, onCancel }) {
  const [micStatus, setMicStatus]   = useState(STATUS.idle);
  const [camStatus, setCamStatus]   = useState(STATUS.idle);
  const [checking, setChecking]     = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const streamRef = useRef(null);

  const requestPermissions = async () => {
    setChecking(true);
    setErrorMsg('');
    setMicStatus(STATUS.checking);
    setCamStatus(STATUS.checking);

    // Try mic + camera together
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(t => t.stop()); // LiveKit sẽ tự lấy lại
      setMicStatus(STATUS.granted);
      setCamStatus(STATUS.granted);
      setChecking(false);
      return;
    } catch (_) {}

    // Fallback: try mic only (camera might be absent or blocked)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(t => t.stop());
      setMicStatus(STATUS.granted);
      setCamStatus(STATUS.denied);
      setChecking(false);
      return;
    } catch (err) {
      setMicStatus(STATUS.denied);
      setCamStatus(STATUS.denied);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Bạn đã chặn quyền micro. Vui lòng cho phép trong cài đặt trình duyệt rồi thử lại.');
      } else {
        setErrorMsg(`Không thể truy cập micro: ${err.message}`);
      }
    }
    setChecking(false);
  };

  // Probe existing permission state without triggering browser prompt
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'microphone' }).then(r => {
      if (r.state === 'granted') setMicStatus(STATUS.granted);
      if (r.state === 'denied')  setMicStatus(STATUS.denied);
    }).catch(() => {});
    navigator.permissions.query({ name: 'camera' }).then(r => {
      if (r.state === 'granted') setCamStatus(STATUS.granted);
      if (r.state === 'denied')  setCamStatus(STATUS.denied);
    }).catch(() => {});
  }, []);

  // Auto-request when both are still idle
  useEffect(() => {
    if (micStatus === STATUS.idle && camStatus === STATUS.idle) {
      const timer = setTimeout(() => {
        requestPermissions();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup stream tracks on unmount
  useEffect(() => {
    const currentStream = streamRef.current;
    return () => {
      currentStream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const canJoin = micStatus === STATUS.granted;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Icon + Title */}
        <div style={styles.header}>
          <div style={styles.iconCircle}><Volume2 size={28} color="#57f287" /></div>
          <h2 style={styles.title}>Tham gia kênh thoại</h2>
          <p style={styles.subtitle}>
            Cho phép truy cập thiết bị để tham gia phòng thoại
          </p>
        </div>

        {/* Permission rows */}
        <div style={styles.permList}>
          <PermRow
            icon={micStatus === STATUS.denied ? <MicOff size={20} /> : <Mic size={20} />}
            label="Micro"
            description="Bắt buộc để nói chuyện trong phòng"
            status={micStatus}
            required
          />
          <PermRow
            icon={camStatus === STATUS.denied ? <VideoOff size={20} /> : <Video size={20} />}
            label="Camera"
            description="Tuỳ chọn — có thể bật/tắt sau"
            status={camStatus}
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={styles.errorBox}>
            <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Camera denied notice (non-blocking) */}
        {camStatus === STATUS.denied && micStatus === STATUS.granted && (
          <div style={styles.noticeBox}>
            Camera bị từ chối — bạn vẫn có thể tham gia bằng micro.
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Hủy
          </button>

          {!canJoin ? (
            <button
              style={{ ...styles.confirmBtn, opacity: checking ? 0.7 : 1 }}
              onClick={requestPermissions}
              disabled={checking}
            >
              {checking
                ? <><Loader size={15} style={styles.spin} /> Đang kiểm tra...</>
                : 'Cho phép truy cập'
              }
            </button>
          ) : (
            <button style={styles.confirmBtn} onClick={onConfirm}>
              <Volume2 size={15} /> Tham gia
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PermRow({ icon, label, description, status, required }) {
  const statusColor = {
    [STATUS.idle]:     '#888',
    [STATUS.checking]: '#faa61a',
    [STATUS.granted]:  '#57f287',
    [STATUS.denied]:   '#ed4245',
  }[status];

  const renderStatusIcon = () => {
    if (status === STATUS.checking) return <Loader size={16} color="#faa61a" style={styles.spin} />;
    if (status === STATUS.granted)  return <CheckCircle size={16} color="#57f287" />;
    if (status === STATUS.denied)   return <XCircle size={16} color="#ed4245" />;
    return null;
  };

  return (
    <div style={styles.permRow}>
      <div style={{ ...styles.permIcon, color: statusColor }}>{icon}</div>
      <div style={styles.permText}>
        <div style={styles.permLabel}>
          {label}
          {required && <span style={styles.badge}>Bắt buộc</span>}
        </div>
        <div style={styles.permDesc}>{description}</div>
      </div>
      <div style={styles.statusIcon}>{renderStatusIcon()}</div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#2b2d31',
    borderRadius: 18,
    padding: '32px 28px 24px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  header: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: '50%',
    background: 'rgba(87,242,135,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' },
  subtitle: { margin: 0, fontSize: 13, color: '#aaa', lineHeight: 1.5 },
  permList: {
    display: 'flex', flexDirection: 'column', gap: 10,
    background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px',
  },
  permRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0',
  },
  permIcon: { flexShrink: 0 },
  permText: { flex: 1 },
  permLabel: { fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 },
  permDesc:  { fontSize: 11, color: '#888', marginTop: 2 },
  badge: {
    fontSize: 10, fontWeight: 600, background: '#5865f220', color: '#5865f2',
    borderRadius: 6, padding: '1px 6px',
  },
  statusIcon: { flexShrink: 0 },
  errorBox: {
    display: 'flex', gap: 8, alignItems: 'flex-start',
    background: '#ed424520', border: '1px solid #ed424540',
    borderRadius: 10, padding: '10px 12px',
    fontSize: 12, color: '#ed4245', lineHeight: 1.5,
  },
  noticeBox: {
    background: '#faa61a18', border: '1px solid #faa61a30',
    borderRadius: 10, padding: '10px 12px',
    fontSize: 12, color: '#faa61a',
  },
  actions: {
    display: 'flex', gap: 10,
  },
  cancelBtn: {
    flex: 1, padding: '11px 0', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: 'none',
    color: '#ccc', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  confirmBtn: {
    flex: 2, padding: '11px 0', borderRadius: 10,
    background: '#57f287', border: 'none',
    color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  spin: { animation: 'spin 1s linear infinite' },
};
