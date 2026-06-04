import React from 'react';
import { Users, MessageSquare, Flag, Wifi, TrendingUp } from 'lucide-react';

const Card = ({ icon: Icon, label, value, sub, color }) => (
    <div style={{
        background: 'var(--bg-secondary)', borderRadius: 16, padding: '20px 24px',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16,
    }}>
        <div style={{
            width: 48, height: 48, borderRadius: 12, background: color + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
            <Icon size={22} color={color} />
        </div>
        <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: color, marginTop: 2 }}>{sub}</div>}
        </div>
    </div>
);

const Bar = ({ days }) => {
    if (!days?.length) return null;
    const max = Math.max(...days.map((d) => d.count), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {days.map((d) => (
                <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div title={`${d.count} tin nhắn`} style={{
                        width: '100%', height: (d.count / max) * 64 + 4,
                        background: 'var(--accent)', borderRadius: 4, minHeight: 4,
                    }} />
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d._id.slice(5)}</span>
                </div>
            ))}
        </div>
    );
};

export default function StatsOverview({ stats }) {
    if (!stats) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Đang tải...</div>;

    const { users, messages, conversations, reports, charts } = stats;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <Card icon={Users}         label="Tổng người dùng"   value={users?.total}         sub={`+${users?.newToday} hôm nay`}   color="#5865f2" />
                <Card icon={Wifi}          label="Đang online"        value={users?.online}        sub={`${users?.banned} bị khóa`}       color="#3ba55c" />
                <Card icon={MessageSquare} label="Tổng tin nhắn"     value={messages?.total}      sub={`${messages?.thisWeek} tuần này`} color="#faa61a" />
                <Card icon={TrendingUp}    label="Cuộc trò chuyện"   value={conversations?.total}                                        color="#eb459e" />
                <Card icon={Flag}          label="Báo cáo chờ xử lý" value={reports?.pending}                                            color="#ed4245" />
            </div>

            {charts?.messagesPerDay?.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 24, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Tin nhắn 7 ngày qua</div>
                    <Bar days={charts.messagesPerDay} />
                </div>
            )}
        </div>
    );
}