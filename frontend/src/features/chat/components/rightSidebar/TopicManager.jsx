import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Lock, Unlock, Hash, Volume2, FileText, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { translateTopicName } from '../../../../utils/translationUtils';

const getChannelOpts = (t) => [
    { value: 'text',   label: t('topic_manager.types.text'),  Icon: Hash    },
    { value: 'voice',  label: t('topic_manager.types.voice'), Icon: Volume2  },
    { value: 'system', label: t('topic_manager.types.system'),  Icon: FileText },
];

const getChannelIcon = (channelType) => {
    if (channelType === 'voice') return Volume2;
    if (channelType === 'system') return FileText;
    return Hash;
};
import conversationApi from '../../api/conversationApi';

const CATEGORY_EMOJIS = ['💬', '📢', '📚', '🎮', '🔧', '🎵', '📌', '🎉'];

export default function TopicManager({ conversation, canManage, onTopicSelect, activeTopic, onTopicsChanged }) {
    const { t } = useLanguage();
    const CHANNEL_TYPE_OPTS = getChannelOpts(t);
    const [topics, setTopics]               = useState([]);
    const [loading, setLoading]             = useState(false);
    const [showForm, setShowForm]           = useState(false);
    const [editingTopic, setEditingTopic]   = useState(null);
    const [form, setForm]                   = useState({ name: '', emoji: '💬', categoryName: '', channelType: 'text', description: '' });
    const [saving, setSaving]               = useState(false);
    const [collapsedCats, setCollapsedCats] = useState({});
    const [hoveredId, setHoveredId]         = useState(null);

    // ── Helper to translate hardcoded backend strings ────────────────────────
    const translateTopicContent = (val) => translateTopicName(val, t);

    const loadTopics = useCallback(async () => {
        if (!conversation?.id) return;
        try {
            setLoading(true);
            const res = await conversationApi.listTopics(conversation.id);
            setTopics(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch {
            setTopics([]);
        } finally {
            setLoading(false);
        }
    }, [conversation?.id]);

    useEffect(() => { loadTopics(); }, [loadTopics]);

    const openCreate = () => {
        setEditingTopic(null);
        setForm({ name: '', emoji: '💬', categoryName: '', channelType: 'text', description: '' });
        setShowForm(true);
    };

    const openEdit = (topic) => {
        setEditingTopic(topic);
        setForm({
            name: topic.name,
            emoji: topic.emoji || '💬',
            categoryName: topic.categoryName || '',
            channelType: topic.channelType || 'text',
            description: topic.description || '',
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            setSaving(true);
            if (editingTopic) {
                await conversationApi.updateTopic(conversation.id, editingTopic._id, form);
            } else {
                await conversationApi.createTopic(conversation.id, form);
            }
            setShowForm(false);
            await loadTopics();
            onTopicsChanged?.(); // ← thêm dòng này
        } catch (err) {
            window.alert(err.response?.data?.message || t('topic_manager.save_error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (topic) => {
        if (!window.confirm(t('topic_manager.delete_confirm', { name: topic.name }))) return;
        try {
            await conversationApi.deleteTopic(conversation.id, topic._id);
            await loadTopics();
            onTopicsChanged?.(); // ← thêm dòng này
            if (activeTopic?._id === topic._id) onTopicSelect(null);
        } catch (err) {
            window.alert(err.response?.data?.message || t('topic_manager.delete_error'));
        }
    };

    const handleToggleLock = async (topic) => {
        try {
            await conversationApi.updateTopic(conversation.id, topic._id, { isLocked: !topic.isLocked });
            await loadTopics();
        } catch { /* ignore */ }
    };

    const toggleCat = (cat) => setCollapsedCats((p) => ({ ...p, [cat]: !p[cat] }));

    const grouped = topics.reduce((acc, t) => {
        const cat = t.categoryName || '';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(t);
        return acc;
    }, {});

    const s = {
        sectionLabel: {
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.7px',
        },
        input: {
            width: '100%', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-primary)', padding: '8px 10px',
            outline: 'none', fontSize: 13, boxSizing: 'border-box',
        },
        iconBtn: {
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '3px 4px',
            display: 'flex', borderRadius: 4,
            transition: 'background 0.1s, color 0.1s',
        },
    };

    const TopicRow = ({ topic, isActive }) => {
        const hovered = hoveredId === topic._id;
        const ChannelIcon = getChannelIcon(topic.channelType);
        return (
            <div
                onMouseEnter={() => setHoveredId(topic._id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 6px', borderRadius: 6, marginBottom: 1,
                    background: isActive ? 'var(--accent)' : hovered ? 'var(--bg-hover)' : 'transparent',
                    opacity: topic.isLocked ? 0.6 : 1,
                    transition: 'background 0.1s',
                }}
            >
                <div
                    onClick={() => !topic.isLocked && onTopicSelect(topic)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, cursor: topic.isLocked ? 'not-allowed' : 'pointer' }}
                >
                    <ChannelIcon size={14} style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{
                        fontSize: 13, flex: 1,
                        color: isActive ? '#fff' : 'var(--text-primary)',
                        fontWeight: isActive ? 700 : 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {translateTopicContent(topic.name)}
                    </span>
                    {topic.isLocked && (
                        <Lock size={11} style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                </div>

                {canManage && (hovered || isActive) && (
                    <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggleLock(topic); }}
                            style={{ ...s.iconBtn, color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
                            title={topic.isLocked ? t('topic_manager.unlock') : t('topic_manager.lock')}
                        >
                            {topic.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); openEdit(topic); }}
                            style={{ ...s.iconBtn, color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
                            title={t('topic_manager.edit_title')}
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(topic); }}
                            style={{ ...s.iconBtn, color: isActive ? 'rgba(255,100,100,0.9)' : '#ed4245' }}
                            title={t('common.delete')}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', marginBottom: 4 }}>
                <span style={s.sectionLabel}>{t('topic_manager.title')}</span>
                {canManage && (
                    <button
                        onClick={openCreate}
                        style={{ ...s.iconBtn, color: 'var(--accent)' }}
                        title={t('topic_manager.create_btn')}
                    >
                        <Plus size={15} />
                    </button>
                )}
            </div>

            {/* #chung */}
            <div
                onMouseEnter={() => setHoveredId('__chung')}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onTopicSelect(null)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 6px', borderRadius: 6, cursor: 'pointer', marginBottom: 1,
                    background: !activeTopic ? 'var(--accent)' : hoveredId === '__chung' ? 'var(--bg-hover)' : 'transparent',
                    transition: 'background 0.1s',
                }}
            >
                <Hash size={14} style={{ color: !activeTopic ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: !activeTopic ? '#fff' : 'var(--text-primary)', fontWeight: !activeTopic ? 700 : 500 }}>
                    {t('chat.general_channel')}
                </span>
            </div>

            {loading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '6px 8px' }}>{t('topic_manager.loading')}</div>
            )}

            {/* Topics by category */}
            {Object.entries(grouped).map(([cat, catTopics]) => (
                <div key={cat} style={{ marginTop: cat ? 8 : 0 }}>
                    {cat && (
                        <div
                            onClick={() => toggleCat(cat)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 4px 4px 2px', cursor: 'pointer', marginBottom: 2,
                            }}
                        >
                            {collapsedCats[cat]
                                ? <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                                : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
                            }
                            <span style={s.sectionLabel}>{translateTopicContent(cat)}</span>
                        </div>
                    )}

                    {!collapsedCats[cat] && catTopics.map(topic => (
                        <TopicRow
                            key={topic._id}
                            topic={topic}
                            isActive={activeTopic?._id === topic._id}
                        />
                    ))}
                </div>
            ))}

            {!loading && topics.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '6px 8px', fontStyle: 'italic' }}>
                    {canManage ? t('topic_manager.no_topics_manage') : t('topic_manager.no_topics')}
                </div>
            )}

            {/* Create/Edit form */}
            {showForm && (
                <div style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 12, marginTop: 10,
                    display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                            {editingTopic ? t('topic_manager.edit_title') : t('topic_manager.create_title')}
                        </span>
                        <button onClick={() => setShowForm(false)} style={{ ...s.iconBtn }}>
                            <X size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                            value={form.emoji}
                            onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                            style={{ ...s.input, width: 54, padding: '8px 4px', textAlign: 'center', flexShrink: 0 }}
                        >
                            {CATEGORY_EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
                        </select>
                        <input
                            placeholder={t('topic_manager.name_placeholder')}
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                            style={{ ...s.input, flex: 1 }}
                            autoFocus
                        />
                    </div>

                    <select
                        value={form.channelType}
                        onChange={(e) => setForm((p) => ({ ...p, channelType: e.target.value }))}
                        style={{ ...s.input }}
                    >
                        {CHANNEL_TYPE_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <input
                        placeholder={t('topic_manager.cat_placeholder')}
                        value={form.categoryName}
                        onChange={(e) => setForm((p) => ({ ...p, categoryName: e.target.value }))}
                        style={s.input}
                    />

                    <input
                        placeholder={t('topic_manager.desc_placeholder')}
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        style={s.input}
                    />

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{
                                background: 'var(--bg-hover)', border: 'none', borderRadius: 8,
                                padding: '7px 12px', cursor: 'pointer',
                                color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
                            }}
                        >
                            {t('topic_manager.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !form.name.trim()}
                            style={{
                                background: 'var(--accent)', border: 'none', borderRadius: 8,
                                padding: '7px 14px', cursor: 'pointer',
                                color: '#fff', fontWeight: 700, fontSize: 13,
                                opacity: saving || !form.name.trim() ? 0.6 : 1,
                            }}
                        >
                            {saving ? (editingTopic ? t('topic_manager.updating') : t('topic_manager.creating')) : (editingTopic ? t('topic_manager.save') : t('topic_manager.save'))}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
