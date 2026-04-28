import React, { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const GROUP_TYPES = [
  { value: 'general', label: 'create_group.types.general' },
  { value: 'study',   label: 'create_group.types.study' },
  { value: 'gaming',  label: 'create_group.types.gaming' },
  { value: 'project', label: 'create_group.types.project' },
  { value: 'other',   label: 'create_group.types.other' },
  { value: 'sensitive', label: 'create_group.types.sensitive' },
];

const INVITE_MODE_BY_GROUP = {
  general: 'open_invite',
  gaming: 'open_invite',
  study: 'approval_required',
  project: 'approval_required',
  other: 'approval_required',
  sensitive: 'admin_only',
};

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

const CreateGroupModal = ({
  groupName,
  setGroupName,
  groupType,
  setGroupType,
  groupDescription,
  setGroupDescription,
  groupAvatarPreview,
  onAvatarFileChange,
  selectedFriendIds = [],
  friendsForGroup = [],
  loadingFriends,
  creatingGroup,
  onToggleSelectFriend,
  onCreateGroup,
  onClose,
}) => {
  const { t } = useLanguage();
  const avatarInputRef = useRef(null);
  const isMobile = useIsMobile();
  const inviteMode = INVITE_MODE_BY_GROUP[groupType] || 'open_invite';

  const selectedFriends = friendsForGroup.filter(f => selectedFriendIds.includes(f.friendId));

  const containerStyle = isMobile
    ? {
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'var(--bg-secondary)',
        display: 'flex', flexDirection: 'column',
      }
    : {
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      };

  const panelStyle = isMobile
    ? {
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)', overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }
    : {
        width: '100%', maxWidth: 540, maxHeight: '88vh',
        overflow: 'hidden', borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex', flexDirection: 'column',
      };

  return (
    <div
      style={containerStyle}
      onClick={(e) => { if (!isMobile && e.target === e.currentTarget && !creatingGroup) onClose(); }}
    >
      <div style={panelStyle}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '14px 16px 10px' : '16px 18px 8px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: isMobile ? 20 : 18 }}>
              {t('create_group.title')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
              {t('create_group.subtitle')}
            </div>
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              disabled={creatingGroup}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, display: 'flex', borderRadius: 8 }}
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '14px 16px' : 16, display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 12, overflowY: 'auto', flex: 1 }}>

          {/* Avatar + Group name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              onClick={() => !creatingGroup && avatarInputRef.current?.click()}
              style={{
                width: isMobile ? 72 : 64, height: isMobile ? 72 : 64,
                borderRadius: '50%', flexShrink: 0,
                background: groupAvatarPreview ? 'transparent' : 'var(--bg-hover)',
                border: '2px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
              }}
              title={t('create_group.avatar_title')}
            >
              {groupAvatarPreview ? (
                <img src={groupAvatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={isMobile ? 26 : 22} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={onAvatarFileChange}
            />

            <input
              type="text"
              placeholder={t('create_group.group_name_placeholder')}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                flex: 1, border: '1px solid var(--border)',
                borderRadius: 10, background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                padding: isMobile ? '12px 14px' : '10px 12px',
                outline: 'none', fontSize: isMobile ? 16 : 14,
              }}
            />
          </div>

          {/* Group type */}
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('create_group.group_type')}</div>
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: 10,
                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                padding: isMobile ? '12px 14px' : '9px 12px',
                outline: 'none', fontSize: isMobile ? 16 : 14, cursor: 'pointer',
              }}
            >
              {GROUP_TYPES.map((t_item) => (
                <option key={t_item.value} value={t_item.value}>{t(t_item.label)}</option>
              ))}
            </select>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 5 }}>
              {t(`create_group.invite_labels.${inviteMode}`)}
            </div>
          </div>

          {/* Description */}
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {t('create_group.description')} <span style={{ fontWeight: 400 }}>({t('create_group.optional')})</span>
            </div>
            <textarea
              placeholder={t('create_group.desc_placeholder')}
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={200}
              rows={2}
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: 10,
                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                padding: isMobile ? '12px 14px' : '9px 12px',
                outline: 'none', fontSize: isMobile ? 15 : 13,
                resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
              {groupDescription.length}/200
            </div>
          </div>

          {/* Selected chips */}
          {selectedFriends.length > 0 && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                {t('create_group.selected_label', { count: selectedFriends.length })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedFriends.map(f => (
                  <div key={f.friendId} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'var(--accent)', color: '#fff',
                    borderRadius: 999, padding: isMobile ? '6px 10px 6px 10px' : '4px 8px 4px 8px',
                    fontSize: isMobile ? 14 : 12, fontWeight: 600,
                  }}>
                    {f.displayName}
                    <button
                      onClick={() => onToggleSelectFriend(f.friendId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 0, display: 'flex', lineHeight: 1 }}
                    >
                      <X size={isMobile ? 14 : 12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friend list */}
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {t('create_group.add_members')}
            </div>
            <div style={{
              maxHeight: isMobile ? 260 : 220, overflowY: 'auto',
              border: '1px solid var(--border)', borderRadius: 10,
              padding: isMobile ? '6px 4px' : 8, background: 'var(--bg-primary)',
            }}>
              {loadingFriends && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>{t('create_group.loading_friends')}</div>
              )}

              {!loadingFriends && friendsForGroup.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>{t('create_group.no_friends')}</div>
              )}

              {!loadingFriends && friendsForGroup.map((f) => {
                const checked = selectedFriendIds.includes(f.friendId);
                return (
                  <div
                    key={f.friendshipId}
                    onClick={() => onToggleSelectFriend(f.friendId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: isMobile ? '12px 12px' : '9px 10px',
                      borderRadius: 8, cursor: 'pointer',
                      background: checked ? 'rgba(var(--accent-rgb, 88,101,242),0.12)' : 'transparent',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{
                      width: isMobile ? 22 : 18, height: isMobile ? 22 : 18,
                      borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      background: checked ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: isMobile ? 15 : 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.displayName}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.email}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '12px 16px' : 14,
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          flexShrink: 0,
        }}>
          {!isMobile && (
            <button
              onClick={onClose}
              disabled={creatingGroup}
              style={{
                border: 'none', borderRadius: 8, cursor: 'pointer',
                padding: '9px 14px', background: 'var(--bg-hover)',
                color: 'var(--text-primary)', fontWeight: 600,
              }}
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            onClick={onCreateGroup}
            disabled={creatingGroup || !groupName.trim() || selectedFriendIds.length < 2}
            style={{
              border: 'none', borderRadius: 8, cursor: 'pointer',
              padding: isMobile ? '13px 0' : '9px 14px',
              width: isMobile ? '100%' : 'auto',
              background: 'var(--accent)',
              color: '#fff', fontWeight: 700, fontSize: isMobile ? 16 : 14,
              opacity: (creatingGroup || !groupName.trim() || selectedFriendIds.length < 2) ? 0.6 : 1,
            }}
          >
            {creatingGroup ? t('create_group.creating') : (selectedFriendIds.length > 0 ? t('create_group.create_btn_with_count', { count: selectedFriendIds.length }) : t('create_group.create_btn'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
