import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Upload, Camera, User, CameraOff, SwitchCamera, QrCode, ChevronRight } from 'lucide-react';
import jsQR from 'jsqr';
import userApi from '../api/userApi';
import { usePresence } from '../../../context/PresenceContext';  // ✅ THÊM DÒNG NÀY

const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

const STATUS_COLOR = { online: '#3ba55c', idle: '#faa61a', dnd: '#ed4245', offline: '#80848e', invisible: '#80848e' };

function UserCard({ user, onClick, isOnline, presStatus }) {
  const [hovered, setHovered] = useState(false);
  const accentColor = user.usernameColor || getAvatarColor(user.displayName);
   const displayStatus = isOnline
      ? (presStatus || 'online')
      : 'offline';  // Offline = luôn XÁM

    const statusColor = STATUS_COLOR[displayStatus] || '#80848e';
  return (
    <div
      onClick={() => onClick(user)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
        transition: 'background 0.12s', border: '1px solid var(--border)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.displayName}
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 17, userSelect: 'none',
          }}>
            {getInitials(user.displayName)}
          </div>
        )}
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 11, height: 11, borderRadius: '50%',
          background: statusColor || '#80848e',
          border: '2px solid var(--bg-secondary)',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: user.usernameColor || 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName}
        </div>
        {user.username && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</div>
        )}
        {user.bio && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {user.bio}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>Xem hồ sơ</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

export default function UserSearchModal({ onClose }) {
  const navigate = useNavigate();
  const { isUserOnline, getPresenceStatus } = usePresence();  // ✅ THÊM DÒNG NÀY
  const [tab, setTab] = useState('search'); // 'search' | 'qr'
  const [qrMode, setQrMode] = useState('upload'); // 'upload' | 'camera'

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimerRef = useRef(null);

  // Upload QR state
  const [qrResult, setQrResult] = useState(null);
  const [qrError, setQrError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const qrInputRef = useRef(null);

  // Camera QR state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanAnimRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraResult, setCameraResult] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [scanning, setScanning] = useState(false);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (scanAnimRef.current) {
      cancelAnimationFrame(scanAnimRef.current);
      scanAnimRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  // Start camera
  const startCamera = useCallback(async (facing = facingMode) => {
    stopCamera();
    setCameraError('');
    setCameraResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Bị từ chối quyền camera. Hãy cho phép quyền camera trong trình duyệt.'
        : err.name === 'NotFoundError'
        ? 'Không tìm thấy camera trên thiết bị.'
        : 'Không thể mở camera. Vui lòng thử lại.';
      setCameraError(msg);
    }
  }, [facingMode, stopCamera]);

  // Scan QR from camera frame
  const scanFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !streamRef.current) {
      scanAnimRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

    if (code) {
      const match = code.data.match(/\/user\/([a-f\d]{24})/i);
      if (match) {
        stopCamera();
        setScanning(true);
        try {
          const res = await userApi.getUserProfile(match[1]);
          setCameraResult({ userId: match[1], profile: res.data.user });
        } catch {
          setCameraError('Không thể tải thông tin người dùng từ mã QR.');
        } finally {
          setScanning(false);
        }
        return;
      }
    }
    scanAnimRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  // Start scanning loop when camera is active
  useEffect(() => {
    if (cameraActive) {
      scanAnimRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current);
    };
  }, [cameraActive, scanFrame]);

  // Cleanup on unmount or tab change
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (tab !== 'qr') stopCamera();
  }, [tab, stopCamera]);

  useEffect(() => {
    if (qrMode !== 'camera') stopCamera();
  }, [qrMode, stopCamera]);

  // Flip camera
  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // Search debounce
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSearchError('');
    clearTimeout(searchTimerRef.current);
    if (val.trim().length < 2) { setResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await userApi.searchUsers(val.trim());
        setResults(res.data.users || []);
        if ((res.data.users || []).length === 0) setSearchError('Không tìm thấy người dùng nào.');
      } catch (err) {
        setSearchError(err.response?.data?.message || 'Lỗi khi tìm kiếm.');
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  // Upload QR
  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setQrError('Vui lòng chọn file ảnh.'); return; }
    setQrLoading(true); setQrError(''); setQrResult(null);
    setQrPreview(URL.createObjectURL(file));
    try {
      const imageData = await readImageData(file);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code) { setQrError('Không tìm thấy mã QR trong ảnh.'); setQrLoading(false); return; }
      const match = code.data.match(/\/user\/([a-f\d]{24})/i);
      if (!match) { setQrError(`Mã QR không hợp lệ. Nội dung: "${code.data.slice(0, 60)}"`); setQrLoading(false); return; }
      const res = await userApi.getUserProfile(match[1]);
      setQrResult({ userId: match[1], profile: res.data.user });
    } catch { setQrError('Không thể đọc mã QR. Hãy đảm bảo ảnh rõ nét.'); }
    finally { setQrLoading(false); }
  };

  const readImageData = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(c.getContext('2d').getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });

  const handleViewUser = (userOrId) => {
    const uid = typeof userOrId === 'string' ? userOrId : userOrId._id;
    onClose();
    navigate(`/user/${uid}`);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, backdropFilter: 'blur(3px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 16, width: 480, maxWidth: '96vw',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            Tìm kiếm người dùng
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Main Tabs */}
        <div style={{ display: 'flex', gap: 2, margin: '14px 20px 0', background: 'var(--bg-primary)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {[
            { key: 'search', label: 'Tìm kiếm', icon: <Search size={14} /> },
            { key: 'qr',     label: 'Quét QR', icon: <QrCode size={14} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, background: tab === t.key ? 'var(--bg-secondary)' : 'none',
              border: 'none', cursor: 'pointer', padding: '7px 4px', borderRadius: 6,
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 700 : 500, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.12s',
            }}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px', scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent' }}>

          {/* ── Search Tab ── */}
          {tab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-primary)', borderRadius: 10,
                padding: '10px 14px', border: '1.5px solid var(--border)',
                transition: 'border-color 0.15s',
              }}
                onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Nhập tên, @username hoặc email..."
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14 }}
                />
                {searching && (
                  <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm.
              </p>
              {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {results.length} kết quả
                  </div>
                  {results.map(u => (
                    <UserCard
                      key={u._id}
                      user={u}
                      onClick={handleViewUser}
                      isOnline={isUserOnline(u._id)}
                      presStatus={getPresenceStatus(u._id)}
                    />
                  ))}
                </div>
              )}
              {searchError && query.length >= 2 && !searching && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                  <User size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div>{searchError}</div>
                </div>
              )}
            </div>
          )}

          {/* ── QR Tab ── */}
          {tab === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Sub-mode toggle */}
              <div style={{ display: 'flex', gap: 2, background: 'var(--bg-primary)', borderRadius: 8, padding: 3 }}>
                {[
                  { key: 'camera', icon: <Camera size={14} />, label: 'Dùng camera' },
                  { key: 'upload', icon: <Upload size={14} />, label: 'Tải ảnh lên' },
                ].map(m => (
                  <button key={m.key} onClick={() => setQrMode(m.key)} style={{
                    flex: 1, background: qrMode === m.key ? 'var(--bg-secondary)' : 'none',
                    border: 'none', cursor: 'pointer', padding: '6px 4px', borderRadius: 6,
                    color: qrMode === m.key ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: qrMode === m.key ? 700 : 500, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.12s',
                  }}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {/* ── Camera mode ── */}
              {qrMode === 'camera' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {/* Video viewport */}
                  <div style={{
                    width: '100%', maxWidth: 380, aspectRatio: '4/3',
                    background: '#000', borderRadius: 14, overflow: 'hidden',
                    position: 'relative', border: '2px solid var(--border)',
                  }}>
                    <video
                      ref={videoRef}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        display: cameraActive ? 'block' : 'none',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      }}
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Overlay when camera not active */}
                    {!cameraActive && !scanning && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 12, color: '#aaa',
                      }}>
                        <CameraOff size={40} style={{ opacity: 0.4 }} />
                        <div style={{ fontSize: 13, textAlign: 'center', padding: '0 20px' }}>
                          {cameraError || 'Nhấn "Mở camera" để bắt đầu quét QR'}
                        </div>
                      </div>
                    )}

                    {/* Scanning loader */}
                    {scanning && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)', gap: 12,
                      }}>
                        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <div style={{ color: '#fff', fontSize: 13 }}>Đang tải thông tin...</div>
                      </div>
                    )}

                    {/* Scan frame indicator */}
                    {cameraActive && (
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {/* Corner markers */}
                        {[
                          { top: 20, left: 20, borderTop: '3px solid #5865f2', borderLeft: '3px solid #5865f2' },
                          { top: 20, right: 20, borderTop: '3px solid #5865f2', borderRight: '3px solid #5865f2' },
                          { bottom: 20, left: 20, borderBottom: '3px solid #5865f2', borderLeft: '3px solid #5865f2' },
                          { bottom: 20, right: 20, borderBottom: '3px solid #5865f2', borderRight: '3px solid #5865f2' },
                        ].map((s, i) => (
                          <div key={i} style={{ position: 'absolute', width: 24, height: 24, borderRadius: 3, ...s }} />
                        ))}
                        {/* Scan line animation */}
                        <div style={{
                          position: 'absolute', left: '10%', right: '10%', height: 2,
                          background: 'linear-gradient(90deg, transparent, #5865f2, transparent)',
                          animation: 'scanLine 2s ease-in-out infinite',
                        }} />
                      </div>
                    )}

                    {/* Flip camera button */}
                    {cameraActive && (
                      <button
                        onClick={handleFlipCamera}
                        title="Đổi camera"
                        style={{
                          position: 'absolute', bottom: 10, right: 10,
                          background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 8,
                          padding: '6px 8px', cursor: 'pointer', color: '#fff',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <SwitchCamera size={16} />
                      </button>
                    )}
                  </div>

                  {/* Camera controls */}
                  {!cameraActive && !scanning ? (
                    <button
                      onClick={() => startCamera(facingMode)}
                      style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 10, padding: '10px 28px', cursor: 'pointer',
                        fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <Camera size={16} /> Mở camera
                    </button>
                  ) : cameraActive ? (
                    <button
                      onClick={stopCamera}
                      style={{
                        background: 'rgba(237,66,69,0.15)', color: '#ed4245', border: '1px solid rgba(237,66,69,0.35)',
                        borderRadius: 10, padding: '8px 24px', cursor: 'pointer',
                        fontWeight: 600, fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <CameraOff size={14} /> Tắt camera
                    </button>
                  ) : null}

                  {cameraError && (
                    <div style={{
                      width: '100%', background: 'rgba(237,66,69,0.12)',
                      border: '1px solid rgba(237,66,69,0.35)', borderRadius: 8,
                      padding: '10px 14px', color: '#ed4245', fontSize: 13,
                    }}>
                      ⚠️ {cameraError}
                    </div>
                  )}

                  {/* Camera result */}
                  {cameraResult && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#3ba55c', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>
                        ✓ Quét thành công
                      </div>
                      <UserCard user={cameraResult.profile} onClick={() => handleViewUser(cameraResult.userId)} />
                      <button
                        onClick={() => { setCameraResult(null); startCamera(facingMode); }}
                        style={{
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '7px 0', cursor: 'pointer',
                          color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                        }}
                      >
                        Quét lại
                      </button>
                    </div>
                  )}

                  {!cameraActive && !cameraResult && !cameraError && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                      Hướng camera vào mã QR của ZoloChat để tự động nhận diện
                    </p>
                  )}
                </div>
              )}

              {/* ── Upload mode ── */}
              {qrMode === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <div
                    onClick={() => qrInputRef.current?.click()}
                    style={{
                      width: '100%', border: '2px dashed var(--border)',
                      borderRadius: 12, padding: '24px 20px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                      background: 'var(--bg-tertiary)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  >
                    {qrLoading
                      ? <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      : <Upload size={32} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                    }
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {qrLoading ? 'Đang đọc mã QR...' : 'Tải ảnh mã QR lên'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        JPG, PNG, WebP — ảnh chứa mã QR của ZoloChat
                      </div>
                    </div>
                  </div>
                  <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} />

                  {qrPreview && !qrLoading && (
                    <img src={qrPreview} alt="QR preview"
                      style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10, border: '1px solid var(--border)' }}
                    />
                  )}

                  {qrError && (
                    <div style={{
                      width: '100%', background: 'rgba(237,66,69,0.15)',
                      border: '1px solid rgba(237,66,69,0.4)', borderRadius: 8,
                      padding: '10px 14px', color: '#ed4245', fontSize: 13,
                    }}>
                      ⚠️ {qrError}
                    </div>
                  )}

                  {qrResult && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#3ba55c', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>
                        ✓ Tìm thấy người dùng
                      </div>
                      <UserCard user={qrResult.profile} onClick={() => handleViewUser(qrResult.userId)} />
                    </div>
                  )}

                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                    Chụp màn hình hoặc lưu mã QR từ trang hồ sơ của người dùng, sau đó tải lên đây.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanLine {
          0%   { top: 15%; }
          50%  { top: 80%; }
          100% { top: 15%; }
        }
      `}</style>
    </div>
  );
}
