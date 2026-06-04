import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { usePresence } from '../../../context/PresenceContext';
import {
  ChevronLeft, ChevronRight, Search, Plus, Settings,
  Hash, Volume2, FileText, MessageCircle, LogOut, UserSearch, X, ArrowLeft,
  ChevronDown, Lock, Users,
} from 'lucide-react';

import Avatar, { getAvatarColor, getInitials } from './leftSidebar/ui/Avatar';
import ConvItem from './leftSidebar/ui/ConvItem';
import IconBtn from './leftSidebar/ui/IconBtn';
import conversationApi from '../api/conversationApi';
import voiceRoomApi from '../../voice/api/voiceRoomApi';
import { VoiceRoomProvider } from '../../voice/VoiceRoomContext';
import { useVoiceRoomContext } from '../../voice/VoiceRoomContext';
import { useLanguage } from '../../../context/LanguageContext';

export default function LeftSidebar({
  conversations,
  activeConv,
  onSelectConv,
  onOpenSettings,
  onOpenSearch,
  onOpenCreateGroup,
  activeTopic,
  onTopicSelect,
  topicsVersion = 0,
  isMobile = false,
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]           = useState(false);
  const [search, setSearch]                 = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const GROUP_TYPE_LABEL_T = {
    study:   t('auth.group_types.study'),
    gaming:  t('auth.group_types.gaming'),
    general: t('auth.group_types.general'),
    project: t('auth.group_types.project'),
    other:   t('auth.group_types.other'),
    sensitive: t('auth.group_types.sensitive'),
  };

  // ── Voice room context ─────────────────────────────────────
  const { getRoomInfo, fetchStatusBatch, isInRoom } = useVoiceRoomContext();

  // ── Topic list for group view ──────────────────────────────
  const [topics, setTopics]               = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [canManage, setCanManage]         = useState(false);

  const isGroupView = activeConv?.type === 'group' && !collapsed;

  useEffect(() => {
      if (!isGroupView || !activeConv?.id) {
          setTopics([]);
          return;
      }
      let cancelled = false;
      setTopicsLoading(true);
      conversationApi.listTopics(activeConv.id)
          .then(res => {
              if (!cancelled) {
                  setTopics(Array.isArray(res?.data?.data) ? res.data.data : []);
                  fetchStatusBatch(activeConv.id);
              }
          })
          .catch(() => { if (!cancelled) setTopics([]); })
          .finally(() => { if (!cancelled) setTopicsLoading(false); });

      const role = activeConv?.myMembership?.role;
      setCanManage(role === 'owner' || role === 'admin' || !!activeConv?.myMembership?.canManageMembers);

      return () => { cancelled = true; };
  }, [activeConv?.id, isGroupView, topicsVersion]); // ← thêm topicsVersion

  // Refresh topics when a new one is added from outside
  const reloadTopics = useCallback(async () => {
    if (!activeConv?.id) return;
    try {
      const res = await conversationApi.listTopics(activeConv.id);
      setTopics(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch { /* ignore */ }
  }, [activeConv?.id]);

  // Group topics by category
  const grouped = topics.reduce((acc, t) => {
    const cat = t.categoryName || '';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const toggleCat = (cat) => setCollapsedCats(p => ({ ...p, [cat]: !p[cat] }));

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const dms    = filtered.filter(c => c.type === 'dm');
  const groups = filtered.filter(c => c.type === 'group');

  const myStatus = user?.status || 'online';
  const STATUS_CONFIG = {
    online:    { color: '#3ba55c', label: t('chat.status.online') },
    idle:      { color: '#faa61a', label: t('chat.status.idle') },
    dnd:       { color: '#ed4245', label: t('chat.status.dnd') },
    invisible: { color: '#80848e', label: t('chat.status.invisible') },
  };
  const myStatusConfig = STATUS_CONFIG[myStatus] || STATUS_CONFIG.online;

  // ── Helper to translate hardcoded backend strings ────────────────────────
  const translateTopicContent = (val) => {
    if (!val) return val;
    const mapping = {
      // Categories
      '📚 Học tập': t('chat.topics.study_cat'),
      '🔔 Hệ thống': t('chat.topics.system_cat'),
      // Channels
      'học-tập-chung': t('chat.topics.study_general'),
      'hỏi-bài': t('chat.topics.study_qa'),
      'chia-sẻ-tài-liệu': t('chat.topics.study_files'),
      'nhật-ký-nhóm': t('chat.topics.system_log'),
      'thảo-luận-chung': t('chat.topics.general_chat'),
    };
    return mapping[val] || val;
  };

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    logout();
  }, [logout]);

  const sidebarWidth = isMobile ? '100%' : collapsed ? 72 : 260;

  // ── Channel row component ──────────────────────────────────
  const ChannelRow = ({ topic, active, onSelect }) => {
    const [hovered, setHovered]   = useState(false);
    const isVoice  = topic.channelType === 'voice';
    const isSystem = topic.channelType === 'system';
    const ChannelIcon = isVoice ? Volume2 : isSystem ? FileText : Hash;

    // Voice channel: get live participant list
    const voiceInfo    = isVoice && topic._id ? getRoomInfo(topic._id) : null;
    const voiceParts   = voiceInfo?.active ? (voiceInfo.participants || []) : [];
    const iAmInThis    = isVoice && topic._id ? isInRoom(topic._id) : false;

    return (
      <div style={{ margin: isMobile ? '1px 0' : '1px 4px' }}>
        {/* Channel name row */}
        <div
          onClick={() => !topic.isLocked && onSelect(topic)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '10px 12px' : '5px 8px',
            borderRadius: 6, cursor: topic.isLocked ? 'not-allowed' : 'pointer',
            background: active ? 'var(--accent)' : hovered ? 'var(--bg-hover)' : 'transparent',
            opacity: topic.isLocked ? 0.5 : 1,
            transition: 'background 0.1s',
          }}
        >
          <ChannelIcon size={isMobile ? 17 : 14} style={{ color: active ? '#fff' : voiceParts.length > 0 ? '#3ba55c' : 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: isMobile ? 15 : 13, flex: 1, color: active ? '#fff' : 'var(--text-primary)', fontWeight: active ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {translateTopicContent(topic.name)}
          </span>
          {topic.isLocked && <Lock size={11} style={{ color: active ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', flexShrink: 0 }} />}
          {isVoice && voiceParts.length > 0 && (
            <span style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.8)' : '#3ba55c', fontWeight: 700, flexShrink: 0 }}>{voiceParts.length}</span>
          )}
          {iAmInThis && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#fff' : '#3ba55c', flexShrink: 0 }} />
          )}
        </div>

        {/* Participant avatars below voice channel (when people are in it) */}
        {isVoice && voiceParts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '2px 12px 6px 32px' : '2px 8px 4px 26px', flexWrap: 'wrap' }}>
            {voiceParts.slice(0, 6).map(p => (
              <VoiceParticipantChip key={p.userId} participant={p} size={isMobile ? 22 : 18} />
            ))}
            {voiceParts.length > 6 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{voiceParts.length - 6}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const VoiceParticipantChip = ({ participant, size }) => {
    const [err, setErr] = useState(false);
    return (
      <div title={participant.displayName} style={{ position: 'relative' }}>
        {participant.avatar && !err ? (
          <img src={participant.avatar} alt={participant.displayName} onError={() => setErr(true)}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            width: size, height: size, borderRadius: '50%',
            background: getAvatarColor(participant.displayName),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: size * 0.45, fontWeight: 700,
          }}>
            {getInitials(participant.displayName)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: sidebarWidth, minWidth: sidebarWidth, height: '100%',
      background: 'var(--bg-secondary)',
      display: 'flex', flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      transition: isMobile ? 'none' : 'width 0.2s, min-width 0.2s',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Logout confirm — fixed overlay, centered on whole screen */}
      {showLogoutConfirm && (
        <div
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '32px 28px 24px',
              width: 320, maxWidth: '90vw',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              animation: 'modalIn 0.2s ease',
            }}
          >
            <div style={{ fontSize: 44, lineHeight: 1 }}>👋</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', textAlign: 'center' }}>{t('auth.logout')}?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>{t('auth.logout_confirm_desc')}</div>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 10, padding: '11px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{t('common.cancel')}</button>
              <button onClick={handleLogout} style={{ flex: 1, background: '#ed4245', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{t('auth.logout')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GROUP CHANNEL VIEW ═══════════════════════════════ */}
      {isGroupView ? (
        <>
          {/* Group header */}
          <div style={{
            height: isMobile ? 56 : 52, flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
          }}>
            {/* Back button + group name */}
            <button
              onClick={() => { onSelectConv(null); onTopicSelect && onTopicSelect(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: isMobile ? '0 14px' : '0 10px',
                color: 'var(--text-muted)',
              }}
            >
              <ArrowLeft size={15} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                {t('navbar.chat')}
              </span>
            </button>
          </div>

          {/* Group info card */}
          <div style={{
            padding: isMobile ? '14px 14px 10px' : '12px 12px 8px',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={activeConv.name} avatar={activeConv.avatar} size={isMobile ? 42 : 36} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: isMobile ? 16 : 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeConv.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {activeConv.groupType && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {GROUP_TYPE_LABEL_T[activeConv.groupType] || activeConv.groupType}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={10} /> {activeConv.memberCount || 0}
                  </span>
                </div>
              </div>
            </div>
            {activeConv.description && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic', lineHeight: 1.4 }}>
                {activeConv.description}
              </div>
            )}
          </div>

          {/* Channel list */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent' }}>

            {/* Category header label */}
            <div style={{ padding: isMobile ? '12px 14px 4px' : '10px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                {t('chat.channels_label', { defaultValue: 'Kênh chat' })}
              </span>
              {canManage && (
                <button
                  onClick={() => { /* open topic manager in right sidebar via a flag — handled by onTopicSelect */ }}
                  title={t('auth.manage_channels')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', borderRadius: 4 }}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            {/* #chung */}
            <ChannelRow
              topic={{ _id: null, name: t('chat.general_channel'), isLocked: false }}
              active={!activeTopic}
              onSelect={() => onTopicSelect && onTopicSelect(null)}
            />

            {topicsLoading && (
              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</div>
            )}

            {/* Topics grouped by category */}
            {Object.entries(grouped).map(([cat, catTopics]) => (
              <div key={cat} style={{ marginTop: cat ? 8 : 0 }}>
                {cat && (
                  <div
                    onClick={() => toggleCat(cat)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: isMobile ? '8px 14px 4px' : '6px 12px 3px',
                      cursor: 'pointer',
                    }}
                  >
                    {collapsedCats[cat]
                      ? <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
                      : <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
                    }
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      {translateTopicContent(cat)}
                    </span>
                  </div>
                )}

                {!collapsedCats[cat] && catTopics.map(topic => (
                  <ChannelRow
                    key={topic._id}
                    topic={topic}
                    active={activeTopic?._id === topic._id}
                    onSelect={() => onTopicSelect && onTopicSelect(topic)}
                  />
                ))}
              </div>
            ))}

            {!topicsLoading && topics.length === 0 && (
              <div style={{ padding: isMobile ? '10px 14px' : '8px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {t('auth.no_channels')}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ═══ NORMAL CONVERSATION LIST VIEW ══════════════════ */
        <>
          {/* Header */}
          <div style={{
            height: isMobile ? 56 : 52,
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 14px' : isMobile ? '0 16px' : '0 10px 0 16px',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            paddingTop: 'env(safe-area-inset-top, 0px)',
            background: 'var(--bg-secondary)',
          }}>
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo.svg" alt="Logo" width={22} height={22} draggable={false} style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(var(--accent-rgb,88,166,255),0.5))' }} />
                <span style={{ fontWeight: 800, fontSize: isMobile ? 17 : 15, color: 'var(--text-primary)', letterSpacing: -0.4, userSelect: 'none' }}>
                  ZoloChat
                </span>
              </div>
            )}
            {!isMobile && (
              <IconBtn
                icon={collapsed ? ChevronRight : ChevronLeft}
                onClick={() => setCollapsed(v => !v)}
                title={collapsed ? t('auth.expand') : t('auth.collapse')}
              />
            )}
          </div>

          {/* Search bar */}
          {!collapsed && (
            <div style={{ padding: isMobile ? '10px 12px 6px' : '8px 10px 5px', display: 'flex', gap: 6, flexShrink: 0 }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--bg-primary)',
                borderRadius: 10, padding: isMobile ? '9px 12px' : '7px 10px',
                border: '1px solid transparent',
                transition: 'border-color 0.15s',
              }}
                onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.4)'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('chat.search_chat')}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: isMobile ? 14 : 12.5 }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <button onClick={onOpenSearch} title={t('auth.search_users')} style={{
                background: 'var(--bg-primary)', border: '1px solid transparent', borderRadius: 10,
                padding: isMobile ? '9px 11px' : '7px 9px', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                transition: 'color 0.15s, background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
              >
                <UserSearch size={isMobile ? 17 : 14} />
              </button>
            </div>
          )}

          {collapsed && (
            <div style={{ padding: '6px 10px', flexShrink: 0 }}>
              <button onClick={onOpenSearch} title={t('chat.search_chat')} style={{ width: '100%', background: 'var(--bg-primary)', border: 'none', borderRadius: 8, padding: '7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserSearch size={16} />
              </button>
            </div>
          )}

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent' }}>
            {!collapsed && dms.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '14px 16px 6px' : '10px 16px 4px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {t('navbar.chat')} ({dms.length})
                </span>
                {!isMobile && <IconBtn icon={Plus} title={t('auth.new_message')} size={14} />}
              </div>
            )}
            {dms.map(conv => (
              <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} collapsed={collapsed} isMobile={isMobile} onClick={onSelectConv} />
            ))}

            {(groups.length > 0 || !collapsed) && (
              <>
                {!collapsed && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '14px 16px 6px' : '10px 16px 4px', marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {t('chat.group_chat')} ({groups.length})
                    </span>
                    {!isMobile && <IconBtn icon={Plus} title={t('auth.create_group_btn')} size={14} onClick={onOpenCreateGroup} />}
                  </div>
                )}
                {groups.map(conv => (
                  <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} collapsed={collapsed} isMobile={isMobile} onClick={onSelectConv} />
                ))}
              </>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                {t('auth.no_conversations_found')}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom — user info (always shown) */}
      <div style={{ padding: collapsed ? '8px' : isMobile ? '10px 16px' : '6px 10px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 10 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 8, minWidth: 0, flex: 1, cursor: 'pointer', borderRadius: 8, padding: '3px 4px', transition: 'background 0.13s' }}
            onClick={() => user?._id && navigate(`/user/${user._id}`)}
            title={user?.displayName}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user?.avatar
                ? <img src={user.avatar} alt={user.displayName} style={{ width: isMobile ? 40 : 34, height: isMobile ? 40 : 34, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: isMobile ? 40 : 34, height: isMobile ? 40 : 34, borderRadius: '50%', background: user?.usernameColor || getAvatarColor(user?.displayName || user?.email), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 13 }}>{getInitials(user?.displayName || user?.email || '?')}</div>
              }
              <span style={{ position: 'absolute', bottom: 1, right: 1, width: isMobile ? 12 : 10, height: isMobile ? 12 : 10, borderRadius: '50%', background: myStatusConfig.color, border: '2px solid var(--bg-primary)' }} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 700, color: user?.usernameColor || 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.displayName || 'User'}
                </div>
                <div style={{ fontSize: 11, color: myStatusConfig.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span>●</span><span>{myStatusConfig.label}</span>
                </div>
              </div>
            )}
          </div>{/* end clickable avatar+name */}
          {!collapsed && (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <IconBtn icon={Settings} onClick={e => { e.stopPropagation(); onOpenSettings(); }} title={t('auth.profile_settings')} size={isMobile ? 18 : 15} />
              <IconBtn icon={LogOut} onClick={e => { e.stopPropagation(); setShowLogoutConfirm(true); }} title={t('auth.logout')} size={isMobile ? 18 : 15} danger />
            </div>
          )}
        </div>
        {collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', marginTop: 4 }}>
            <IconBtn icon={Settings} onClick={onOpenSettings} title={t('auth.profile_settings')} size={15} />
            <IconBtn icon={LogOut} onClick={() => setShowLogoutConfirm(true)} title={t('auth.logout')} size={15} danger />
          </div>
        )}
      </div>
    </div>
  );
}