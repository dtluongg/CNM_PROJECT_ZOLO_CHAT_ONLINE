import React from 'react';
import { ShieldOff, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BannedScreen({ reason }) {
    const { logout } = useAuth();
    const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@zolochat.com';

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: 24,
        }}>
            <div style={{
                background: 'var(--bg-secondary)', borderRadius: 20, padding: '48px 40px',
                maxWidth: 480, width: '100%', textAlign: 'center',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: '#ed424522', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 24px',
                }}>
                    <ShieldOff size={36} color="#ed4245" />
                </div>

                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Tài khoản bị khóa
                </h2>
                <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                    Tài khoản của bạn đã bị khóa bởi đội ngũ quản trị ZoloChat.
                </p>

                {reason && (
                    <div style={{
                        background: '#fff5f5', border: '1px solid #ed424544',
                        borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left',
                    }}>
                        <div style={{ fontSize: 11, color: '#ed4245', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Lý do</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>{reason}</div>
                    </div>
                )}

                <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                    Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ với đội ngũ hỗ trợ:
                </p>

                <a href={`mailto:${supportEmail}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--accent)', color: '#fff',
                    padding: '10px 24px', borderRadius: 10,
                    textDecoration: 'none', fontWeight: 600, fontSize: 14,
                    marginBottom: 16,
                }}>
                    <Mail size={16} />
                    Liên hệ hỗ trợ
                </a>

                <div>
                    <button onClick={logout} style={{
                        background: 'transparent', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', padding: '8px 20px', borderRadius: 10,
                        cursor: 'pointer', fontSize: 13,
                    }}>
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
}