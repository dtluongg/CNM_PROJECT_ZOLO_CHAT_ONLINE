import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Crown, Shield, User, ChevronDown, ChevronUp,
    UserX, Plus, Trash2, Hash, Volume2, Save,
} from 'lucide-react';
import conversationApi from '../api/conversationApi';
import apiClient from '../../../services/apiClient';

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

const ROLE_CFG = {
    owner:  { label: 'Chủ nhóm',      icon: Crown,  color: '#faa61a', bg: '#faa61a22' },
    admin:  { label: 'Quản trị viên',  icon: Shield, color: '#5865f2', bg: '#5865f222' },
    member: { label: 'Thành viên',     icon: User,   color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
};

const PERMISSIONS_META = [
    { key: 'canSendMessages',  label: 'Gửi tin nhắn',      desc: 'Cho phép gửi tin nhắn trong nhóm' },
    { key: 'canInviteMembers', label: 'Mời thành viên',     desc: 'Cho phép mời người khác vào nhóm' },
    { key: 'canManageMembers', label: 'Quản lý thành viên', desc: 'Cho phép chỉnh sửa quyền của thành viên' },
];

const PRESET_COLORS = ['#5865f2','#eb459e','#ed4245','#faa61a','#57f287','#00b4d8','#9b59b6','#e67e22','#ffffff','#99aab5'];

// ─── Sub components ───────────────────────────────────────────────────────────
function MemberAvatar({ name, avatar, size = 38 }) {
    const [err, setErr] = useState(false);
    useEffect(() => setErr(false), [avatar]);
    if (avatar && !err) return (
        <img src={avatar} alt={name} onError={() => setErr(true)}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: avatarBg(name), display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38,
        }}>
            {getInit(name)}
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
function MembersTab({ conversation, currentUserId, customRoles, members, onMembersReload }) {
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState('');
    const [expandedId, setExpandedId]   = useState(null);
    const [busy, setBusy]               = useState('');
    const [kickReason, setKickReason]   = useState('');
    const [pendingEdit, setPendingEdit] = useState({});

    const myMember = members.find(m => (m.user?._id || '').toString() === currentUserId);
    const amOwner  = myMember?.role === 'owner';
    const amAdmin  = myMember?.role === 'admin' || myMember?.canManageMembers;

    const filtered = members.filter(m =>
        (m.user?.displayName || '').toLowerCase().includes(search.toLowerCase())
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
            await conversationApi.updateConversationMember(conversation.id, id, {
                role:             ed.role,
                canSendMessages:  ed.canSendMessages,
                canInviteMembers: ed.canInviteMembers,
                canManageMembers: ed.canManageMembers,
            });
            await roleApi.assign(conversation.id, id, ed.customRoleId || null);
            setPendingEdit(prev => { const n = { ...prev }; delete n[id]; return n; });
            await onMembersReload();
        } catch (err) {
            window.alert(err.response?.data?.message || 'Không thể lưu thay đổi');
        } finally { setBusy(''); }
    };

    // ── Kick ──
    const handleKick = async (m) => {
        const id = (m.user?._id || '').toString();
        if (!window.confirm(`Xóa ${m.user?.displayName || 'thành viên'} khỏi nhóm?`)) return;
        setBusy(`kick-${id}`);
        try {
            await conversationApi.kickConversationMember(conversation.id, id, kickReason.trim() || null);
            setKickReason('');
            setExpandedId(null);
            await onMembersReload();
        } catch (err) {
            window.alert(err.response?.data?.message || 'Không thể xóa thành viên');
        } finally { setBusy(''); }
    };

    const renderMember = (m) => {
        const id         = (m.user?._id || '').toString();
        const isSelf     = id === currentUserId;
        const isExpanded = expandedId === id;
        const ed         = getEdit(m);
        const rc         = ROLE_CFG[m.role] || ROLE_CFG.member;
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
                    <MemberAvatar name={m.user?.displayName} avatar={m.user?.avatar} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {m.user?.displayName || '?'}
                            {isSelf && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(bạn)</span>}
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
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 3,
                                    borderRadius: 10, padding: '2px 7px',
                                    background: assignedRole.color + '28',
                                    border: `1px solid ${assignedRole.color}44`,
                                }}>
                                    <span style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: assignedRole.color, display: 'inline-block',
                                    }} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: assignedRole.color }}>
                                        {assignedRole.name}
                                    </span>
                                </div>
                            )}

                            {!m.canSendMessages && (
                                <span style={{
                                    fontSize: 10, color: '#ed4245',
                                    background: '#ed424515', borderRadius: 8, padding: '1px 6px',
                                }}>
                                    Cấm gửi
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
                                }}>Vai trò hệ thống</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['admin', 'member'].map(r => (
                                        <button key={r} onClick={() => setEdit(m, 'role', r)} style={{
                                            padding: '5px 14px', borderRadius: 8, fontSize: 12,
                                            fontWeight: 600, cursor: 'pointer',
                                            border: `1.5px solid ${ed.role === r ? ROLE_CFG[r].color : 'var(--border)'}`,
                                            background: ed.role === r ? ROLE_CFG[r].bg : 'var(--bg-secondary)',
                                            color: ed.role === r ? ROLE_CFG[r].color : 'var(--text-muted)',
                                        }}>
                                            {ROLE_CFG[r].label}
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
                            }}>Custom Role</div>
                            <select
                                value={ed.customRoleId || ''}
                                onChange={e => setEdit(m, 'customRoleId', e.target.value || null)}
                                style={{
                                    width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', cursor: 'pointer',
                                }}
                            >
                                <option value=''>— Không có —</option>
                                {customRoles.map(r => (
                                    <option key={r._id} value={r._id.toString()}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Permissions */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', marginBottom: 8,
                            }}>Quyền cá nhân (override)</div>
                            {PERMISSIONS_META.map(p => (
                                <div key={p.key} style={{
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between', marginBottom: 10,
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {p.label}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                    </div>
                                    <Toggle
                                        checked={!!ed[p.key]}
                                        onChange={v => setEdit(m, p.key, v)}
                                        disabled={!amOwner && p.key === 'canManageMembers'}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {isDirty(m) && (
                                <button onClick={() => handleSave(m)} disabled={isBusy} style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '7px 18px', background: '#57f287', color: '#000',
                                    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                    cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
                                }}>
                                    <Save size={12} />
                                    {busy === `save-${id}` ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            )}
                            <button onClick={() => handleKick(m)} disabled={isBusy} style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '7px 14px', background: '#ed424520', color: '#ed4245',
                                border: '1px solid #ed424540', borderRadius: 8, fontSize: 12,
                                fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer',
                            }}>
                                <UserX size={12} /> Xóa khỏi nhóm
                            </button>
                        </div>
                        <input
                            value={kickReason} onChange={e => setKickReason(e.target.value)}
                            placeholder="Lý do xóa (tùy chọn)..."
                            style={{
                                width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12,
                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', outline: 'none',
                                boxSizing: 'border-box', marginTop: 8,
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm thành viên..."
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg-primary)',
                        color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {members.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Đang tải...
                    </div>
                ) : (
                    <>
                        {byRole('owner').length > 0 && <>
                            <SectionLabel label="Chủ nhóm" count={byRole('owner').length} />
                            {byRole('owner').map(renderMember)}
                        </>}
                        {byRole('admin').length > 0 && <>
                            <SectionLabel label="Quản trị viên" count={byRole('admin').length} />
                            {byRole('admin').map(renderMember)}
                        </>}
                        {byRole('member').length > 0 && <>
                            <SectionLabel label="Thành viên" count={byRole('member').length} />
                            {byRole('member').map(renderMember)}
                        </>}
                        {filtered.length === 0 && members.length > 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                Không tìm thấy
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
        if (!newRole.name.trim()) { window.alert('Nhập tên role'); return; }
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
            window.alert(err.response?.data?.message || 'Không thể tạo role');
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
            window.alert(err.response?.data?.message || 'Không thể cập nhật role');
        } finally { setBusy(''); }
    };

    const handleDelete = async (role) => {
        if (!window.confirm(`Xóa role "${role.name}"? Tất cả member đang dùng role này sẽ bị gỡ.`)) return;
        setBusy(`delete-${role._id}`);
        try {
            await roleApi.delete(conversation.id, role._id);
            onRefresh();
        } catch (err) {
            window.alert(err.response?.data?.message || 'Không thể xóa role');
        } finally { setBusy(''); }
    };

    const textTopics  = topics.filter(t => t.channelType === 'text');
    const voiceTopics = topics.filter(t => t.channelType === 'voice');

    const renderTopicPermissions = (ed, roleId, isNew = false) => (
        <div style={{ marginTop: 12 }}>
            <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', marginBottom: 4,
            }}>Kênh được truy cập</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Để trống = truy cập tất cả kênh
            </div>
            <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                {[...textTopics, ...voiceTopics].map(t => {
                    const tid        = t._id.toString();
                    const allowedIds = (ed.allowedTopicIds || []).map(id => id.toString());
                    const sendableIds= (ed.sendableTopicIds || []).map(id => id.toString());
                    const hasAccess  = allowedIds.includes(tid);
                    const hasSend    = sendableIds.includes(tid);
                    return (
                        <div key={tid} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 8px', background: 'var(--bg-secondary)', borderRadius: 6,
                        }}>
                            {t.channelType === 'voice'
                                ? <Volume2 size={12} color="var(--text-muted)" />
                                : <Hash size={12} color="var(--text-muted)" />}
                            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>
                                {t.emoji} {t.name}
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
                                          }))
                                        : toggleTopic(roleId, 'allowedTopicIds', tid)
                                    }
                                />
                                Xem
                            </label>
                            <label style={{
                                fontSize: 11, color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                            }}>
                                <input type="checkbox" checked={hasSend}
                                    disabled={!hasAccess && allowedIds.length > 0}
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
                                Gửi
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Mini avatar stack cho member đang dùng role
    const renderMemberAvatars = (roleMembers) => {
        if (roleMembers.length === 0) return (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chưa có thành viên</span>
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
                        : `${roleMembers[0]?.user?.displayName || '?'} +${roleMembers.length - 1} khác`
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
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{roles.length} / 10 roles</span>
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
                    <Plus size={13} /> Tạo role
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
                            Tạo role mới
                        </div>
                        <input
                            value={newRole.name}
                            onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))}
                            placeholder="Tên role..."
                            style={{
                                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', outline: 'none',
                                boxSizing: 'border-box', marginBottom: 10,
                            }}
                        />
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Màu</div>
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
                            }}>Quyền hạn</div>
                            {PERMISSIONS_META.map(p => (
                                <label key={p.key} style={{
                                    display: 'flex', alignItems: 'center',
                                    gap: 8, marginBottom: 6, cursor: 'pointer',
                                }}>
                                    <Toggle
                                        checked={!!newRole.permissions[p.key]}
                                        onChange={v => setNewRole(prev => ({
                                            ...prev, permissions: { ...prev.permissions, [p.key]: v },
                                        }))}
                                    />
                                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.label}</span>
                                </label>
                            ))}
                        </div>
                        {renderTopicPermissions(newRole, null, true)}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleCreate} disabled={busy === 'create'} style={{
                                padding: '7px 16px', background: 'var(--accent)', color: '#fff',
                                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>
                                {busy === 'create' ? 'Đang tạo...' : 'Tạo'}
                            </button>
                            <button onClick={() => setCreating(false)} style={{
                                padding: '7px 14px', background: 'var(--bg-hover)',
                                color: 'var(--text-primary)', border: 'none', borderRadius: 8,
                                fontSize: 12, cursor: 'pointer',
                            }}>Hủy</button>
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
                                }}
                            >
                                <div style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: role.color, flexShrink: 0,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {role.name}
                                    </span>
                                    {/* FIX KEY: avatar stack + tên thành viên thật */}
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
                                            Tên role
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
                                            Màu
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
                                        }}>Quyền hạn</div>
                                        {PERMISSIONS_META.map(p => (
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
                                                        {p.label}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {PERMISSIONS_META.find(x => x.key === p.key)?.desc}
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
                                            }}>Thành viên đang dùng role này</div>
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
                                                            {ROLE_CFG[m.role]?.label || m.role}
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
                                            {busy === `update-${role._id}` ? 'Đang lưu...' : 'Lưu'}
                                        </button>
                                        <button onClick={() => handleDelete(role)} disabled={isBusy} style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '7px 14px', background: '#ed424520', color: '#ed4245',
                                            border: '1px solid #ed424440', borderRadius: 8,
                                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        }}>
                                            <Trash2 size={12} /> Xóa role
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {roles.length === 0 && !creating && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Chưa có custom role nào.<br />
                        <button onClick={() => setCreating(true)} style={{
                            marginTop: 10, background: 'none', border: 'none',
                            color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        }}>
                            Tạo role đầu tiên
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
    const [activeTab, setActiveTab]       = useState('members');
    const [roles, setRoles]               = useState([]);
    const [topics, setTopics]             = useState([]);
    // FIX KEY: members state ở modal level để cả 2 tab dùng chung
    const [members, setMembers]           = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

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

    if (!visible) return null;

    const tabs = [
        { key: 'members', label: '👥 Thành viên' },
        { key: 'roles',   label: '🎭 Roles' },
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
                            Quản lý nhóm
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{conversation?.name}</div>
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
                        onMembersReload={handleReloadAll}
                    />
                )}
                {activeTab === 'roles' && (
                    <RolesTab
                        conversation={conversation}
                        currentUserId={currentUserId}
                        roles={roles}
                        topics={topics}
                        members={members}
                        onRefresh={handleReloadAll}
                    />
                )}
            </div>
        </div>
    );
}