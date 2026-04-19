import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Volume2, Loader, Users, Maximize2,
} from 'lucide-react';
import { useVoiceRoomContext } from '../VoiceRoomContext';

const COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarBg  = (name) => COLORS[(name || '?').charCodeAt(0) % COLORS.length];
const initials  = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

// ── Small video/avatar card for each participant ──────────────────────────
function ParticipantCard({ participant, size, currentUserId, localVideoTrack }) {
  const videoRef  = useRef(null);
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => { setImgErr(false); }, [participant.avatar]);

  // Attach video track to element
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const track = participant.isLocal ? localVideoTrack : participant.livePart?.cameraTrack;
    if (track) {
      track.attach(el);
      return () => track.detach(el);
    }
  }, [participant.isLocal, participant.livePart, localVideoTrack]);

  const showVideo = participant.isLocal
    ? !!localVideoTrack
    : !!participant.livePart?.hasCamera;

  return (
    <div style={{
      position: 'relative', width: size, height: size,
      borderRadius: 16,
      border: participant.isSpeaking ? '3px solid #57f287' : '3px solid transparent',
      boxShadow: participant.isSpeaking ? '0 0 0 3px #57f28733' : 'none',
      overflow: 'hidden',
      background: showVideo ? '#000' : avatarBg(participant.displayName),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay muted={participant.isLocal} playsInline
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', display: showVideo ? 'block' : 'none',
        }}
      />

      {/* Avatar fallback */}
      {!showVideo && (
        <>
          {participant.avatar && !imgErr ? (
            <img src={participant.avatar} alt={participant.displayName} onError={() => setImgErr(true)}
              style={{ width: '60%', height: '60%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '60%', height: '60%', borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: size * 0.22, fontWeight: 800, color: '#fff',
            }}>
              {initials(participant.displayName)}
            </div>
          )}
        </>
      )}

      {/* Name tag */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 8px 6px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: Math.max(10, size * 0.1), fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {participant.displayName}
          {participant.userId === currentUserId && <span style={{ opacity: 0.7, fontSize: size * 0.08 }}> (bạn)</span>}
        </span>
        {participant.isMuted && <MicOff size={Math.max(10, size * 0.1)} color="#ed4245" style={{ flexShrink: 0, marginLeft: 4 }} />}
      </div>

      {/* Speaking indicator */}
      {participant.isSpeaking && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 20, height: 20, borderRadius: '50%',
          background: '#57f287', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Volume2 size={10} color="#000" />
        </div>
      )}
    </div>
  );
}

// ── Control button ────────────────────────────────────────────────────────
function CtrlBtn({ onClick, active, danger, children, title, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        background: active ? (danger ? '#ed4245' : '#57f287') : 'var(--bg-hover)',
        border: 'none', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '12px 20px', minWidth: 70,
        color: active ? (danger ? '#fff' : '#000') : 'var(--text-primary)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ── Main VoiceChannelView ─────────────────────────────────────────────────
export default function VoiceChannelView({ topic, conversation, currentUserId, onExitChannel }) {
  const {
    getRoomInfo, getMergedParticipants, isInRoom,
    loading, error,
    connected, isMuted, isCameraOff, isScreenSharing,
    localVideoTrack, screenTrack,
    createRoom, joinRoom, leaveRoom,
    toggleMute, toggleCamera, toggleScreenShare,
    fetchStatus,
  } = useVoiceRoomContext();

  const topicId    = topic?._id || null;
  const roomInfo   = getRoomInfo(topicId);
  const roomActive = roomInfo?.active;
  const inThisRoom = isInRoom(topicId);
  const participants = getMergedParticipants(topicId);
  const screenVideoRef = useRef(null);

  // Fetch fresh room status when topic changes
  useEffect(() => {
    if (conversation?.id && topicId) {
      fetchStatus(conversation.id, topicId);
    }
  }, [topicId, conversation?.id, fetchStatus]);

  // Attach screen share to video element
  useEffect(() => {
    const el = screenVideoRef.current;
    if (!el || !screenTrack) return;
    screenTrack.attach(el);
    return () => screenTrack.detach(el);
  }, [screenTrack]);

  const handleJoin = useCallback(() => {
    if (!roomActive) {
      createRoom(conversation.id, topicId);
    } else {
      joinRoom(conversation.id, topicId);
    }
  }, [roomActive, conversation?.id, topicId, createRoom, joinRoom]);

  const handleLeave = useCallback(() => {
    leaveRoom(conversation.id, topicId);
  }, [conversation?.id, topicId, leaveRoom]);

  // Grid layout: max 4 per row, scale down card size
  const totalParts = Math.max(participants.length, 1);
  const cols       = Math.min(totalParts, 4);
  const cardSize   = Math.max(100, Math.min(180, Math.floor((window.innerWidth - 320) / cols) - 20));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary)', overflow: 'hidden',
    }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: inThisRoom && connected ? '#3ba55c' : '#5865f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Volume2 size={15} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
            🔊 {topic?.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {roomActive ? `${participants.length} người · ${inThisRoom && connected ? '✓ Đang kết nối' : 'Đang hoạt động'}` : 'Kênh thoại'}
          </div>
        </div>
        {inThisRoom && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#57f287' }} />
            <span style={{ fontSize: 11, color: '#57f287', fontWeight: 600 }}>Đã kết nối</span>
          </div>
        )}
        <button onClick={onExitChannel} title="Thoát kênh"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, fontSize: 12, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          ✕ Thoát
        </button>
      </div>

      {/* ── Screen share view ────────────────────────────────────── */}
      {(screenTrack || isScreenSharing) && (
        <div style={{
          flexShrink: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 240, borderBottom: '1px solid var(--border)',
        }}>
          <video ref={screenVideoRef} autoPlay playsInline
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          {!screenTrack && isScreenSharing && (
            <div style={{ color: '#fff', fontSize: 13 }}>Đang chia sẻ màn hình của bạn...</div>
          )}
        </div>
      )}

      {/* ── Participant grid ──────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 20,
        display: 'flex', flexWrap: 'wrap', gap: 14,
        alignContent: 'flex-start',
      }}>
        {inThisRoom && connected ? (
          participants.map(p => (
            <ParticipantCard
              key={p.userId}
              participant={p}
              size={cardSize}
              currentUserId={currentUserId}
              localVideoTrack={localVideoTrack}
            />
          ))
        ) : (
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, paddingTop: 40,
          }}>
            <div style={{ fontSize: 64 }}>🔊</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>
              {roomActive ? 'Phòng thoại đang hoạt động' : 'Chưa có ai trong kênh này'}
            </div>
            {roomActive && participants.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 400 }}>
                {participants.map(p => (
                  <div key={p.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <SmallAvatar name={p.displayName} avatar={p.avatar} size={44} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.displayName}</span>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div style={{ padding: '8px 16px', background: '#ed424520', borderRadius: 8, fontSize: 13, color: '#ed4245', maxWidth: 320, textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                borderRadius: 12, background: '#3ba55c', color: '#fff',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 15, fontWeight: 700, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <Loader size={16} /> : <Volume2 size={16} />}
              {roomActive ? 'Tham gia phòng thoại' : 'Tạo phòng thoại'}
            </button>
          </div>
        )}
      </div>

      {/* ── Controls bar (only when connected) ───────────────────── */}
      {inThisRoom && (
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {/* Mic */}
          <CtrlBtn onClick={toggleMute} active={isMuted} danger title={isMuted ? 'Bật micro' : 'Tắt micro'}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span style={{ fontSize: 11 }}>{isMuted ? 'Tắt mic' : 'Micro'}</span>
          </CtrlBtn>

          {/* Camera */}
          <CtrlBtn onClick={toggleCamera} active={!isCameraOff} title={isCameraOff ? 'Bật camera' : 'Tắt camera'}>
            {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            <span style={{ fontSize: 11 }}>{isCameraOff ? 'Camera' : 'Camera'}</span>
          </CtrlBtn>

          {/* Screen share */}
          <CtrlBtn onClick={toggleScreenShare} active={isScreenSharing} title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}>
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span style={{ fontSize: 11 }}>{isScreenSharing ? 'Dừng' : 'Màn hình'}</span>
          </CtrlBtn>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Leave */}
          <CtrlBtn onClick={handleLeave} danger active title="Rời phòng" disabled={loading}>
            {loading ? <Loader size={20} /> : <PhoneOff size={20} />}
            <span style={{ fontSize: 11 }}>Rời phòng</span>
          </CtrlBtn>
        </div>
      )}
    </div>
  );
}

function SmallAvatar({ name, avatar, size }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [avatar]);
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
