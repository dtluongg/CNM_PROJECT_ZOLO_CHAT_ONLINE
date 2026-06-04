import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Flag, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getStats } from './api/adminApi';
import StatsOverview    from './components/StatsOverview';
import UserManagement   from './components/UserManagement';
import ReportManagement from './components/ReportManagement';

const TABS = [
    { id: 'overview', label: 'Tổng quan',      Icon: LayoutDashboard },
    { id: 'users',    label: 'Người dùng',      Icon: Users },
    { id: 'reports',  label: 'Báo cáo',         Icon: Flag },
];

export default function AdminPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab]   = useState('overview');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!user) return;
        if (!['admin', 'moderator'].includes(user.role)) {
            navigate('/chat', { replace: true });
        }
    }, [user]);

    useEffect(() => {
        if (!token) return;
        getStats().then(setStats).catch(() => {});
    }, [token]);

    if (!user || !['admin', 'moderator'].includes(user.role)) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                background: 'var(--bg-secondary)',
            }}>
                <Shield size={22} color="var(--accent)" />
                <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Admin Dashboard</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ZoloChat · {user.role === 'admin' ? 'Super Admin' : 'Moderator'}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                {TABS.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTab(id)} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', borderRadius: '10px 10px 0 0',
                        border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === id ? 700 : 400,
                        background: tab === id ? 'var(--bg-primary)' : 'transparent',
                        color: tab === id ? 'var(--accent)' : 'var(--text-muted)',
                        borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
                        transition: 'all 0.15s',
                    }}>
                        <Icon size={16} />
                        {label}
                        {id === 'reports' && stats?.reports?.pending > 0 && (
                            <span style={{ background: '#ed4245', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 800, padding: '1px 5px' }}>
                                {stats.reports.pending}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {tab === 'overview' && <StatsOverview stats={stats} />}
                {tab === 'users'    && <UserManagement />}
                {tab === 'reports'  && <ReportManagement />}
            </div>
        </div>
    );
}