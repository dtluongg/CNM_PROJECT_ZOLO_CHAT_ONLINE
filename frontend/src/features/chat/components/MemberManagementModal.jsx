import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Crown, Shield, User, ChevronDown, ChevronUp,
    UserX, Plus, Trash2, Hash, Volume2, Save, Send, UserPlus,
} from 'lucide-react';
import conversationApi from '../api/conversationApi';
import friendApi from '../../friends/api/friendApi';
import apiClient from '../../../services/apiClient';
import { useLanguage } from '../../../context/LanguageContext';
import { usePresence } from '../../../context/PresenceContext';
import { roleChipStyle } from '../utils/roleColor';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COLORS = ['#5865f2','#eb459e','#ed4245','#faa61a','#57f287','#00b4d8','#9b59b6','#e67e22'];
const avatarBg = (name) => COLORS[(name || '?').charCodeAt(0) % COLORS.length];
const getInit  = (name) => {
    if (!name) return '?';
    const p = name.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

// Normalize customRoleId thành string dù là object hay string
const getRoleId = (customRoleId) => {
    if (!customRoleId) return null;
    if (typeof customRoleId === 'string') return customRoleId;
    if (customRoleId._id) return customRoleId._id.toString();
    return customRoleId.toString();
};

const ROLE_CFG = (t) => ({
    owner:  { label: t('member_management.roles.owner'),      icon: Crown,  color: '#faa61a', bg: '#faa61a22' },
    admin:  { label: t('member_management.roles.admin'),  icon: Shield, color: '#5865f2', bg: '#5865f222' },
    member: { label: t('member_management.roles.member'),     icon: User,   color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
});

const PERMISSIONS_META = (t) => [
    { key: 'canSendMessages',  label: t('member_management.permissions.canSendMessages'),      desc: t('member_management.permissions.canSendMessages_desc', { defaultValue: 'Cho phép gửi tin nhắn trong nhóm' }) },
    { key: 'canInviteMembers', label: t('member_management.permissions.canInviteMembers'),     desc: t('member_management.permissions.canInviteMembers_desc', { defaultValue: 'Cho phép mời người khác vào nhóm' }) },
    { key: 'canManageMembers', label: t('member_management.permissions.canManageMembers'), desc: t('member_management.permissions.canManageMembers_desc', { defaultValue: 'Cho phép chỉnh sửa quyền của thành viên' }) },
];

const PRESET_COLORS = ['#5865f2','#eb459e','#ed4245','#faa61a','#57f287','#00b4d8','#9b59b6','#e67e22','#ffffff','#99aab5'];

// ─── Sub components ───────────────────────────────────────────────────────────
function MemberAvatar({ name, avatar, size = 38, online = null }) {
    const [err, setErr] = useState(false);
    useEffect(() => setErr(false), [avatar]);
    const dot = online === null ? null : (
        <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28),
            borderRadius: '50%', background: online ? '#3ba55c' : '#80848e',
            border: '2px solid var(--bg-secondary)', boxSizing: 'border-box',
        }} />
    );
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            {avatar && !err ? (
                <img src={avatar} alt={name} onError={() => setErr(true)}
                    style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
                <div style={{
                    width: size, height: size, borderRadius: '50%',
                    background: avatarBg(name), display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38,
                }}>
                    {getInit(name)}
                </div>
            )}
            {dot}
        </div>
    );
}

function Toggle({ checked, onChange, disabled }) {
    return (
        <div onClick={() => !disabled && onChange(!checked)} style={{
            width: 36, height: 20, borderRadius: 10, flexShrink: 0,
            background: checked ? '#57f287' : 'var(--bg-hover)',
            border: '1px solid var(--border)', position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1, transition: 'background 0.15s',
        }}>
            <div style={{
                position: 'absolute', top: 2, left: checked ? 18 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#fff', transition: 'left 0.15s',
            }} />
        </div>
    );
}
function JoinRequestsTab({ conversation, onApproved, canReview }) {
    const { t } = useLanguage();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading]   = useState(false);
    const [busy, setBusy]         = useState('');

    const load = useCallback(async () => {
        if (!conversation?.id) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/conversations/${conversation.id}/join-requests`);
            setRequests(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch { setRequests([]); }
        finally { setLoading(false); }
    }, [conversation?.id]);

    useEffect(() => { load(); }, [load]);

    const handleReview = async (requestId, action) => {
        setBusy(`${action}-${requestId}`);
        try {
            await apiClient.patch(
                `/conversations/${conversation.id}/join-requests/${requestId}`,
                { action }
            );
            setRequests(prev => prev.filter(r => r._id !== requestId));
            if (action === 'approve') onApproved?.();
        } catch (err) {
            window.alert(err.response?.data?.message || t('common.error'));
        } finally { setBusy(''); }
    };

    if (loading) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {t('common.loading')}
        </div>
    );

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('member_management.requests.pending_count', { count: requests.length })}
                </span>
                <button onClick={load} style={{
                    fontSize: 11, color: 'var(--accent)', background: 'none',
                    border: 'none', cursor: 'pointer', fontWeight: 600,
                }}>
                    🔄 {t('member_management.requests.refresh')}
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {requests.length === 0 ? (
                    <div style={{
                        padding: 40, textAlign: 'center',
                        color: 'var(--text-muted)', fontSize: 13,
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                        {t('member_management.requests.no_requests')}
                    </div>
                ) : (
                    requests.map(req => (
                        <div key={req._id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderBottom: '1px solid var(--border)',
                        }}>
                            {/* Avatar */}
                            <MemberAvatar
                                name={req.userId?.displayName}
                                avatar={req.userId?.avatar}
                                size={40}
                            />

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 600, fontSize: 13,
                                    color: 'var(--text-primary)',
                                }}>
                                    {req.userId?.displayName || '?'}
                                </div>
                                {req.message && (
                                    <div style={{
                                        fontSize: 12, color: 'var(--text-muted)',
                                        marginTop: 2, fontStyle: 'italic',
                                    }}>
                                        "{req.message}"
                                    </div>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {new Date(req.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {canReview ? (
                                    <>
                                        <button
                                            onClick={() => handleReview(req._id, 'approve')}
                                            disabled={!!busy}
                                            style={{
                                                padding: '6px 12px', borderRadius: 8,
                                                background: '#57f287', color: '#000',
                                                border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
                                                fontSize: 12, fontWeight: 700,
                                                opacity: busy === `approve-${req._id}` ? 0.6 : 1,
                                            }}
                                        >
                                            {busy === `approve-${req._id}` ? '...' : `✓ ${t('member_management.requests.approve')}`}
                                        </button>
                                        <button
                                            onClick={() => handleReview(req._id, 'reject')}
                                            disabled={!!busy}
                                            style={{
                                                padding: '6px 12px', borderRadius: 8,
                                                background: '#ed424520', color: '#ed4245',
                                                border: '1px solid #ed424540',
                                                cursor: busy ? 'not-allowed' : 'pointer',
                                                fontSize: 12, fontWeight: 600,
                                                opacity: busy === `reject-${req._id}` ? 0.6 : 1,
                                            }}
                                        >
                                            {busy === `reject-${req._id}` ? '...' : `✕ ${t('member_management.requests.reject')}`}
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        {t('member_management.requests.only_admin_can_review')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
function SectionLabel({ label, count }) {
    return (
        <div style={{
            padding: '12px 16px 6px', fontSize: 11, fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8,
        }}>
            {label} ({count})
        </div>
    );
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const roleApi = {
    list:   (convId)            => apiClient.get(`/conversations/${convId}/roles`),
    create: (convId, body)      => apiClient.post(`/conversations/${convId}/roles`, body),
    update: (convId, rId, body) => apiClient.patch(`/conversations/${convId}/roles/${rId}`, body),
    delete: (convId, rId)       => apiClient.delete(`/conversations/${convId}/roles/${rId}`),
    assign: (convId, uid, customRoleId) =>
        apiClient.patch(`/conversations/${convId}/members/${uid}/role-assign`, { customRoleId }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 1: THÀNH VIÊN
// ─────────────────────────────────────────────────────────────────────────────
function MembersTab({ conversation, currentUserId, customRoles, members, onMembersReload, topics }) {
    const { t } = useLanguage();
    const { isUserOnline } = usePresence();
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState('');
    const [roleFilter, setRoleFilter]   = useState('all');
    const [expandedId, setExpandedId]   = useState(null);
    const [busy, setBusy]               = useState('');
    const [kickReason, setKickReason]   = useState('');
    const [transferTarget, setTransferTarget] = useState(null);
    const [pendingEdit, setPendingEdit] = useState({});

    const myMember = members.find(m => (m.user?._id || '').toString() === currentUserId);
    const canManage = myMember?.role === 'owner' || myMember?.role === 'admin' || myMember?.canManageMembers;

    const amOwner  = myMember?.role === 'owner';
    const amAdmin  = myMember?.role === 'admin' || myMember?.canManageMembers;

    const isMemberOnline = (m) => isUserOnline((m.user?._id || '').toString());
    const onlineCount = members.filter(isMemberOnline).length;

    // ── Thêm thành viên ngay trong tab danh sách ──
    const [showAdd, setShowAdd]         = useState(false);
    const [friendPool, setFriendPool]   = useState([]);
    const [loadingPool, setLoadingPool] = useState(false);
    const [selectedAdd, setSelectedAdd] = useState([]);
    const [addSearch, setAddSearch]     = useState('');

    useEffect(() => {
        if (!showAdd) return;
        let cancelled = false;
        setLoadingPool(true);
        friendApi.getFriendList()
            .then(res => {
                if (cancelled) return;
                const list = res?.data?.success ? res.data.data || [] : [];
                const memberIds = new Set(members.map(m => (m.user?._id || '').toString()));
                setFriendPool(list.filter(f => !memberIds.has((f.friendId || '').toString())));
            })
            .catch(() => !cancelled && setFriendPool([]))
            .finally(() => !cancelled && setLoadingPool(false));
        return () => { cancelled = true; };
    }, [showAdd, members]);

    const toggleAdd = (fid) => setSelectedAdd(prev =>
        prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]);

    const handleAddMembers = async () => {
        if (selectedAdd.length === 0) return;
        setBusy('add-members');
        try {
            await conversationApi.addConversationMembers(conversation.id, selectedAdd);
            setSelectedAdd([]);
            setShowAdd(false);
            setAddSearch('');
            await onMembersReload();
        } catch (err) {
            window.alert(err.response?.data?.message || t('common.error'));
        } finally { setBusy(''); }
    };

    const addPool = friendPool.filter(f =>
        (f.displayName || f.friendName || '').toLowerCase().includes(addSearch.toLowerCase()));

    const filtered = members.filter(m =>
        (m.user?.displayName || '').toLowerCase().includes(search.toLowerCase()) &&
        (roleFilter === 'all' || (roleFilter === 'online' ? isMemberOnline(m) : m.role === roleFilter))
    );
    const byRole = (r) => filtered.filter(m => m.role === r);

    // ── Pending edit helpers ──
    const getEdit = (m) => {
        const id = (m.user?._id || '').toString();
        if (pendingEdit[id]) return pendingEdit[id];
        return {
            role:             m.role,
            canSendMessages:  m.canSendMessages,
            canInviteMembers: m.canInviteMembers,
            canManageMembers: m.canManageMembers,
            // FIX KEY: normalize customRoleId thành string
            customRoleId: getRoleId(m.customRoleId),
        };
    };

    const setEdit = (m, key, val) => {
        const id = (m.user?._id || '').toString();
        setPendingEdit(prev => ({ ...prev, [id]: { ...getEdit(m), [key]: val } }));
    };

    const isDirty = (m) => !!pendingEdit[(m.user?._id || '').toString()];

    const canEditMember = (m) => {
        const id = (m.user?._id || '').toString();
        if (id === currentUserId) return false;
        if (m.role === 'owner') return false;
        if (amOwner) return true;
        if (amAdmin && m.role === 'member') return true;
        return false;
    };

    // ── Save ──
    const handleSave = async (m) => {
        const id = (m.user?._id || '').toString();
        const ed = getEdit(m);
        setBusy(`save-${id}`);
        try {
            let effectiveRole = m.role;

            // Chỉ update system role
            if (ed.role !== m.role) {
                await conversationApi.updateConversationMember(conversation.id, id, {
                    role: ed.role,
                });
                effectiveRole = ed.role;
            }

            // Chỉ gán custom role cho member thường
            if (effectiveRole === 'member') {
                await roleApi.assign(conversation.id, id, ed.customRoleId || null);
            }

            setPendingEdit(prev => { const n = { ...prev }; delete n[id]; return n; });
            await onMembersReload();
        } catch (err) {
            window.alert(err.response?.data?.message || t('member_management.roles.save_error', { defaultValue: 'Không thể lưu thay đổi' }));
        } finally { setBusy(''); }
    };

    // ── Kick ──
    const handleKick = async (m) => {
        const id = (m.user?._id || '').toString();
        if (!window.confirm(t('member_management.members.remove_confirm', { name: m.user?.displayName || 'thành viên' }))) return;
        setBusy(`kick-${id}`);
        try {
            await conversationApi.kickConversationMember(conversation.id, id, kickReason.trim() || null);
            setKickReason('');
            setExpandedId(null);
            await onMembersReload();
        } catch (err) {
            window.alert(err.response?.data?.message || t('member_management.members.kick_error', { defaultValue: 'Không thể xóa thành viên' }));
        } finally { setBusy(''); }
    };

    const handleTransferOwner = (m) => {
        setTransferTarget(m);
    };

    const confirmTransferOwner = async () => {
        if (!transferTarget) return;

        const id = (transferTarget.user?._id || '').toString();

        setBusy(`transfer-${id}`);
        try {
            await conversationApi.transferConversationOwner(conversation.id, id);
            setTransferTarget(null);
            setExpandedId(null);
            await onMembersReload();
        } catch (err) {
            window.alert(err.response?.data?.message || t('member_management.members.transfer_owner_error', { defaultValue: 'Không thể chuyển quyền chủ nhóm' }));
        } finally { setBusy(''); }
    };

    const renderMember = (m) => {
        const id         = (m.user?._id || '').toString();
        const isSelf     = id === currentUserId;
        const isExpanded = expandedId === id;
        const ed         = getEdit(m);
        const roles_cfg  = ROLE_CFG(t);
        const rc         = roles_cfg[m.role] || roles_cfg.member;
        const RoleIcon   = rc.icon;
        const editable   = canEditMember(m);
        const isBusy     = busy.includes(id);

        // FIX KEY: so sánh string với string
        const assignedRole = customRoles.find(r => r._id.toString() === getRoleId(m.customRoleId));

        return (
            <div key={id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                    onClick={() => editable && setExpandedId(isExpanded ? null : id)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', cursor: editable ? 'pointer' : 'default',
                        background: isExpanded ? 'var(--bg-hover)' : 'transparent',
                    }}
                >
                    <MemberAvatar name={m.user?.displayName} avatar={m.user?.avatar} online={isMemberOnline(m)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {m.user?.displayName || '?'}
                            {isSelf && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>({t('member_management.members.you')})</span>}
                        </div>

                        {/* Badge row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                            {/* System role */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                background: rc.bg, borderRadius: 10, padding: '2px 7px',
                            }}>
                                <RoleIcon size={10} color={rc.color} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: rc.color }}>{rc.label}</span>
                            </div>

                            {/* Custom role badge — hiển thị role được gán */}
                            {assignedRole && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    borderRadius: 10, padding: '2px 8px',
                                    fontSize: 10, fontWeight: 700,
                                    ...roleChipStyle(assignedRole.color),
                                }}>
                                    {assignedRole.name}
                                </span>
                            )}

                            {!m.canSendMessages && (
                                <span style={{
                                    fontSize: 10, color: '#ed4245',
                                    background: '#ed424515', borderRadius: 8, padding: '1px 6px',
                                }}>
                                    {t('member_management.members.banned_send')}
                                </span>
                            )}
                        </div>
                    </div>
                    {editable && (
                        <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    )}
                </div>

                {/* ── Expanded panel ── */}
                {/* Expanded panel — chỉ giữ system role + custom role */}
                {isExpanded && editable && (
                    <div style={{
                        background: 'var(--bg-tertiary)', padding: '14px 20px 16px',
                        borderTop: '1px solid var(--border)',
                    }}>
                        {/* System role — chỉ owner thay đổi */}
                        {amOwner && m.role !== 'owner' && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', marginBottom: 6,
                                }}>{t('member_management.roles.system_role_label')}</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['admin', 'member'].map(r => (
                                        <button key={r} onClick={() => setEdit(m, 'role', r)} style={{
                                            padding: '5px 14px', borderRadius: 8, fontSize: 12,
                                            fontWeight: 600, cursor: 'pointer',
                                            border: `1.5px solid ${ed.role === r ? ROLE_CFG(t)[r].color : 'var(--border)'}`,
                                            background: ed.role === r ? ROLE_CFG(t)[r].bg : 'var(--bg-secondary)',
                                            color: ed.role === r ? ROLE_CFG(t)[r].color : 'var(--text-muted)',
                                        }}>
                                            {ROLE_CFG(t)[r].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom role picker */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', marginBottom: 6,
                            }}>{t('member_management.roles.custom_role')}</div>
                            <select
                                value={ed.customRoleId || ''}
                                onChange={e => setEdit(m, 'customRoleId', e.target.value || null)}
                                disabled={ed.role !== 'member'}
                                style={{
                                    width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', cursor: 'pointer',
                                    opacity: ed.role !== 'member' ? 0.6 : 1,
                                }}
                            >
                                <option value=''>{t('member_management.roles.no_custom_role')}</option>
                                {customRoles.map(r => (
                                    <option key={r._id} value={r._id.toString()}>{r.name}</option>
                                ))}
                            </select>
                            {ed.role === 'member' ? (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                                    💡 Quyền kênh được quản lý hoàn toàn qua Role tab
                                </div>
                            ) : (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                                    Custom role chỉ áp dụng cho member thường
                                </div>
                            )}
                        </div>

                        {/* Lưu thay đổi — nút chính, chỉ hiện khi có chỉnh sửa */}
                        {isDirty(m) && (
                            <button onClick={() => handleSave(m)} disabled={isBusy} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                width: '100%', padding: '9px 0', background: '#57f287', color: '#000',
                                border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                                cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
                                marginBottom: 14,
                            }}>
                                <Save size={13} />
                                {busy === `save-${id}` ? t('member_management.roles.saving') : t('member_management.roles.save_changes')}
                            </button>
                        )}

                        {/* Khu vực quản lý — tách riêng cho gọn */}
                        <div style={{
                            borderTop: '1px solid var(--border)', paddingTop: 12,
                            display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            {amOwner && !isSelf && m.role !== 'owner' && (
                                <button onClick={() => handleTransferOwner(m)} disabled={isBusy} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                    width: '100%', padding: '8px 0', background: '#faa61a18', color: '#faa61a',
                                    border: '1px solid #faa61a40', borderRadius: 8, fontSize: 12,
                                    fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer',
                                    opacity: isBusy ? 0.6 : 1,
                                }}>
                                    <Crown size={13} />
                                    {busy === `transfer-${id}` ? t('member_management.members.transferring') : t('member_management.members.transfer_owner_btn')}
                                </button>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={kickReason} onChange={e => setKickReason(e.target.value)}
                                    placeholder={t('member_management.members.kick_reason_placeholder')}
                                    style={{
                                        flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12,
                                        border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                                <button onClick={() => handleKick(m)} disabled={isBusy} style={{
                                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                                    padding: '8px 14px', background: '#ed424520', color: '#ed4245',
                                    border: '1px solid #ed424540', borderRadius: 8, fontSize: 12,
                                    fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer',
                                }}>
                                    <UserX size={13} /> {t('member_management.members.remove_btn')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {ed.customRoleId && (() => {
                    const assignedRole = customRoles.find(r => r._id.toString() === ed.customRoleId);
                    if (!assignedRole) return null;

                    const allowedIds  = (assignedRole.allowedTopicIds  || []).map(t => (t._id || t).toString());
                    const sendableIds = (assignedRole.sendableTopicIds || []).map(t => (t._id || t).toString());

                    // Lấy danh sách topics từ MemberManagementModal (cần truyền xuống)
                    return null; // placeholder — xem bên dưới
                })()}

                {transferTarget && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 600,
                            background: 'rgba(0,0,0,0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                        }}
                        onClick={e => e.target === e.currentTarget && !busy && setTransferTarget(null)}
                    >
                        <div style={{
                            width: '100%', maxWidth: 460,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                            overflow: 'hidden',
                        }}>
                            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {t('member_management.members.transfer_owner_title', { defaultValue: 'Chuyển trưởng nhóm' })}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                                    {t('member_management.members.transfer_owner_desc', {
                                        name: transferTarget.user?.displayName || 'thành viên',
                                        defaultValue: 'Bạn sắp chuyển quyền trưởng nhóm cho một thành viên khác.',
                                    })}
                                </div>
                            </div>

                            <div style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
                                <MemberAvatar name={transferTarget.user?.displayName} avatar={transferTarget.user?.avatar} size={52} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {transferTarget.user?.displayName || '?'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {t('member_management.members.transfer_owner_warning', {
                                            defaultValue: 'Sau khi chuyển quyền, bạn sẽ không còn là chủ nhóm.'
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '0 20px 20px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 10,
                            }}>
                                <button
                                    onClick={() => setTransferTarget(null)}
                                    disabled={!!busy}
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        fontSize: 13,
                                        fontWeight: 600,
                                    }}
                                >
                                    {t('member_management.members.cancel', { defaultValue: 'Hủy' })}
                                </button>
                                <button
                                    onClick={confirmTransferOwner}
                                    disabled={!!busy}
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: 10,
                                        border: '1px solid #faa61a40',
                                        background: busy ? '#faa61a12' : '#faa61a',
                                        color: busy ? 'var(--text-muted)' : '#111',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        fontSize: 13,
                                        fontWeight: 800,
                                    }}
                                >
                                    {busy === `transfer-${(transferTarget.user?._id || '').toString()}`
                                        ? t('member_management.members.transferring')
                                        : t('member_management.members.confirm_transfer', { defaultValue: 'Chuyển quyền' })}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={t('member_management.members.search_placeholder')}
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--bg-primary)',
                            color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                    {canManage && (
                        <button onClick={() => setShowAdd(v => !v)} style={{
                            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', border: 'none',
                            background: showAdd ? 'var(--bg-hover)' : 'var(--accent)',
                            color: showAdd ? 'var(--text-primary)' : '#fff',
                        }}>
                            {showAdd ? <X size={14} /> : <UserPlus size={14} />}
                            {showAdd ? t('common.cancel') : t('right_sidebar.add_member')}
                        </button>
                    )}
                </div>

                {/* Inline thêm thành viên */}
                {showAdd && canManage && (
                    <div style={{
                        marginTop: 10, background: 'var(--bg-tertiary)', borderRadius: 10,
                        border: '1px solid var(--border)', padding: 10,
                    }}>
                        <input
                            value={addSearch} onChange={e => setAddSearch(e.target.value)}
                            placeholder={t('member_management.members.search_placeholder')}
                            style={{
                                width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: 8,
                            }}
                        />
                        {loadingPool ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>{t('right_sidebar.loading')}</div>
                        ) : addPool.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>{t('right_sidebar.no_friends_add')}</div>
                        ) : (
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {addPool.map(f => {
                                    const fid = (f.friendId || '').toString();
                                    const checked = selectedAdd.includes(fid);
                                    return (
                                        <div key={fid} onClick={() => toggleAdd(fid)} style={{
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                                            borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                                            background: checked ? 'rgba(88,101,242,0.12)' : 'transparent',
                                        }}>
                                            <div style={{
                                                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                                                border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                                                background: checked ? 'var(--accent)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                                            </div>
                                            <MemberAvatar name={f.displayName || f.friendName} avatar={f.avatar} size={26} />
                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {f.displayName || f.friendName}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <button onClick={handleAddMembers} disabled={selectedAdd.length === 0 || busy === 'add-members'} style={{
                            width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 8, border: 'none',
                            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', opacity: (selectedAdd.length === 0 || busy === 'add-members') ? 0.5 : 1,
                        }}>
                            {busy === 'add-members'
                                ? t('right_sidebar.processing')
                                : selectedAdd.length > 0
                                    ? t('right_sidebar.add_count', { count: selectedAdd.length })
                                    : t('right_sidebar.add_member')}
                        </button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: t('member_management.members.filter_all'), count: members.length },
                        { key: 'online', label: t('member_management.members.filter_online'), count: onlineCount, dot: '#3ba55c' },
                        { key: 'owner', label: ROLE_CFG(t).owner.label, count: members.filter(m => m.role === 'owner').length },
                        { key: 'admin', label: ROLE_CFG(t).admin.label, count: members.filter(m => m.role === 'admin').length },
                        { key: 'member', label: ROLE_CFG(t).member.label, count: members.filter(m => m.role === 'member').length },
                    ].map(f => {
                        const sel = roleFilter === f.key;
                        return (
                            <button key={f.key} onClick={() => setRoleFilter(f.key)} style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                cursor: 'pointer',
                                border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                                background: sel ? 'var(--accent)' : 'var(--bg-primary)',
                                color: sel ? '#fff' : 'var(--text-muted)',
                            }}>
                                {f.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: sel ? '#fff' : f.dot }} />}
                                {f.label} <span style={{ opacity: 0.7 }}>{f.count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {members.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('common.loading')}
                    </div>
                ) : (
                    <>
                        {byRole('owner').length > 0 && <>
                            <SectionLabel label={t('member_management.roles.owner')} count={byRole('owner').length} />
                            {byRole('owner').map(renderMember)}
                        </>}
                        {byRole('admin').length > 0 && <>
                            <SectionLabel label={t('member_management.roles.admin')} count={byRole('admin').length} />
                            {byRole('admin').map(renderMember)}
                        </>}
                        {byRole('member').length > 0 && <>
                            <SectionLabel label={t('member_management.roles.member')} count={byRole('member').length} />
                            {byRole('member').map(renderMember)}
                        </>}
                        {filtered.length === 0 && members.length > 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                {t('member_management.members.no_results')}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB 2: ROLES
// ─────────────────────────────────────────────────────────────────────────────
function RolesTab({ conversation, currentUserId, roles, onRefresh, topics, members = [] }) {
    const { t } = useLanguage();
    const [expandedId, setExpandedId] = useState(null);
    const [creating, setCreating]     = useState(false);
    const [busy, setBusy]             = useState('');
    const [newRole, setNewRole]       = useState({
        name: '', color: '#5865f2',
        permissions: { canSendMessages: true, canInviteMembers: false, canManageMembers: false },
        allowedTopicIds: [], sendableTopicIds: [],
    });
    const [editData, setEditData] = useState({});

    const getEditData = (role) => editData[role._id] || {
        name:             role.name,
        color:            role.color,
        permissions:      { ...role.permissions },
        allowedTopicIds:  (role.allowedTopicIds || []).map(t => (t._id || t).toString()),
        sendableTopicIds: (role.sendableTopicIds || []).map(t => (t._id || t).toString()),
    };

    const setED = (roleId, key, val) =>
        setEditData(prev => ({ ...prev, [roleId]: { ...getEditData(roles.find(r => r._id === roleId)), [key]: val } }));

    const setEDPerm = (roleId, permKey, val) => {
        const current = getEditData(roles.find(r => r._id === roleId));
        setED(roleId, 'permissions', { ...current.permissions, [permKey]: val });
    };

    const toggleTopic = (roleId, field, topicId) => {
        const current = getEditData(roles.find(r => r._id === roleId));
        const arr  = current[field] || [];
        const next = arr.includes(topicId) ? arr.filter(id => id !== topicId) : [...arr, topicId];
        setED(roleId, field, next);
    };

    // Lấy danh sách member đang dùng role này (từ client, không cần request thêm)
    const getMembersOfRole = (roleId) =>
        members.filter(m => getRoleId(m.customRoleId) === roleId.toString());

    const handleCreate = async () => {
        if (!newRole.name.trim()) { window.alert(t('member_management.roles.enter_name_error', { defaultValue: 'Nhập tên role' })); return; }
        setBusy('create');
        try {
            await roleApi.create(conversation.id, newRole);
            setCreating(false);
            setNewRole({
                name: '', color: '#5865f2',
                permissions: { canSendMessages: true, canInviteMembers: false, canManageMembers: false },
                allowedTopicIds: [], sendableTopicIds: [],
            });
            onRefresh();
        } catch (err) {
            window.alert(err.response?.data?.message || t('member_management.roles.create_error', { defaultValue: 'Không thể tạo role' }));
        } finally { setBusy(''); }
    };

    const handleUpdate = async (role) => {
        const ed = getEditData(role);
        setBusy(`update-${role._id}`);
        try {
            await roleApi.update(conversation.id, role._id, ed);
            setEditData(prev => { const n = { ...prev }; delete n[role._id]; return n; });
            setExpandedId(null);
            onRefresh();
        } catch (err) {
            window.alert(err.response?.data?.message || t('member_management.roles.update_error', { defaultValue: 'Không thể cập nhật role' }));
        } finally { setBusy(''); }
    };

    const handleDelete = async (role) => {
        if (!window.confirm(t('member_management.roles.delete_role_confirm', { name: role.name }))) return;
        setBusy(`delete-${role._id}`);
        try {
            await roleApi.delete(conversation.id, role._id);
            onRefresh();
        } catch (err) {
            window.alert(err.response?.data?.message || t('member_management.roles.delete_error', { defaultValue: 'Không thể xóa role' }));
        } finally { setBusy(''); }
    };

    const textTopics  = topics.filter(t => t.channelType === 'text');
    const voiceTopics = topics.filter(t => t.channelType === 'voice');
    const renderTopicPermissions = (ed, roleId, isNew = false) => {
        // Tính nguồn quyền cho từng topic (chỉ khi edit role đã có, không phải tạo mới)
        const getPermSource = (tid) => {
            if (isNew || !roleId) return null;
            // Tìm member nào đang dùng role này có personal override
            const roleMembers = getMembersOfRole(roleId);
            const hasOverride = roleMembers.some(m =>
                (m.topicOverrides || []).some(o => o.topicId?.toString() === tid)
            );
            return hasOverride ? 'override' : 'role';
        };

        return (
            <div style={{ marginTop: 12 }}>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', marginBottom: 4,
                }}>{t('member_management.roles.allowed_channels')}</div>
                <div style={{
                    fontSize: 11, color: 'var(--text-muted)', marginBottom: 6,
                    padding: '6px 8px', background: 'var(--bg-primary)',
                    borderRadius: 6, lineHeight: 1.5,
                }}>
                    {t('member_management.roles.allowed_channels_hint', { defaultValue: '💡 Xem: tick = được vào kênh, bỏ tick = bị chặn\n💡 Gửi: tick = được gửi tin, bỏ tick = chỉ đọc\n💡 Để trống tất cả Xem = được xem mọi kênh, nhưng phải tick Gửi mới gửi được' })}
                </div>
                <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                    {[...textTopics, ...voiceTopics].map(tp => {
                        const tid         = tp._id.toString();
                        const allowedIds  = (ed.allowedTopicIds  || []).map(id => id.toString());
                        const sendableIds = (ed.sendableTopicIds || []).map(id => id.toString());
                        const hasAccess   = allowedIds.includes(tid);
                        const hasSend     = sendableIds.includes(tid);
                        const source      = getPermSource(tid);

                        return (
                            <div key={tid} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 10px', background: 'var(--bg-secondary)',
                                borderRadius: 6, borderLeft: hasSend
                                    ? '3px solid #57f287'
                                    : hasAccess
                                        ? '3px solid #5865f2'
                                        : '3px solid var(--border)',
                            }}>
                                {tp.channelType === 'voice'
                                    ? <Volume2 size={12} color="var(--text-muted)" />
                                    : <Hash size={12} color="var(--text-muted)" />}
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>
                                    {tp.emoji} {tp.name}
                                </span>

                                {/* Badge trạng thái */}
                                <span style={{
                                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                    background: hasSend ? '#57f28720' : hasAccess ? '#5865f220' : '#ed424520',
                                    color: hasSend ? '#57f287' : hasAccess ? '#5865f2' : '#ed4245',
                                    fontWeight: 600, marginRight: 4,
                                }}>
                                    {hasSend ? t('member_management.roles.can_send') : hasAccess ? t('member_management.roles.can_view') : t('member_management.roles.is_blocked')}
                                </span>

                                <label style={{
                                    fontSize: 11, color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                                }}>
                                    <input type="checkbox" checked={hasAccess}
                                        onChange={() => isNew
                                            ? setNewRole(p => ({
                                                ...p,
                                                allowedTopicIds: hasAccess
                                                    ? p.allowedTopicIds.filter(id => id !== tid)
                                                    : [...p.allowedTopicIds, tid],
                                                // Nếu bỏ xem thì bỏ gửi luôn
                                                sendableTopicIds: hasAccess
                                                    ? p.sendableTopicIds.filter(id => id !== tid)
                                                    : p.sendableTopicIds,
                                              }))
                                            : (() => {
                                                toggleTopic(roleId, 'allowedTopicIds', tid);
                                                // Nếu bỏ xem thì bỏ gửi luôn
                                                if (hasAccess && hasSend) {
                                                    toggleTopic(roleId, 'sendableTopicIds', tid);
                                                }
                                              })()
                                        }
                                    />
                                    {t('member_management.roles.view')}
                                </label>
                                <label style={{
                                    fontSize: 11, color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', gap: 3,
                                    cursor: !hasAccess ? 'not-allowed' : 'pointer',
                                    opacity: !hasAccess ? 0.4 : 1,
                                }}>
                                    <input type="checkbox" checked={hasSend}
                                        disabled={!hasAccess}
                                        onChange={() => isNew
                                            ? setNewRole(p => ({
                                                ...p,
                                                sendableTopicIds: hasSend
                                                    ? p.sendableTopicIds.filter(id => id !== tid)
                                                    : [...p.sendableTopicIds, tid],
                                              }))
                                            : toggleTopic(roleId, 'sendableTopicIds', tid)
                                        }
                                    />
                                    {t('member_management.roles.send')}
                                </label>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Tổng quan quyền của role — badge icon nhỏ giúp phân biệt nhanh
    const renderPermBadges = (role) => {
        const perms = role.permissions || {};
        const channelCount = (role.allowedTopicIds || []).length;
        const badges = [
            perms.canSendMessages && { icon: Send, color: '#57f287', title: t('member_management.permissions.canSendMessages') },
            perms.canInviteMembers && { icon: UserPlus, color: '#00b4d8', title: t('member_management.permissions.canInviteMembers') },
            perms.canManageMembers && { icon: Shield, color: '#5865f2', title: t('member_management.permissions.canManageMembers') },
        ].filter(Boolean);
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {badges.map((b, i) => {
                    const Icon = b.icon;
                    return (
                        <span key={i} title={b.title} style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 20, height: 20, borderRadius: 6,
                            background: b.color + '20',
                        }}>
                            <Icon size={11} color={b.color} />
                        </span>
                    );
                })}
                {channelCount > 0 && (
                    <span title={t('member_management.roles.allowed_channels')} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                        background: 'var(--bg-hover)', borderRadius: 6, padding: '2px 6px',
                    }}>
                        <Hash size={10} /> {channelCount}
                    </span>
                )}
            </div>
        );
    };

    // Mini avatar stack cho member đang dùng role
    const renderMemberAvatars = (roleMembers) => {
        if (roleMembers.length === 0) return (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('member_management.roles.no_members_hint', { defaultValue: 'Chưa có thành viên' })}</span>
        );
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                {/* Avatar stack */}
                <div style={{ display: 'flex' }}>
                    {roleMembers.slice(0, 5).map((m, i) => (
                        <div
                            key={(m.user?._id || i).toString()}
                            title={m.user?.displayName || '?'}
                            style={{
                                width: 18, height: 18, borderRadius: '50%',
                                marginLeft: i === 0 ? 0 : -5,
                                border: '1.5px solid var(--bg-secondary)',
                                background: avatarBg(m.user?.displayName),
                                overflow: 'hidden', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', zIndex: 10 - i,
                            }}
                        >
                            {m.user?.avatar ? (
                                <img src={m.user.avatar} alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: 7, color: '#fff', fontWeight: 700 }}>
                                    {getInit(m.user?.displayName)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {roleMembers.length === 1
                        ? roleMembers[0]?.user?.displayName || '?'
                        : t('member_management.roles.members_count_summary', { name: roleMembers[0]?.user?.displayName || '?', count: roleMembers.length - 1, defaultValue: `${roleMembers[0]?.user?.displayName || '?'} +${roleMembers.length - 1} khác` })
                    }
                </span>
            </div>
        );
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('member_management.roles.count_limit', { count: roles.length })}</span>
                <button
                    onClick={() => setCreating(true)}
                    disabled={roles.length >= 10 || busy === 'create'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', background: 'var(--accent)', color: '#fff',
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', opacity: roles.length >= 10 ? 0.5 : 1,
                    }}
                >
                    <Plus size={13} /> {t('member_management.roles.create_btn')}
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {/* Create form */}
                {creating && (
                    <div style={{
                        margin: '0 16px 12px', background: 'var(--bg-tertiary)',
                        borderRadius: 10, padding: 14, border: '1px solid var(--accent)',
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                            {t('member_management.roles.create_role')}
                        </div>
                        <input
                            value={newRole.name}
                            onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))}
                            placeholder={t('member_management.roles.placeholder_name')}
                            style={{
                                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', outline: 'none',
                                boxSizing: 'border-box', marginBottom: 10,
                            }}
                        />
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{t('member_management.roles.color')}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {PRESET_COLORS.map(c => (
                                    <div key={c} onClick={() => setNewRole(p => ({ ...p, color: c }))}
                                        style={{
                                            width: 22, height: 22, borderRadius: '50%', background: c,
                                            cursor: 'pointer',
                                            border: newRole.color === c ? '2px solid white' : '2px solid transparent',
                                            boxShadow: newRole.color === c ? '0 0 0 2px var(--accent)' : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                                marginBottom: 6, textTransform: 'uppercase',
                            }}>{t('member_management.roles.permissions')}</div>
                            {PERMISSIONS_META(t).map(p => (
                                <label key={p.key} style={{
                                    display: 'flex', alignItems: 'flex-start',
                                    gap: 8, marginBottom: 8, cursor: 'pointer',
                                }}>
                                    <Toggle
                                        checked={!!newRole.permissions[p.key]}
                                        onChange={v => setNewRole(prev => ({
                                            ...prev, permissions: { ...prev.permissions, [p.key]: v },
                                        }))}
                                    />
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {renderTopicPermissions(newRole, null, true)}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleCreate} disabled={busy === 'create'} style={{
                                padding: '7px 16px', background: 'var(--accent)', color: '#fff',
                                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>
                                {busy === 'create' ? t('member_management.roles.creating') : t('common.create', { defaultValue: 'Tạo' })}
                            </button>
                            <button onClick={() => setCreating(false)} style={{
                                padding: '7px 14px', background: 'var(--bg-hover)',
                                color: 'var(--text-primary)', border: 'none', borderRadius: 8,
                                fontSize: 12, cursor: 'pointer',
                            }}>{t('common.cancel')}</button>
                        </div>
                    </div>
                )}

                {/* Role list */}
                {roles.map(role => {
                    const isExp      = expandedId === role._id;
                    const ed         = getEditData(role);
                    const isBusy     = busy.includes(role._id);
                    // FIX KEY: tính từ members client thay vì role.memberCount từ server
                    const roleMembers = getMembersOfRole(role._id);

                    return (
                        <div key={role._id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <div
                                onClick={() => setExpandedId(isExp ? null : role._id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 16px', cursor: 'pointer',
                                    background: isExp ? 'var(--bg-hover)' : 'transparent',
                                    borderLeft: `3px solid ${role.color}`,
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Colored role name chip for quick distinction */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            fontSize: 12.5, fontWeight: 700,
                                            borderRadius: 20, padding: '2px 11px', maxWidth: '100%',
                                            ...roleChipStyle(role.color),
                                        }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.name}</span>
                                        </span>
                                        {renderPermBadges(role)}
                                    </div>
                                    {/* avatar stack + tên thành viên thật */}
                                    {renderMemberAvatars(roleMembers)}
                                </div>
                                {isExp
                                    ? <ChevronUp size={14} color="var(--text-muted)" />
                                    : <ChevronDown size={14} color="var(--text-muted)" />
                                }
                            </div>

                            {isExp && (
                                <div style={{
                                    background: 'var(--bg-tertiary)', padding: '14px 20px 16px',
                                    borderTop: '1px solid var(--border)',
                                }}>
                                    {/* Name */}
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                                            {t('member_management.roles.role_name')}
                                        </div>
                                        <input value={ed.name}
                                            onChange={e => setED(role._id, 'name', e.target.value)}
                                            style={{
                                                width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13,
                                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>

                                    {/* Color */}
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                                            {t('member_management.roles.color')}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {PRESET_COLORS.map(c => (
                                                <div key={c} onClick={() => setED(role._id, 'color', c)}
                                                    style={{
                                                        width: 20, height: 20, borderRadius: '50%', background: c,
                                                        cursor: 'pointer',
                                                        border: ed.color === c ? '2px solid white' : '2px solid transparent',
                                                        boxShadow: ed.color === c ? '0 0 0 2px var(--accent)' : 'none',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Permissions */}
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{
                                            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                            textTransform: 'uppercase', marginBottom: 8,
                                        }}>{t('member_management.roles.permissions')}</div>
                                        {PERMISSIONS_META(t).map(p => (
                                            <label key={p.key} style={{
                                                display: 'flex', alignItems: 'center',
                                                gap: 8, marginBottom: 8, cursor: 'pointer',
                                            }}>
                                                <Toggle
                                                    checked={!!ed.permissions[p.key]}
                                                    onChange={v => setEDPerm(role._id, p.key, v)}
                                                />
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {PERMISSIONS_META(t).find(x => x.key === p.key)?.label || p.key}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {PERMISSIONS_META(t).find(x => x.key === p.key)?.desc}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Topic permissions */}
                                    {renderTopicPermissions(ed, role._id)}

                                    {/* Danh sách member đang dùng role này */}
                                    {roleMembers.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{
                                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                                textTransform: 'uppercase', marginBottom: 8,
                                            }}>{t('member_management.roles.members_using_this')}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {roleMembers.map(m => (
                                                    <div key={(m.user?._id || '').toString()} style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        padding: '5px 8px', background: 'var(--bg-secondary)',
                                                        borderRadius: 8,
                                                    }}>
                                                        <MemberAvatar
                                                            name={m.user?.displayName}
                                                            avatar={m.user?.avatar}
                                                            size={24}
                                                        />
                                                        <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                                                            {m.user?.displayName || '?'}
                                                        </span>
                                                        <span style={{
                                                            fontSize: 10, marginLeft: 'auto',
                                                            color: 'var(--text-muted)',
                                                        }}>
                                                            {ROLE_CFG(t)[m.role]?.label || m.role}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => handleUpdate(role)} disabled={isBusy} style={{
                                            padding: '7px 16px', background: 'var(--accent)', color: '#fff',
                                            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', opacity: isBusy ? 0.6 : 1,
                                        }}>
                                            {busy === `update-${role._id}` ? t('member_management.roles.saving') : t('common.save')}
                                        </button>
                                        <button onClick={() => handleDelete(role)} disabled={isBusy} style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '7px 14px', background: '#ed424520', color: '#ed4245',
                                            border: '1px solid #ed424440', borderRadius: 8,
                                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        }}>
                                            <Trash2 size={12} /> {t('member_management.roles.delete_role')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {roles.length === 0 && !creating && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('member_management.roles.no_custom_roles')}<br />
                        <button onClick={() => setCreating(true)} style={{
                            marginTop: 10, background: 'none', border: 'none',
                            color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        }}>
                            {t('member_management.roles.create_first_role')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
export default function MemberManagementModal({ visible, onClose, conversation, currentUserId, onRefresh }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab]       = useState('members');
    const [roles, setRoles]               = useState([]);
    const [topics, setTopics]             = useState([]);
    // FIX KEY: members state ở modal level để cả 2 tab dùng chung
    const [members, setMembers]           = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const myMember  = members.find(m => (m.user?._id || '').toString() === currentUserId);
    const isOwner = myMember?.role === 'owner';
    const canReviewRequests = myMember?.role === 'owner' || myMember?.role === 'admin';

    const loadRoles = useCallback(async () => {
        if (!conversation?.id) return;
        setLoadingRoles(true);
        try {
            const res = await roleApi.list(conversation.id);
            setRoles(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch { setRoles([]); }
        finally { setLoadingRoles(false); }
    }, [conversation?.id]);

    const loadTopics = useCallback(async () => {
        if (!conversation?.id) return;
        try {
            const res = await conversationApi.listTopics(conversation.id);
            setTopics(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch { setTopics([]); }
    }, [conversation?.id]);

    // FIX KEY: load members ở modal level, populate customRoleId cần được fix ở backend
    const loadMembers = useCallback(async () => {
        if (!conversation?.id) return;
        try {
            const res = await conversationApi.getConversationMembers(conversation.id, false);
            setMembers(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch { setMembers([]); }
    }, [conversation?.id]);

    // Reload tất cả khi save thay đổi
    const handleReloadAll = useCallback(async () => {
        await Promise.all([loadMembers(), loadRoles()]);
        if (onRefresh) onRefresh();
    }, [loadMembers, loadRoles, onRefresh]);

    useEffect(() => {
        if (visible) {
            loadRoles();
            loadTopics();
            loadMembers();
            setActiveTab('members');
        }
    }, [visible, loadRoles, loadTopics, loadMembers]);

    useEffect(() => {
        if (activeTab === 'roles' && !isOwner) {
            setActiveTab('members');
        }
    }, [activeTab, isOwner]);

    if (!visible) return null;

    const tabs = [
        { key: 'members', label: t('member_management.tabs.members') },
        ...(isOwner ? [{ key: 'roles', label: t('member_management.tabs.roles') }] : []),
        { key: 'requests', label: t('member_management.tabs.requests') },
    ];

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                width: '100%', maxWidth: 620, maxHeight: '88vh',
                background: 'var(--bg-secondary)', borderRadius: 14,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px 0', flexShrink: 0,
                }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {t('member_management.title')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {conversation?.name}
                            {members.length > 0 && <span style={{ marginLeft: 6 }}>· {members.length} {t('member_management.members.members_word')}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg-hover)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <X size={14} color="var(--text-muted)" />
                    </button>
                </div>

                {/* Tab bar */}
                <div style={{
                    display: 'flex', gap: 2, margin: '12px 16px 0',
                    background: 'var(--bg-primary)', borderRadius: 8, padding: 3, flexShrink: 0,
                }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                            flex: 1, padding: '7px 8px', borderRadius: 6, border: 'none',
                            fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                            cursor: 'pointer',
                            background: activeTab === t.key ? 'var(--bg-secondary)' : 'none',
                            color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '10px 0 0', flexShrink: 0 }} />

                {/* Tab content */}
                {activeTab === 'members' && (
                    <MembersTab
                        conversation={conversation}
                        currentUserId={currentUserId}
                        customRoles={roles}
                        members={members}
                        topics={topics}
                        onMembersReload={handleReloadAll}
                    />
                )}
                {activeTab === 'roles' && isOwner && (
                    <RolesTab
                        conversation={conversation}
                        currentUserId={currentUserId}
                        roles={roles}
                        topics={topics}
                        members={members}
                        onRefresh={handleReloadAll}
                    />
                )}
                {activeTab === 'requests' && (
                    <JoinRequestsTab
                        conversation={conversation}
                        onApproved={handleReloadAll}
                        canReview={canReviewRequests}
                    />
                )}

            </div>
        </div>
    );
}