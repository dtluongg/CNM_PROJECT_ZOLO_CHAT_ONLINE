import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Volume2, Loader, Minimize2,
} from 'lucide-react';
import { useVoiceRoomContext } from '../VoiceRoomContext';
import MediaPermissionModal from './MediaPermissionModal';

const COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarBg = (name) => COLORS[(name || '?').charCodeAt(0) % COLORS.length];
const initials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

// ── Participant card ──────────────────────────────────────────────────────
function ParticipantCard({ participant, size, currentUserId, localVideoTrack, getRemoteCameraTrack }) {
  const videoRef = useRef(null);
  const [imgErr, setImgErr] = useState(false);
  const [prevAvatar, setPrevAvatar] = useState(participant.avatar);

  if (participant.avatar !== prevAvatar) {
    setPrevAvatar(participant.avatar);
    setImgErr(false);
  }

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const track = participant.isLocal
      ? localVideoTrack
      : getRemoteCameraTrack(participant.identity);
    if (track) {
      track.attach(el);
      return () => { try { track.detach(el); } catch (err) { console.debug(err); } };
    } else {
      el.srcObject = null;
    }
  }, [participant.isLocal, participant.identity, localVideoTrack, getRemoteCameraTrack]);

  const showVideo = participant.isLocal
    ? !!localVideoTrack
    : !!getRemoteCameraTrack(participant.identity);

  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: 14,
      border: participant.isSpeaking ? '3px solid #57f287' : '3px solid rgba(255,255,255,0.08)',
      boxShadow: participant.isSpeaking ? '0 0 0 4px #57f28733' : 'none',
      overflow: 'hidden', background: showVideo ? '#000' : avatarBg(participant.displayName),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'border-color 0.15s, box-shadow 0.15s', flexShrink: 0,
    }}>
      <video ref={videoRef} autoPlay muted={participant.isLocal} playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: showVideo ? 'block' : 'none' }} />

      {!showVideo && (
        <>
          {participant.avatar && !imgErr ? (
            <img src={participant.avatar} alt={participant.displayName} onError={() => setImgErr(true)}
              style={{ width: '58%', height: '58%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '58%', height: '58%', borderRadius: '50%', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.22, fontWeight: 800, color: '#fff' }}>
              {initials(participant.displayName)}
            </div>
          )}
        </>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 6px 5px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        {participant.isMuted && <MicOff size={Math.max(9, size * 0.09)} color="#ed4245" style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: Math.max(10, size * 0.1), fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {participant.displayName}
          {participant.userId === currentUserId && <span style={{ opacity: 0.6, fontSize: Math.max(8, size * 0.08) }}> (bạn)</span>}
        </span>
        {participant.isSpeaking && <Volume2 size={Math.max(9, size * 0.09)} color="#57f287" style={{ flexShrink: 0 }} />}
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, active, danger, title, disabled, icon, label, small }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: small ? 3 : 5,
        background: active ? (danger ? '#ed4245' : '#57f28799') : hov ? 'var(--bg-hover, rgba(255,255,255,0.1))' : 'rgba(255,255,255,0.06)',
        border: 'none', borderRadius: small ? 10 : 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: small ? '8px 10px' : '12px 20px',
        minWidth: small ? 50 : 64,
        color: active ? (danger ? '#fff' : '#000') : '#ccc',
        opacity: disabled ? 0.5 : 1, transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      {React.cloneElement(icon, { size: small ? 18 : 20 })}
      {!small && <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>}
    </button>
  );
}

function SmallAvatar({ name, avatar, size }) {
  const [err, setErr] = useState(false);
  const [prevAvatar, setPrevAvatar] = useState(avatar);

  if (avatar !== prevAvatar) {
    setPrevAvatar(avatar);
    setErr(false);
  }
  if (avatar && !err) return (
    <img src={avatar} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarBg(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function VoiceChannelView({ topic, conversation, currentUserId, onExitChannel, isMobile }) {
  const {
    getRoomInfo, getMergedParticipants, isInRoom,
    loading, error,
    connected, isMuted, isCameraOff, isScreenSharing,
    localVideoTrack, screenTrack, getRemoteCameraTrack,
    createRoom, joinRoom, leaveRoom,
    toggleMute, toggleCamera, toggleScreenShare,
    fetchStatus,
  } = useVoiceRoomContext();

  const topicId      = topic?._id || null;
  const roomInfo     = getRoomInfo(topicId);
  const roomActive   = roomInfo?.active;
  const inThisRoom   = isInRoom(topicId);
  const participants = getMergedParticipants(topicId);
  const screenRef    = useRef(null);
  const autoJoinDone = useRef(false);

  // Permission gate: null = not yet decided, true = confirmed, false = cancelled
  const [permGranted, setPermGranted] = useState(null);

  useEffect(() => {
    if (conversation?.id && topicId) fetchStatus(conversation.id, topicId);
  }, [topicId, conversation?.id, fetchStatus]);

  useEffect(() => {
    // Wait for user to confirm permissions before joining
    if (permGranted !== true) return;
    if (!conversation?.id || !topicId || inThisRoom || loading || autoJoinDone.current) return;
    autoJoinDone.current = true;
    const doJoin = async () => {
      await new Promise(r => setTimeout(r, 300));
      const info = getRoomInfo(topicId);
      if (info?.active) joinRoom(conversation.id, topicId, topic);
      else createRoom(conversation.id, topicId, topic);
    };
    doJoin();
  }, [permGranted, conversation?.id, topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = screenRef.current;
    if (!el || !screenTrack) return;
    screenTrack.attach(el);
    return () => { try { screenTrack.detach(el); } catch (err) { console.debug(err); } };
  }, [screenTrack]);

  const handleLeave = useCallback(() => {
    leaveRoom(conversation.id, topicId);
    onExitChannel?.();
  }, [conversation.id, topicId, leaveRoom, onExitChannel]);

  // Responsive card sizing — no sidebar offset on mobile
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const sidebarOffset = isMobile ? 0 : 320;
  const gridPad = isMobile ? 24 : 40;
  const gap = 10;
  const n    = Math.max(participants.length, 1);
  const cols = isMobile
    ? (n === 1 ? 1 : 2)
    : Math.min(n, n <= 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 4);
  const cardSize = Math.max(
    isMobile ? 130 : 110,
    Math.min(
      isMobile ? 200 : 220,
      Math.floor((vw - sidebarOffset - gridPad - gap * (cols - 1)) / cols)
    )
  );

  if (permGranted === null) {
    return (
      <MediaPermissionModal
        onConfirm={() => setPermGranted(true)}
        onCancel={() => { setPermGranted(false); onExitChannel?.(); }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1b1e', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: isMobile ? '10px 14px' : '12px 20px',
        paddingTop: isMobile ? 'max(10px, env(safe-area-inset-top, 10px))' : '12px',
        background: '#2b2d31', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <Volume2 size={15} color={inThisRoom && connected ? '#57f287' : '#5865f2'} />
        <span style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🔊 {topic?.name}
        </span>
        {inThisRoom && connected && (
          <span style={{ fontSize: 10, color: '#57f287', fontWeight: 600, background: '#57f28720', borderRadius: 8, padding: '2px 7px', flexShrink: 0 }}>
            ✓ {participants.length} người
          </span>
        )}
        {loading && <Loader size={13} color="#aaa" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
        <button onClick={onExitChannel} title={inThisRoom ? 'Thu nhỏ (giữ kết nối)' : 'Thoát kênh'}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#aaa', padding: '5px 9px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Minimize2 size={13} />
        </button>
      </div>

      {/* Screen share */}
      {(screenTrack || isScreenSharing) && (
        <div style={{
          flexShrink: 0, background: '#000',
          height: isMobile ? Math.min(180, vw * 0.5) : 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <video ref={screenRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          {isScreenSharing && !screenTrack && (
            <div style={{ color: '#aaa', fontSize: 13 }}>Đang chia sẻ màn hình của bạn...</div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ margin: 10, padding: '7px 12px', background: '#ed424520', borderRadius: 8, fontSize: 12, color: '#ed4245' }}>{error}</div>
      )}

      {/* Participant grid */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: isMobile ? 12 : 20,
        display: 'flex', flexWrap: 'wrap', gap: gap, alignContent: 'flex-start',
        justifyContent: cols === 1 ? 'center' : 'flex-start',
      }}>
        {inThisRoom && connected ? (
          participants.length > 0 ? (
            participants.map(p => (
              <ParticipantCard
                key={p.userId}
                participant={p}
                size={cardSize}
                currentUserId={currentUserId}
                localVideoTrack={localVideoTrack}
                getRemoteCameraTrack={getRemoteCameraTrack}
              />
            ))
          ) : (
            <div style={{ width: '100%', textAlign: 'center', paddingTop: 40, color: '#666', fontSize: 13 }}>
              Chưa có người tham gia
            </div>
          )
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 40 }}>
            {loading ? (
              <>
                <Loader size={28} color="#5865f2" />
                <div style={{ color: '#aaa', fontSize: 13 }}>Đang tham gia phòng thoại...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: isMobile ? 44 : 56 }}>🔊</div>
                <div style={{ fontWeight: 800, fontSize: isMobile ? 16 : 18, color: '#fff', textAlign: 'center' }}>
                  {roomActive ? 'Phòng thoại đang hoạt động' : 'Kênh thoại trống'}
                </div>
                {roomActive && participants.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {participants.map(p => (
                      <div key={p.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <SmallAvatar name={p.displayName} avatar={p.avatar} size={isMobile ? 38 : 44} />
                        <span style={{ fontSize: 11, color: '#aaa', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.displayName}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => { autoJoinDone.current = false; setPermGranted(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: '#57f287', color: '#000', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  <Volume2 size={16} /> Tham gia lại
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {inThisRoom && (
        <div style={{
          flexShrink: 0,
          padding: isMobile ? '10px 12px' : '14px 20px',
          paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom, 10px))' : '14px',
          background: '#2b2d31',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 8 : 10,
        }}>
          <CtrlBtn onClick={toggleMute} active={isMuted} danger title={isMuted ? 'Bật micro' : 'Tắt micro'} small={isMobile}
            icon={isMuted ? <MicOff /> : <Mic />} label={isMuted ? 'Đang tắt' : 'Micro'} />
          <CtrlBtn onClick={toggleCamera} active={!isCameraOff} title={isCameraOff ? 'Bật camera' : 'Tắt camera'} small={isMobile}
            icon={isCameraOff ? <VideoOff /> : <Video />} label="Camera" />
          <CtrlBtn onClick={toggleScreenShare} active={isScreenSharing} title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'} small={isMobile}
            icon={isScreenSharing ? <MonitorOff /> : <Monitor />} label={isScreenSharing ? 'Dừng' : 'Màn hình'} />
          <div style={{ flex: 1 }} />
          <CtrlBtn onClick={handleLeave} danger active title="Rời phòng" disabled={loading} small={isMobile}
            icon={loading ? <Loader /> : <PhoneOff />} label="Rời phòng" />
        </div>
      )}
    </div>
  );
}