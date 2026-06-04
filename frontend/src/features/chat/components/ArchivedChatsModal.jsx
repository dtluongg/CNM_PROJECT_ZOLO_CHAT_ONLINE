import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft, Archive, LogOut, UserX, Ban } from 'lucide-react';
import conversationApi from '../api/conversationApi';
import messageApi from '../api/messageApi';
import { useLanguage } from '../../../context/LanguageContext';

const COLORS = ['#5865f2', '#eb459e', '#ed4245', '#faa61a', '#57f287', '#00b4d8', '#9b59b6', '#e67e22'];
const avatarBg = (name) => COLORS[(name || '?').charCodeAt(0) % COLORS.length];
const initial = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

function ArchiveAvatar({ name, avatar, size = 40 }) {
    const [err, setErr] = useState(false);
    if (avatar && !err) return (
        <img src={avatar} alt={name} onError={() => setErr(true)}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: avatarBg(name), display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.4,
        }}>{initial(name)}</div>
    );
}

export default function ArchivedChatsModal({ visible, onClose, currentUserId }) {
    const { t } = useLanguage();
    const [list, setList]       = useState([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive]   = useState(null);   // archived conv being read
    const [messages, setMessages] = useState([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);

    const leaveMeta = {
        left:      { icon: <LogOut size={12} />, color: '#80848e', label: t('archived.left') },
        kicked:    { icon: <UserX size={12} />,  color: '#ed4245', label: t('archived.kicked') },
        disbanded: { icon: <Ban size={12} />,    color: '#faa61a', label: t('archived.disbanded') },
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await conversationApi.getArchivedConversations();
            setList(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch { setList([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (visible) { load(); setActive(null); setMessages([]); } }, [visible, load]);

    const openConv = async (conv) => {
        setActive(conv);
        setLoadingMsgs(true);
        try {
            const res = await messageApi.getMessages(conv.id, { limit: 50 });
            const msgs = (res.data.messages || []).slice().reverse();
            setMessages(msgs);
        } catch { setMessages([]); }
        finally { setLoadingMsgs(false); }
    };

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                width: '100%', maxWidth: 560, height: '80vh', maxHeight: 640,
                background: 'var(--bg-secondary)', borderRadius: 14,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
                }}>
                    {active ? (
                        <button onClick={() => { setActive(null); setMessages([]); }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                            display: 'flex', padding: 2,
                        }}><ArrowLeft size={18} /></button>
                    ) : (
                        <Archive size={18} style={{ color: 'var(--accent)' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {active ? active.name : t('archived.title')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {active ? t('archived.read_only') : t('archived.subtitle')}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg-hover)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><X size={14} color="var(--text-muted)" /></button>
                </div>

                {/* Body */}
                {!active ? (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('common.loading')}</div>
                        ) : list.length === 0 ? (
                            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                <Archive size={34} style={{ opacity: 0.3, marginBottom: 10 }} />
                                <div>{t('archived.empty')}</div>
                            </div>
                        ) : list.map(conv => {
                            const meta = leaveMeta[conv.leaveType] || leaveMeta.left;
                            return (
                                <div key={conv.id} onClick={() => openConv(conv)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                                    borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <ArchiveAvatar name={conv.name} avatar={conv.avatar} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {conv.name}
                                        </div>
                                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {conv.lastMessagePreview || ''}
                                        </div>
                                    </div>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                                        fontSize: 10.5, fontWeight: 700, color: meta.color,
                                        background: meta.color + '20', borderRadius: 20, padding: '3px 9px',
                                    }}>
                                        {meta.icon}{meta.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {loadingMsgs ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('common.loading')}</div>
                        ) : messages.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('archived.no_messages')}</div>
                        ) : messages.map(m => {
                            if (m.type === 'system') {
                                return (
                                    <div key={m._id} style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0' }}>
                                        {m.content}
                                    </div>
                                );
                            }
                            const mine = (m.senderId?._id || m.senderId)?.toString() === currentUserId?.toString();
                            return (
                                <div key={m._id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                                    {!mine && <ArchiveAvatar name={m.senderName} avatar={m.avatar} size={28} />}
                                    <div style={{ maxWidth: '72%' }}>
                                        {!mine && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{m.senderName}</div>}
                                        <div style={{
                                            padding: '8px 11px', borderRadius: 12, fontSize: 13, lineHeight: 1.4,
                                            background: mine ? 'var(--accent)' : 'var(--bg-tertiary)',
                                            color: mine ? '#fff' : 'var(--text-primary)',
                                            wordBreak: 'break-word',
                                        }}>
                                            {m.type === 'image' ? <img src={m.content || m.payload?.url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
                                                : m.type === 'file' ? (m.payload?.fileName || t('archived.file'))
                                                : m.content}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{m.time}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}