import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, UserMinus, ShieldAlert, ShieldCheck, Users, Edit3 } from 'lucide-react';
import { usePresence } from '../../../context/PresenceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { filterFriends, groupFriendsAlphabetically, getFriendStatus } from '../utils/friendHelpers';

const STATUS_DOT = { online: '#3ba55c', idle: '#faa61a', dnd: '#ed4245', offline: '#6b7280' };
const AVATAR_COLORS = ['#5865f2','#eb459e','#00b4d8','#57f287','#faa61a','#ed4245','#9b59b6','#e67e22'];
const avatarBg = (name) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];

const ActionBtn = ({ icon: Icon, label, onClick, danger, accent, disabled }) => (
  <button
    title={label}
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      color: danger ? '#ef4444' : accent ? 'var(--accent)' : 'var(--text-muted)',
      padding: '7px', borderRadius: 8, display: 'flex', alignItems: 'center',
      transition: 'background 0.13s, color 0.13s', opacity: disabled ? 0.4 : 1,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'var(--bg-hover)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
  >
    <Icon size={16} strokeWidth={1.8} />
  </button>
);

const FriendsList = ({
  friends, friendFilterText,
  onOpenCreateGroup, onMessage,
  onUpdateNickname, onBlock, onUnfriend,
}) => {
  const navigate = useNavigate();
  const { isUserOnline, getPresenceStatus } = usePresence();
  const { t } = useLanguage();

  const filtered = filterFriends(friends, friendFilterText);
  const { grouped, sortedKeys } = groupFriendsAlphabetically(filtered);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>
            {t('friends.count_title', { count: friends.length })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            {friends.filter(f => isUserOnline(f.friendId)).length} đang online
          </div>
        </div>
        <button
          onClick={onOpenCreateGroup}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,var(--accent),var(--accent-hover))',
            color: '#fff', fontWeight: 600, fontSize: 13,
            boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.3)',
          }}
        >
          <Users size={15} strokeWidth={2} />
          {t('friends.create_group_btn')}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 16px' }}>
        {sortedKeys.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Users size={40} style={{ opacity: 0.25, display: 'block', margin: '0 auto 12px' }} strokeWidth={1.2} />
            <div style={{ fontSize: 14 }}>{t('friends.no_results')}</div>
          </div>
        )}

        {sortedKeys.map(letter => (
          <div key={letter} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4,
            }}>
              {letter}
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 12, border: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              {grouped[letter].map((f, idx) => {
                const isOnline = isUserOnline(f.friendId);
                const presKey = isOnline ? (getPresenceStatus(f.friendId) || 'online') : 'offline';
                const dotColor = STATUS_DOT[presKey] || STATUS_DOT.offline;

                return (
                  <div
                    key={f.friendshipId}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: idx !== grouped[letter].length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Avatar */}
                    <div
                      style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/user/${f.friendId}`)}
                    >
                      {f.avatar ? (
                        <img src={f.avatar} alt={f.displayName}
                          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%',
                          background: f.usernameColor || avatarBg(f.displayName),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 16,
                        }}>
                          {(f.displayName?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <span style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 10, height: 10, borderRadius: '50%',
                        background: dotColor, border: '2px solid var(--bg-secondary)',
                      }} />
                    </div>

                    {/* Name + status */}
                    <div
                      style={{ flex: 1, minWidth: 0, marginLeft: 12, cursor: 'pointer' }}
                      onClick={() => navigate(`/user/${f.friendId}`)}
                    >
                      <div style={{
                        fontWeight: 600, fontSize: 14,
                        color: f.usernameColor || 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.displayName}
                      </div>
                      {f.originalName && f.originalName !== f.displayName && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.originalName}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: dotColor, marginTop: 1 }}>
                        {t(`chat.status.${presKey}`)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <ActionBtn icon={MessageCircle} label={t('friends.message_btn')} accent onClick={e => { e.stopPropagation(); onMessage(f); }} />
                      <ActionBtn icon={Edit3}         label={t('friends.nickname_btn')}  onClick={e => { e.stopPropagation(); onUpdateNickname(f.friendId); }} />
                      <ActionBtn icon={f.iBlocked ? ShieldCheck : ShieldAlert}
                        label={f.iBlocked ? t('friends.unblock_btn') : t('friends.block_btn')}
                        onClick={e => { e.stopPropagation(); onBlock(f.friendId, f.iBlocked); }}
                      />
                      <ActionBtn icon={UserMinus} label={t('friends.delete_btn')} danger onClick={e => { e.stopPropagation(); onUnfriend(f.friendId); }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;