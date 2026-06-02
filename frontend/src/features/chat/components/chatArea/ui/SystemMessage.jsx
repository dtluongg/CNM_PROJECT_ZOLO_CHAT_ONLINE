import React from 'react';
import { Phone, Video, LogOut, UserX, Edit3, Image, Info, UserPlus, Shield, Crown, Bell } from 'lucide-react';
import MiniAvatar from './MiniAvatar'
import { useLanguage } from '../../../../../context/LanguageContext';
import { translateLastMessage } from '../../../../../utils/translationUtils';

const SystemMessage = ({ msg }) => {
  const { t } = useLanguage();

  const GROUP_TYPE_LABELS_T = {
    study:   t('auth.group_types.study'),
    gaming:  t('auth.group_types.gaming'),
    general: t('auth.group_types.general'),
    project: t('auth.group_types.project'),
    other:   t('auth.group_types.other'),
    sensitive: t('auth.group_types.sensitive'),
  };

  const event = msg.payload?.event;

  // ── Tham gia nhóm ────────────────────────────────────────────────────────
  if (event === 'member_join') {
    const actorName    = msg.payload?.actorName    || '?';
    const actorAvatar  = msg.payload?.actorAvatar  || null;
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 16px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #5865f212 0%, #43b58112 100%)',
          border: '1px solid #5865f230', borderRadius: 14, padding: '14px 24px', minWidth: 220,
        }}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MiniAvatar name={targetName} avatar={targetAvatar} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5865f2' }}>
              {t('system.join', { name: targetName })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <UserPlus size={10} />
            <span>{t('system.invited_by', { name: actorName })}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{msg.time}</span>
        </div>
      </div>
    );
  }

  // ── Rời nhóm ──────────────────────────────────────────────────────────────
  if (event === 'member_leave') {
    const actorName   = msg.payload?.actorName   || '?';
    const actorAvatar = msg.payload?.actorAvatar || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 30, padding: '7px 14px', userSelect: 'none',
        }}>
          <MiniAvatar name={actorName} avatar={actorAvatar} />
          <LogOut size={12} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('system.leave', { name: actorName })}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>{msg.time}</span>
        </div>
      </div>
    );
  }

  // ── Bị kick ───────────────────────────────────────────────────────────────
  if (event === 'member_kick') {
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    const reason       = msg.payload?.reason       || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#ed424512', border: '1px solid #ed424540',
          borderRadius: 30, padding: '7px 14px', userSelect: 'none',
        }}>
          <MiniAvatar name={targetName} avatar={targetAvatar} />
          <UserX size={12} color="#ed4245" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ed4245' }}>
              {t('system.kick', { name: targetName })}
            </span>
            {reason && (
              <span style={{ fontSize: 10, color: '#ed4245', opacity: 0.75 }}>{t('system.kick_reason', { reason })}</span>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#ed4245', opacity: 0.6 }}>{msg.time}</span>
        </div>
      </div>
    );
  }

  // ── Thay đổi chức vụ ─────────────────────────────────────────────────────
  if (event === 'member_role_updated') {
    const actorName    = msg.payload?.actorName    || '?';
    const actorAvatar  = msg.payload?.actorAvatar  || null;
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    const newRole      = msg.payload?.newRole;
    const isAdmin      = newRole === 'admin';
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: isAdmin ? '#f0b13212' : 'var(--bg-secondary)',
          border: `1px solid ${isAdmin ? '#f0b13240' : 'var(--border)'}`,
          borderRadius: 30, padding: '7px 14px', userSelect: 'none',
        }}>
          <MiniAvatar name={targetName} avatar={targetAvatar} />
          <Shield size={12} color={isAdmin ? '#f0b132' : 'var(--text-muted)'} />
          <span style={{ fontSize: 12, color: isAdmin ? '#f0b132' : 'var(--text-muted)', fontWeight: 600 }}>
            {t('system.role_update', { name: targetName, role: isAdmin ? t('system.role_admin') : t('system.role_member') })}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>
            {t('system.role_by', { name: actorName })}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>{msg.time}</span>
        </div>
      </div>
    );
  }

  // ── Chuyển quyền chủ nhóm ─────────────────────────────────────────────────
  if (event === 'member_owner_transferred') {
    const actorName    = msg.payload?.actorName    || '?';
    const actorAvatar  = msg.payload?.actorAvatar  || null;
    const targetName   = msg.payload?.targetName   || '?';
    const targetAvatar = msg.payload?.targetAvatar || null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 16px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #ffd70012 0%, #f0b13212 100%)',
          border: '1px solid #ffd70040', borderRadius: 14, padding: '14px 24px', minWidth: 220,
        }}>
          <span style={{ fontSize: 28 }}>👑</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MiniAvatar name={targetName} avatar={targetAvatar} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0b132' }}>
              {t('system.owner_transfer', { name: targetName })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <Crown size={10} />
            <span>{t('system.transfer_from', { name: actorName })}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{msg.time}</span>
        </div>
      </div>
    );
  }

  // ── Cập nhật thông tin nhóm ───────────────────────────────────────────────
  if (event === 'group_info_updated') {
    const actorName   = msg.payload?.actorName   || '?';
    const actorAvatar = msg.payload?.actorAvatar || null;
    const changes     = msg.payload?.changes || {};

    const changeRows = [];
    if (changes.name) {
      changeRows.push(
        <div key="name" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <Edit3 size={10} />
          <span>{t('system.updated_name', { name: changes.name.newValue })}</span>
        </div>
      );
    }
    if (changes.avatar) {
      changeRows.push(
        <div key="avatar" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <Image size={10} />
          <span>{t('system.updated_avatar')}</span>
          {changes.avatar.newValue && (
            <img src={changes.avatar.newValue} alt="new avatar"
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
          )}
        </div>
      );
    }
    if (changes.description) {
      changeRows.push(
        <div key="desc" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <Info size={10} />
          <span>{t('system.updated_desc', { desc: changes.description.newValue || t('system.updated_desc_empty') })}</span>
        </div>
      );
    }
    if (changes.groupType) {
      changeRows.push(
        <div key="type" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <Info size={10} />
          <span>{t('system.updated_type', { type: GROUP_TYPE_LABELS_T[changes.groupType.newValue] || changes.groupType.newValue })}</span>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
          background: 'rgba(88,101,242,0.07)', border: '1px solid rgba(88,101,242,0.2)',
          borderRadius: 12, padding: '10px 16px', maxWidth: 340,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <MiniAvatar name={actorName} avatar={actorAvatar} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5865f2', flex: 1 }}>
              {t('system.group_updated', { name: actorName })}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{msg.time}</span>
          </div>
          {changeRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
              {changeRows}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Nhắc hẹn ─────────────────────────────────────────────────────────────
  if (event === 'reminder_triggered') {
    const reminderContent = msg.payload?.reminderContent || msg.content || t('system.reminder_default');
    const actorName    = msg.senderName || msg.payload?.actorName || t('system.someone');
    const actorAvatar  = msg.avatar     || msg.payload?.actorAvatar || null;

    const convType      = msg.payload?.convType || 'dm';
    const targetName    = msg.payload?.targetName || msg.payload?.convName || 'Zolo';
    const targetAvatar  = msg.payload?.targetAvatar || msg.payload?.convAvatar || null;

    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', border: '1px solid #fbbf24',
          borderRadius: 40, padding: '6px 14px',
          boxShadow: '0 2px 8px rgba(251, 191, 36, 0.15)', userSelect: 'none',
        }}>
          {/* Avatar Người đặt nhắc hẹn */}
          <MiniAvatar name={actorName} avatar={actorAvatar} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={13} color="#f97316" fill="#f97316" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>
                {t('system.reminder_title', { content: reminderContent })}
              </span>
            </div>
            <span style={{ fontSize: 10, color: '#9a3412', opacity: 0.7 }}>{msg.time}</span>
          </div>

          {/* Avatar Đối phương (DM) hoặc Avatar Nhóm (Group) */}
          <MiniAvatar name={targetName} avatar={targetAvatar} />
        </div>
      </div>
    );
  }

  // ── Cuộc gọi NHÓM kết thúc ───────────────────────────────────────────────
  if (event === 'group_call_ended') {
    const isVideo    = msg.payload?.callType === 'video';
    const isMissed   = msg.payload?.status === 'missed';
    const dur        = msg.payload?.duration || 0;
    const parts      = msg.payload?.participants || [];
    const shown      = parts.slice(0, 4);
    const extra      = parts.length - shown.length;
    const m = Math.floor(dur / 60), s = dur % 60;
    const label = isMissed
      ? `Cuộc gọi ${isVideo ? 'video' : 'thoại'} nhóm nhỡ`
      : `Cuộc gọi ${isVideo ? 'video' : 'thoại'} nhóm · ${m > 0 ? `${m} phút ${s} giây` : `${s} giây`}`;
    const color  = isMissed ? '#ed4245' : 'var(--text-secondary)';
    const bg     = isMissed ? '#ed424510' : 'rgba(88,101,242,0.07)';
    const border = isMissed ? '1px solid #ed424530' : '1px solid rgba(88,101,242,0.2)';
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: bg, border, borderRadius: 30, padding: '8px 16px', userSelect: 'none' }}>
          {isVideo ? <Video size={14} color={color} /> : <Phone size={14} color={color} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{msg.time}</span>
          </div>
          {shown.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {shown.map((p, i) => (
                <div key={p._id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
                  <MiniAvatar name={p.displayName} avatar={p.avatar} size={24} />
                </div>
              ))}
              {extra > 0 && (
                <div style={{
                  marginLeft: -8, width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--bg-tertiary)', border: '2px solid var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
                }}>+{extra}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Cuộc gọi ─────────────────────────────────────────────────────────────
  const isVideo   = msg.payload?.callType === 'video';
  const status    = msg.payload?.status;
  const isMissed  = status === 'missed';
  const isRejected = status === 'rejected';
  const isBad     = isMissed || isRejected;

  const callerName   = msg.callerName   || msg.payload?.callerName   || '?';
  const callerAvatar = msg.callerAvatar || msg.payload?.callerAvatar || null;
  const calleeName   = msg.calleeName   || msg.payload?.calleeName   || '?';
  const calleeAvatar = msg.calleeAvatar || msg.payload?.calleeAvatar || null;

  let label;
  if (status === 'ended') {
    const dur = msg.payload?.duration || 0;
    const m = Math.floor(dur / 60), s = dur % 60;
    const durStr = `${m > 0 ? t('system.minutes', { count: m }) + ' ' : ''}${t('system.seconds', { count: s })}`;
    label = t('system.call_ended', { type: isVideo ? t('system.video') : t('system.voice'), duration: durStr });
  } else if (isMissed) {
    label = t('system.call_missed');
  } else if (isRejected) {
    label = t('system.call_rejected');
  } else {
    label = translateLastMessage(msg.content, t);
  }

  const color  = isBad ? '#ed4245' : 'var(--text-muted)';
  const bg     = isBad ? '#ed424512' : 'var(--bg-secondary)';
  const border = isBad ? '1px solid #ed424540' : '1px solid var(--border)';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: bg, border, borderRadius: 30, padding: '8px 14px', userSelect: 'none',
      }}>
        <MiniAvatar name={callerName} avatar={callerAvatar} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {isVideo ? <Video size={12} color={color} /> : <Phone size={12} color={color} />}
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{msg.time}</span>
        </div>
        <MiniAvatar name={calleeName} avatar={calleeAvatar} />
      </div>
    </div>
  );
};

export default SystemMessage;
