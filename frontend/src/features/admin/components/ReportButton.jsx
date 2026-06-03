import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { createReport } from '../api/adminApi';

const REASONS = [
    { value: 'spam',            label: 'Spam' },
    { value: 'harassment',      label: 'Quấy rối' },
    { value: 'hate_speech',     label: 'Ngôn từ thù địch' },
    { value: 'violence',        label: 'Bạo lực' },
    { value: 'sexual_content',  label: 'Nội dung không phù hợp' },
    { value: 'fake_account',    label: 'Tài khoản giả mạo' },
    { value: 'scam',            label: 'Lừa đảo' },
    { value: 'other',           label: 'Khác' },
];

/**
 * Nút "Báo cáo" dùng chung.
 * Props: targetType ('user'|'message'|'conversation'), targetId, targetSnapshot (tên mục tiêu)
 */
export default function ReportButton({ targetType, targetId, targetSnapshot }) {
    const { token } = useAuth();
    const [open, setOpen]     = useState(false);
    const [reason, setReason] = useState('spam');
    const [desc, setDesc]     = useState('');
    const [done, setDone]     = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!token) return;
        setLoading(true);
        try {
            await createReport({ targetType, targetId, targetSnapshot, reason, description: desc });
            setDone(true);
            setTimeout(() => { setOpen(false); setDone(false); setDesc(''); setReason('spam'); }, 1500);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setOpen(true)} title="Báo cáo" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
            }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ed424522'; e.currentTarget.style.color = '#ed4245'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                <Flag size={14} />
                Báo cáo
            </button>

            {open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setOpen(false)}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw', border: '1px solid var(--border)' }}
                        onClick={(e) => e.stopPropagation()}>
                        {done ? (
                            <div style={{ textAlign: 'center', padding: 20 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Đã gửi báo cáo</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Cảm ơn, chúng tôi sẽ xem xét trong thời gian sớm nhất.</div>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 4 }}>Báo cáo vi phạm</div>
                                {targetSnapshot && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Mục tiêu: <strong style={{ color: 'var(--text-primary)' }}>{targetSnapshot}</strong></div>}

                                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Lý do</label>
                                <select value={reason} onChange={(e) => setReason(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }}>
                                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>

                                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Mô tả thêm (tuỳ chọn)</label>
                                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
                                    placeholder="Mô tả chi tiết..."
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 20 }} />

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button onClick={() => setOpen(false)} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                                    <button onClick={submit} disabled={loading} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ed4245', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: loading ? 0.7 : 1 }}>
                                        {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}