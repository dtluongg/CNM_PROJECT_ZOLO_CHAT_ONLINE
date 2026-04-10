import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usePresence } from '../../../context/PresenceContext';
import {
  X, Image, FileText, MessageCircle, BellOff, Ban, LogOut, Download, Phone,
  Shield, UserPlus, Crown, UserCog, Trash2,
} from 'lucide-react';
import conversationApi from '../api/conversationApi';
import friendApi from '../../friends/api/friendApi';
import messageApi from '../api/messageApi';

const AVATAR_COLORS = ['#5865f2', '#eb459e', '#00b4d8', '#57f287', '#fee75c', '#ed4245', '#9b59b6', '#e67e22'];

const STATUS_CONFIG = {
  online: { color: '#3ba55c', label: 'Dang hoat dong', dot: '#3ba55c' },
  idle: { color: '#faa61a', label: 'Vang mat', dot: '#faa61a' },
  dnd: { color: '#ed4245', label: 'Khong lam phien', dot: '#ed4245' },
  invisible: { color: '#80848e', label: 'An', dot: '#80848e' },
};


const getAvatarColor = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SectionHeader = ({ title }) => (
  <div style={{
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 8,
    marginTop: 4,
  }}>
    {title}
  </div>
);

const ActionButton = ({ icon, label, variant = 'default', onClick, disabled = false }) => {
  const [hovered, setHovered] = useState(false);
  const bg =
    variant === 'primary'
      ? hovered ? 'var(--accent-hover)' : 'var(--accent)'
      : variant === 'danger'
      ? hovered ? '#c0282b' : '#ed424520'
      : hovered ? 'var(--bg-hover)' : 'var(--bg-primary)';

  const color =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
      ? '#ed4245'
      : 'var(--text-secondary)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        color,
        border: 'none',
        borderRadius: 8,
        padding: '9px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'left',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const RoleChip = ({ role }) => {
  const cfg =
    role === 'owner'
      ? { label: 'Owner', bg: 'rgba(250,166,26,0.2)', color: '#faa61a' }
      : role === 'admin'
      ? { label: 'Admin', bg: 'rgba(88,101,242,0.2)', color: '#5865f2' }
      : { label: 'Member', bg: 'rgba(128,132,142,0.2)', color: '#c0c4cc' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 999,
      padding: '3px 8px',
      background: cfg.bg,
      color: cfg.color,
    }}>
      {role === 'owner' && <Crown size={11} />}
      {cfg.label}
    </span>
  );
};

export default function RightSidebar({
  conversation,
  onClose,
  onViewProfile,
  onLeaveGroup,
  onGroupUpdated,
}) {
  const [tab, setTab] = useState('info');
  const { isUserOnline, getPresenceStatus } = usePresence();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [friendPool, setFriendPool] = useState([]);
  const [selectedAddIds, setSelectedAddIds] = useState([]);
  const [loadingFriendPool, setLoadingFriendPool] = useState(false);

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editRole, setEditRole] = useState('member');
  const [editCanSend, setEditCanSend] = useState(true);
  const [editCanInvite, setEditCanInvite] = useState(true);
  const [editCanManage, setEditCanManage] = useState(false);

  const [busyAction, setBusyAction] = useState('');

  const [mediaData, setMediaData]     = useState({ images: [], files: [] });
  const [loadingMedia, setLoadingMedia] = useState(false);

  const myUserId = (user?._id || user?.id || '').toString();

  const accentColor = conversation?.usernameColor || getAvatarColor(conversation?.name);

  const isOnline = conversation?.otherUserId
    ? isUserOnline(conversation.otherUserId)
    : (conversation?.online ?? false);

  const presStatus = conversation?.otherUserId
    ? (getPresenceStatus(conversation.otherUserId) || (isOnline ? 'online' : null))
    : (isOnline ? (conversation?.status || 'online') : null);

  const statusConfig = presStatus ? STATUS_CONFIG[presStatus] || STATUS_CONFIG.online : null;

  const myMember = useMemo(
    () => members.find((m) => (m.user?._id || '').toString() === myUserId),
    [members, myUserId]
  );

  const canManageMembers = !!myMember && (myMember.role === 'owner' || myMember.role === 'admin' || myMember.canManageMembers);
  const canInviteMembers = !!myMember && (myMember.role === 'owner' || myMember.canInviteMembers);
  const isOwner = myMember?.role === 'owner';

  const loadMembers = useCallback(async () => {
    if (!conversation?.id || conversation.type !== 'group') return;
    try {
      setLoadingMembers(true);
      setMemberError('');
      const res = await conversationApi.getConversationMembers(conversation.id, false);
      setMembers(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      setMemberError(error.response?.data?.message || 'Khong the tai danh sach thanh vien');
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [conversation?.id, conversation?.type]);

  const loadFriendPool = useCallback(async () => {
    if (!conversation?.id || conversation.type !== 'group' || !canInviteMembers) return;
    try {
      setLoadingFriendPool(true);
      const res = await friendApi.getFriendList();
      const list = res?.data?.success ? (res.data.data || []) : [];
      const activeMemberIds = new Set(members.map((m) => (m.user?._id || '').toString()));
      setFriendPool(list.filter((f) => !activeMemberIds.has((f.friendId || '').toString())));
    } catch {
      setFriendPool([]);
    } finally {
      setLoadingFriendPool(false);
    }
  }, [canInviteMembers, conversation?.id, conversation?.type, members]);

  useEffect(() => {
    setEditingMemberId(null);
    setSelectedAddIds([]);
    setMediaData({ images: [], files: [] });
  }, [conversation?.id]);

  useEffect(() => {
    if ((tab !== 'media' && tab !== 'files') || !conversation?.id) return;
    setLoadingMedia(true);
    messageApi.getAttachments(conversation.id)
      .then(res => setMediaData(res.data || { images: [], files: [] }))
      .catch(() => setMediaData({ images: [], files: [] }))
      .finally(() => setLoadingMedia(false));
  }, [tab, conversation?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadFriendPool();
  }, [loadFriendPool]);

  if (!conversation) return null;

  const handleToggleAddMember = (userId) => {
    setSelectedAddIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleAddMembers = async () => {
    if (!conversation.id || selectedAddIds.length === 0) return;
    try {
      setBusyAction('add-members');
      await conversationApi.addConversationMembers(conversation.id, selectedAddIds);
      setSelectedAddIds([]);
      await loadMembers();
      await loadFriendPool();
      if (onGroupUpdated) await onGroupUpdated();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Khong the them thanh vien');
    } finally {
      setBusyAction('');
    }
  };

  const startEditMember = (member) => {
    setEditingMemberId((member.user?._id || '').toString());
    setEditRole(member.role || 'member');
    setEditCanSend(!!member.canSendMessages);
    setEditCanInvite(!!member.canInviteMembers);
    setEditCanManage(!!member.canManageMembers);
  };

  const saveEditMember = async () => {
    if (!conversation.id || !editingMemberId) return;
    try {
      setBusyAction(`edit-${editingMemberId}`);
      const payload = {
        role: editRole,
        canSendMessages: editCanSend,
        canInviteMembers: editCanInvite,
        canManageMembers: editCanManage,
      };
      await conversationApi.updateConversationMember(conversation.id, editingMemberId, payload);
      setEditingMemberId(null);
      await loadMembers();
      if (onGroupUpdated) await onGroupUpdated();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Khong the cap nhat thanh vien');
    } finally {
      setBusyAction('');
    }
  };

  const handleKickMember = async (member) => {
    const memberId = (member.user?._id || '').toString();
    if (!memberId) return;
    if (!window.confirm(`Kick ${member.user?.displayName || 'thanh vien'} khoi nhom?`)) return;

    try {
      setBusyAction(`kick-${memberId}`);
      await conversationApi.kickConversationMember(conversation.id, memberId);
      await loadMembers();
      await loadFriendPool();
      if (onGroupUpdated) await onGroupUpdated();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Khong the kick thanh vien');
    } finally {
      setBusyAction('');
    }
  };

  const handleTransferOwner = async (member) => {
    const targetId = (member.user?._id || '').toString();
    if (!targetId) return;
    if (!window.confirm(`Chuyen owner cho ${member.user?.displayName || 'thanh vien'}?`)) return;

    try {
      setBusyAction(`transfer-${targetId}`);
      await conversationApi.transferConversationOwner(conversation.id, targetId);
      await loadMembers();
      if (onGroupUpdated) await onGroupUpdated();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Khong the chuyen owner');
    } finally {
      setBusyAction('');
    }
  };

  const handleDisbandGroup = async () => {
    if (!conversation.id) return;
    if (!window.confirm('Ban chac chan muon giai tan nhom?')) return;

    try {
      setBusyAction('disband');
      await conversationApi.disbandConversation(conversation.id);
      if (onGroupUpdated) await onGroupUpdated();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Khong the giai tan nhom');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div style={{
      width: 280,
      minWidth: 280,
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px 0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          {conversation.type === 'dm' ? 'Thong tin nguoi dung' : 'Thong tin nhom'}
        </span>
        <button
          onClick={onClose}
          title="Dong"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '4px 6px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--bg-hover) transparent',
      }}>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, overflow: 'hidden', margin: 12 }}>
          <div
            style={{
              height: 72,
              background: conversation.banner
                ? `url(${conversation.banner}) center/cover no-repeat`
                : `linear-gradient(135deg, ${accentColor}cc, ${accentColor}55)`,
            }}
          />

          <div style={{ padding: '0 14px 14px', marginTop: -28 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {conversation.avatar ? (
                <img
                  src={conversation.avatar}
                  alt={conversation.name}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: '4px solid var(--bg-tertiary)',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: accentColor,
                  border: '4px solid var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 20,
                }}>
                  {getInitials(conversation.name)}
                </div>
              )}

              {conversation.type === 'dm' && (
                <span style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: statusConfig ? statusConfig.dot : '#80848e',
                  border: '2px solid var(--bg-tertiary)',
                }} />
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{
                fontWeight: 800,
                fontSize: 16,
                color: conversation.usernameColor || 'var(--text-primary)',
                lineHeight: 1.2,
              }}>
                {conversation.name}
              </div>

              {conversation.type === 'dm' ? (
                <div style={{ marginTop: 3 }}>
                  <div style={{
                    fontSize: 12,
                    color: statusConfig ? statusConfig.color : 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: statusConfig ? statusConfig.dot : '#80848e',
                      display: 'inline-block',
                    }} />
                    {statusConfig ? statusConfig.label : 'Offline'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MessageCircle size={12} style={{ opacity: 0.7 }} />
                  {members.length || conversation.memberCount || conversation.members || 0} thanh vien
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 2, margin: '0 12px 12px', background: 'var(--bg-primary)', borderRadius: 8, padding: 3 }}>
          {[
            { key: 'info', label: 'Thong tin' },
            { key: 'media', label: 'Media' },
            { key: 'files', label: 'File' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                background: tab === t.key ? 'var(--bg-secondary)' : 'none',
                border: 'none',
                cursor: 'pointer',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: tab === t.key ? 700 : 500,
                padding: '5px 4px',
                borderRadius: 6,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 12px 12px' }}>
          {tab === 'info' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <SectionHeader title="Thong tin cuoc tro chuyen" />
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loai</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {conversation.type === 'dm' ? 'Truc tiep (DM)' : 'Nhom'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tin nhan moi nhat</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 140, textAlign: 'right' }}>
                      {conversation.lastMessage || 'Chua co tin nhan'}
                    </span>
                  </div>
                  {conversation.type === 'group' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>So thanh vien</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {members.length || conversation.memberCount || conversation.members || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {conversation.type === 'group' && (
                <div style={{ marginBottom: 16 }}>
                  <SectionHeader title="Thanh vien nhom" />

                  {loadingMembers && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Dang tai thanh vien...
                    </div>
                  )}

                  {!!memberError && (
                    <div style={{ fontSize: 12, color: '#ed4245', marginBottom: 8 }}>{memberError}</div>
                  )}

                  {!loadingMembers && members.map((m) => {
                    const uid = (m.user?._id || '').toString();
                    const isSelf = uid === myUserId;
                    const canEditThisMember = canManageMembers && !isSelf && m.role !== 'owner';
                    const isEditing = editingMemberId === uid;

                    return (
                      <div key={uid} style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: 8,
                        padding: '9px 10px',
                        marginBottom: 8,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{m.user?.displayName || 'Unknown'}</span>
                              <RoleChip role={m.role} />
                              {isSelf && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(ban)</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                              send:{m.canSendMessages ? 'Y' : 'N'} | invite:{m.canInviteMembers ? 'Y' : 'N'} | manage:{m.canManageMembers ? 'Y' : 'N'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            {canEditThisMember && (
                              <button
                                onClick={() => startEditMember(m)}
                                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                              >
                                <UserCog size={12} />
                              </button>
                            )}

                            {canEditThisMember && (
                              <button
                                onClick={() => handleKickMember(m)}
                                disabled={busyAction === `kick-${uid}`}
                                style={{ background: '#ed424520', color: '#ed4245', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, opacity: busyAction === `kick-${uid}` ? 0.6 : 1 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}

                            {isOwner && !isSelf && m.role !== 'owner' && (
                              <button
                                onClick={() => handleTransferOwner(m)}
                                disabled={busyAction === `transfer-${uid}`}
                                style={{ background: 'rgba(250,166,26,0.2)', color: '#faa61a', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, opacity: busyAction === `transfer-${uid}` ? 0.6 : 1 }}
                              >
                                <Crown size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                            <div style={{ display: 'grid', gap: 8 }}>
                              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>Role</span>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value)}
                                  disabled={!isOwner}
                                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 12 }}
                                >
                                  <option value="member">member</option>
                                  <option value="admin">admin</option>
                                </select>
                              </label>

                              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={editCanSend} onChange={(e) => setEditCanSend(e.target.checked)} /> canSendMessages
                              </label>
                              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={editCanInvite} onChange={(e) => setEditCanInvite(e.target.checked)} /> canInviteMembers
                              </label>
                              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={editCanManage} onChange={(e) => setEditCanManage(e.target.checked)} disabled={!isOwner} /> canManageMembers
                              </label>

                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setEditingMemberId(null)}
                                  style={{ border: 'none', borderRadius: 6, padding: '6px 10px', background: 'var(--bg-hover)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                >
                                  Huy
                                </button>
                                <button
                                  onClick={saveEditMember}
                                  disabled={busyAction === `edit-${uid}`}
                                  style={{ border: 'none', borderRadius: 6, padding: '6px 10px', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: busyAction === `edit-${uid}` ? 0.6 : 1 }}
                                >
                                  Luu
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {conversation.type === 'group' && canInviteMembers && (
                <div style={{ marginBottom: 16 }}>
                  <SectionHeader title="Them thanh vien" />
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                    {loadingFriendPool && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Dang tai danh sach ban be...
                      </div>
                    )}

                    {!loadingFriendPool && friendPool.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Khong con ban be nao de them vao nhom.
                      </div>
                    )}

                    {!loadingFriendPool && friendPool.slice(0, 20).map((f) => {
                      const fid = (f.friendId || '').toString();
                      const checked = selectedAddIds.includes(fid);
                      return (
                        <label key={fid} style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <input type="checkbox" checked={checked} onChange={() => handleToggleAddMember(fid)} /> {f.displayName}
                        </label>
                      );
                    })}

                    <button
                      onClick={handleAddMembers}
                      disabled={selectedAddIds.length === 0 || busyAction === 'add-members'}
                      style={{ border: 'none', borderRadius: 6, padding: '7px 10px', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, marginTop: 6, opacity: (selectedAddIds.length === 0 || busyAction === 'add-members') ? 0.6 : 1 }}
                    >
                      {busyAction === 'add-members' ? 'Dang them...' : `Them ${selectedAddIds.length} thanh vien`}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionHeader title="Hanh dong" />
                <ActionButton icon={<MessageCircle size={15} />} label="Nhan tin" variant="primary" onClick={() => {}} />
                {conversation.type === 'dm' && conversation.otherUserId && onViewProfile && (
                  <ActionButton icon={<Shield size={15} />} label="Xem ho so" onClick={() => onViewProfile(conversation.otherUserId)} />
                )}
                <ActionButton icon={<Phone size={15} />} label="Goi dien" />
                <ActionButton icon={<BellOff size={15} />} label="Tat thong bao" />

                {conversation.type === 'dm' && (
                  <ActionButton icon={<Ban size={15} />} label="Chan nguoi dung" variant="danger" />
                )}

                {conversation.type === 'group' && (
                  <ActionButton
                    icon={<LogOut size={15} />}
                    label="Roi nhom"
                    variant="danger"
                    onClick={() => onLeaveGroup?.(conversation.id)}
                    disabled={busyAction === 'disband'}
                  />
                )}

                {conversation.type === 'group' && isOwner && (
                  <ActionButton
                    icon={<Trash2 size={15} />}
                    label="Giai tan nhom"
                    variant="danger"
                    onClick={handleDisbandGroup}
                    disabled={busyAction === 'disband'}
                  />
                )}
              </div>
            </div>
          )}

          {tab === 'media' && (
            <div>
              <SectionHeader title="Ảnh đã chia sẻ" />
              {loadingMedia && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Đang tải...</p>
              )}
              {!loadingMedia && mediaData.images.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có ảnh nào</p>
              )}
              {!loadingMedia && mediaData.images.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {mediaData.images.map((item) => (
                      <a key={item._id} href={item.url} target="_blank" rel="noreferrer"
                        style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', display: 'block', background: 'var(--bg-hover)' }}>
                        <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                    {mediaData.images.length} ảnh đã chia sẻ
                  </p>
                </>
              )}
            </div>
          )}

          {tab === 'files' && (
            <div>
              <SectionHeader title="File đã chia sẻ" />
              {loadingMedia && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Đang tải...</p>
              )}
              {!loadingMedia && mediaData.files.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có file nào</p>
              )}
              {!loadingMedia && mediaData.files.map((file) => (
                <div key={file._id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                  background: 'var(--bg-tertiary)',
                }}>
                  <span style={{ flexShrink: 0, color: '#5865f2', display: 'flex', alignItems: 'center' }}>
                    <FileText size={22} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.fileName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {file.fileSize ? `${(file.fileSize / 1024).toFixed(0)} KB` : ''}
                    </div>
                  </div>
                  {file.url && (
                    <a href={file.url} target="_blank" rel="noreferrer"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                      <Download size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
