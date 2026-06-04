import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ShieldOff, Loader } from 'lucide-react';
import { listReports, updateReport, getReportTarget, banFromReport } from '../api/adminApi';
import { useAuth } from '../../../context/AuthContext';

const STATUS_META = {
    pending:   { label: 'Chờ xử lý',      color: '#faa61a', Icon: Clock },
    reviewing: { label: 'Đang xét',         color: '#00b0f4', Icon: Clock },
    resolved:  { label: 'Đã giải quyết',   color: '#3ba55c', Icon: CheckCircle },
    dismissed: { label: 'Bỏ qua',           color: 'var(--text-muted)', Icon: XCircle },
};

const REASON_LABELS = {
    spam: 'Spam', harassment: 'Quấy rối', hate_speech: 'Ngôn từ thù địch',
    violence: 'Bạo lực', sexual_content: 'Nội dung không phù hợp',
    fake_account: 'Tài khoản giả', scam: 'Lừa đảo', other: 'Khác',
};

const TARGET_LABELS = { user: 'Người dùng', message: 'Tin nhắn', conversation: 'Nhóm/Phòng' };

// ── Hiển thị nội dung bị báo cáo ─────────────────────────────────
function TargetPreview({ report }) {
    const [data, setData]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr]     = useState('');

    useEffect(() => {
        if (!report?.targetType || !report?.targetId) return;
        setData(null); setErr('');
        setLoading(true);
        getReportTarget(report.targetType, report.targetId)
            .then(setData)
            .catch(() => setErr('Không thể tải nội dung (có thể đã bị xóa)'))
            .finally(() => setLoading(false));
    }, [report?.targetId]);

    if (loading) return (
        <div style={boxStyle}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải nội dung...</span>
        </div>
    );
    if (err) return <div style={{ ...boxStyle, color: '#ed4245', fontSize: 13 }}>{err}</div>;
    if (!data) return null;

    return (
        <div style={{ ...boxStyle, flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Nội dung bị báo cáo — {TARGET_LABELS[data.type]}
            </div>

            {data.type === 'message' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {data.sender?.avatar
                            ? <img src={data.sender.avatar} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                                {(data.sender?.displayName || '?')[0].toUpperCase()}
                              </div>
                        }
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{data.sender?.displayName}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(data.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    {data.revoked
                        ? <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Tin nhắn đã bị thu hồi</div>
                        : data.msgType === 'image'
                            ? <img src={data.payload?.url || data.content} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
                            : <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{data.content || '(Không có nội dung văn bản)'}</div>
                    }
                </>
            )}

            {data.type === 'user' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {data.avatar
                        ? <img src={data.avatar} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                            {(data.displayName || '?')[0].toUpperCase()}
                          </div>
                    }
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{data.displayName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.email}</div>
                        {data.isBanned && <div style={{ fontSize: 11, color: '#ed4245', fontWeight: 700 }}>ĐÃ BỊ KHÓA</div>}
                    </div>
                </div>
            )}

            {data.type === 'conversation' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {data.avatar
                        ? <img src={data.avatar} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                        : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                            {(data.name || '?')[0].toUpperCase()}
                          </div>
                    }
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{data.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.type === 'group' ? 'Nhóm' : 'DM'}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

const boxStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--bg-hover)', borderRadius: 10,
    padding: '12px 14px', marginBottom: 4,
};

// ── Main component ────────────────────────────────────────────────
export default function ReportManagement() {
    const { user: me } = useAuth();
    const [reports, setReports]     = useState([]);
    const [total, setTotal]         = useState(0);
    const [page, setPage]           = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading]     = useState(false);
    const [selected, setSelected]   = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [banReason, setBanReason] = useState('Vi phạm điều khoản sử dụng');
    const [showBanConfirm, setShowBanConfirm] = useState(false);
    const [actionLoading, setActionLoading]   = useState(false);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listReports({ page, limit: 20, status: statusFilter });
            setReports(data.reports || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const handleUpdate = async (id, status) => {
        setActionLoading(true);
        try {
            await updateReport(id, { status, adminNote });
            setSelected(null);
            setAdminNote('');
            fetchReports();
        } finally {
            setActionLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!selected) return;
        // Lấy userId từ target (nếu báo cáo user) hoặc từ reporter của tin nhắn
        const userId = selected.targetType === 'user'
            ? selected.targetId
            : null;
        if (!userId) return;
        setActionLoading(true);
        try {
            await banFromReport(userId, banReason);
            // Tự động resolve report sau khi ban
            await updateReport(selected._id, { status: 'resolved', adminNote: `Đã khóa tài khoản. Lý do: ${banReason}` });
            setSelected(null);
            setShowBanConfirm(false);
            setAdminNote('');
            fetchReports();
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['', 'pending', 'reviewing', 'resolved', 'dismissed'].map((s) => (
                    <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                        style={{
                            padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)',
                            background: statusFilter === s ? 'var(--accent)' : 'var(--bg-secondary)',
                            color: statusFilter === s ? '#fff' : 'var(--text-muted)',
                            cursor: 'pointer', fontSize: 13, fontWeight: statusFilter === s ? 700 : 400,
                        }}>
                        {s === '' ? 'Tất cả' : STATUS_META[s]?.label}
                    </button>
                ))}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng: {total} báo cáo</div>

            {/* List */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có báo cáo nào</div>
                ) : reports.map((r, i) => {
                    const meta = STATUS_META[r.status];
                    const MetaIcon = meta.Icon;
                    return (
                        <div key={r._id}
                            onClick={() => { setSelected(r); setAdminNote(r.adminNote || ''); setShowBanConfirm(false); setBanReason('Vi phạm điều khoản sử dụng'); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                borderBottom: i < reports.length - 1 ? '1px solid var(--border)' : 'none',
                                cursor: 'pointer', transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <MetaIcon size={16} color={meta.color} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                                        {REASON_LABELS[r.reason] || r.reason}
                                    </span>
                                    <span style={{ fontSize: 11, background: 'var(--bg-hover)', color: 'var(--text-muted)', borderRadius: 6, padding: '1px 6px' }}>
                                        {TARGET_LABELS[r.targetType]}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Bởi: {r.reporter?.displayName || r.reporter?.email}
                                    {r.targetSnapshot && ` → ${r.targetSnapshot}`}
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                                {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, flexShrink: 0 }}>{meta.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <PageBtn icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Trang {page} / {totalPages}</span>
                    <PageBtn icon={ChevronRight} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
                </div>
            )}

            {/* Detail Modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => { setSelected(null); setShowBanConfirm(false); }}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: 28, width: 520, maxWidth: '95vw', border: '1px solid var(--border)', maxHeight: '85vh', overflowY: 'auto' }}
                        onClick={(e) => e.stopPropagation()}>

                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 16 }}>Chi tiết báo cáo</div>

                        <Field label="Lý do" value={REASON_LABELS[selected.reason]} />
                        <Field label="Loại mục tiêu" value={TARGET_LABELS[selected.targetType]} />
                        {selected.targetSnapshot && <Field label="Mục tiêu" value={selected.targetSnapshot} />}
                        <Field label="Người báo cáo" value={`${selected.reporter?.displayName} (${selected.reporter?.email})`} />
                        {selected.description && <Field label="Mô tả" value={selected.description} />}
                        {selected.resolvedBy && <Field label="Giải quyết bởi" value={selected.resolvedBy?.displayName} />}

                        {/* Xem nội dung bị báo cáo */}
                        <div style={{ marginTop: 12, marginBottom: 4 }}>
                            <TargetPreview report={selected} />
                        </div>

                        {/* Quick ban — chỉ hiện khi target là user */}
                        {selected.targetType === 'user' && me?.role === 'admin' && (
                            <div style={{ marginTop: 16 }}>
                                {!showBanConfirm ? (
                                    <button onClick={() => setShowBanConfirm(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid #ed424566', background: '#ed424511', color: '#ed4245', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                        <ShieldOff size={14} />
                                        Khóa tài khoản này
                                    </button>
                                ) : (
                                    <div style={{ background: '#ed424511', border: '1px solid #ed424544', borderRadius: 12, padding: 16 }}>
                                        <div style={{ fontWeight: 700, color: '#ed4245', fontSize: 14, marginBottom: 8 }}>⚠️ Xác nhận khóa tài khoản</div>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Lý do</label>
                                        <input value={banReason} onChange={(e) => setBanReason(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => setShowBanConfirm(false)}
                                                style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                                            <button onClick={handleBanUser} disabled={actionLoading}
                                                style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: '#ed4245', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: actionLoading ? 0.7 : 1 }}>
                                                {actionLoading ? 'Đang xử lý...' : 'Xác nhận khóa'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Ghi chú admin */}
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6, marginTop: 16 }}>Ghi chú admin (sẽ gửi đến người báo cáo)</label>
                        <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3}
                            placeholder="Nhập ghi chú về cách xử lý..."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 20 }} />

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <ActionBtn label="Đang xét" color="#00b0f4" onClick={() => handleUpdate(selected._id, 'reviewing')} loading={actionLoading} />
                            <ActionBtn label="✅ Giải quyết" color="#3ba55c" onClick={() => handleUpdate(selected._id, 'resolved')} loading={actionLoading} />
                            <ActionBtn label="Bỏ qua" color="#4f545c" onClick={() => handleUpdate(selected._id, 'dismissed')} loading={actionLoading} />
                            <button onClick={() => { setSelected(null); setShowBanConfirm(false); }}
                                style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Đóng</button>
                        </div>

                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                            💬 Khi "Giải quyết" hoặc "Bỏ qua" — người báo cáo sẽ nhận email + thông báo trong app.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Field = ({ label, value }) => (
    <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</div>
    </div>
);

const ActionBtn = ({ label, color, onClick, loading }) => (
    <button onClick={onClick} disabled={loading}
        style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: color, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
        {loading ? '...' : label}
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