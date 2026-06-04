import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShieldOff, Shield, Trash2, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { listUsers, banUser, unbanUser, changeRole, deleteUser } from '../api/adminApi';
import { useAuth } from '../../../context/AuthContext';

const ROLE_COLORS = { admin: '#ed4245', moderator: '#faa61a', user: 'var(--text-muted)' };
const ROLE_LABELS = { admin: 'Admin', moderator: 'Mod', user: 'User' };

const Avatar = ({ user }) => {
    const name = user.displayName || user.email || '?';
    const initials = name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return user.avatar
        ? <img src={user.avatar} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
        : (
            <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13,
            }}>{initials}</div>
        );
};

export default function UserManagement() {
    const { token, user: me } = useAuth();
    const [users, setUsers]   = useState([]);
    const [total, setTotal]   = useState(0);
    const [page, setPage]     = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter]   = useState('');
    const [bannedFilter, setBannedFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [banModal, setBanModal] = useState(null);  // { userId, displayName }
    const [banReason, setBanReason] = useState('Vi phạm điều khoản sử dụng');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listUsers({ page, limit: 20, search, role: roleFilter, banned: bannedFilter });
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter, bannedFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleBan = async () => {
        await banUser(banModal.userId, banReason);
        setBanModal(null);
        fetchUsers();
    };

    const handleUnban = async (id) => {
        if (!confirm('Gỡ ban user này?')) return;
        await unbanUser(id);
        fetchUsers();
    };

    const handleRoleChange = async (id, role) => {
        if (!confirm(`Đổi role thành "${role}"?`)) return;
        await changeRole(id, role);
        fetchUsers();
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Xóa vĩnh viễn tài khoản "${name}"? Không thể hoàn tác!`)) return;
        await deleteUser(id);
        fetchUsers();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Tìm tên, email, username..."
                        style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                </div>
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    style={{ height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0 12px', fontSize: 13 }}>
                    <option value="">Tất cả role</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    <option value="user">User</option>
                </select>
                <select value={bannedFilter} onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
                    style={{ height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0 12px', fontSize: 13 }}>
                    <option value="">Mọi trạng thái</option>
                    <option value="false">Hoạt động</option>
                    <option value="true">Bị khóa</option>
                </select>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng: {total} người dùng</div>

            {/* Table */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : users.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có user nào</div>
                ) : users.map((u, i) => (
                    <div key={u._id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                        opacity: u.isBanned ? 0.6 : 1,
                    }}>
                        <Avatar user={u} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{u.displayName}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLORS[u.role] }}>
                                    {ROLE_LABELS[u.role]}
                                </span>
                                {u.isBanned && <span style={{ fontSize: 10, background: '#ed424522', color: '#ed4245', borderRadius: 6, padding: '1px 6px' }}>KHÓA</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
                            {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        {/* Actions */}
                        {u._id !== me?._id && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                {u.isBanned ? (
                                    <ActionBtn icon={Shield} color="#3ba55c" title="Gỡ ban" onClick={() => handleUnban(u._id)} />
                                ) : (
                                    <ActionBtn icon={ShieldOff} color="#ed4245" title="Ban user" onClick={() => { setBanModal({ userId: u._id, displayName: u.displayName }); setBanReason('Vi phạm điều khoản sử dụng'); }} />
                                )}
                                {me?.role === 'admin' && (
                                    <>
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '0 6px', fontSize: 12 }}>
                                            <option value="user">User</option>
                                            <option value="moderator">Mod</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <ActionBtn icon={Trash2} color="#ed4245" title="Xóa" onClick={() => handleDelete(u._id, u.displayName)} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <PageBtn icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Trang {page} / {totalPages}</span>
                    <PageBtn icon={ChevronRight} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
                </div>
            )}

            {/* Ban Modal */}
            {banModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setBanModal(null)}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: 28, width: 400, maxWidth: '90vw', border: '1px solid var(--border)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Khóa tài khoản</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Bạn sắp khóa <strong style={{ color: 'var(--text-primary)' }}>{banModal.displayName}</strong></div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Lý do</label>
                        <input value={banReason} onChange={(e) => setBanReason(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 20 }} />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setBanModal(null)} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                            <button onClick={handleBan} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ed4245', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Khóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const ActionBtn = ({ icon: Icon, color, title, onClick }) => (
    <button onClick={onClick} title={title} style={{
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: color + '22', color, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <Icon size={14} />
    </button>
);

const PageBtn = ({ icon: Icon, disabled, onClick }) => (
    <button onClick={onClick} disabled={disabled} style={{
        width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--bg-secondary)', color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <Icon size={16} />
    </button>
);