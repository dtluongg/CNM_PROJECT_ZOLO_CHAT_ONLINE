import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { getInitials, STATUS_CONFIG } from '../utils/avatarUtils';
import { useLanguage } from '../../../../../context/LanguageContext';

const AvatarDisplay = ({
  conversation,
  accentColor,
  isOnline,
  presStatus,
  getLastSeen,
  formatLastSeen,
}) => {
  const { t } = useLanguage();
  const statusConfig = presStatus ? STATUS_CONFIG[presStatus] || STATUS_CONFIG.online : null;
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [conversation.avatar]);

  // Localize status label if it matches our config
  const localizedStatusLabel = statusConfig 
    ? (statusConfig.label === 'Trực tuyến' ? t('presence.online') 
      : statusConfig.label === 'Vắng mặt' ? t('presence.away') 
      : statusConfig.label === 'Đừng làm phiền' ? t('presence.dnd')
      : statusConfig.label === 'Ẩn' ? t('presence.invisible')
      : statusConfig.label)
    : t('presence.offline');

  return (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, overflow: 'hidden', margin: 12 }}>
      <div
        style={{
          height: 72,
          background: conversation.banner
            ? `url(${conversation.banner}) center/cover no-repeat`
            : `linear-gradient(135deg, ${accentColor}cc, ${accentColor}55)`,
        }}
      />

      <div style={{ padding: '0 14px 14px', marginTop: -28 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {conversation.avatar && !imgError ? (
            <img
              src={conversation.avatar}
              alt={conversation.name}
              onError={() => setImgError(true)}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '4px solid var(--bg-tertiary)',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: accentColor,
              border: '4px solid var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 20,
            }}>
              {getInitials(conversation.name)}
            </div>
          )}

          {conversation.type === 'dm' && (
            <span style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: statusConfig ? statusConfig.dot : '#80848e',
              border: '2px solid var(--bg-tertiary)',
            }} />
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{
            fontWeight: 800,
            fontSize: 16,
            color: conversation.usernameColor || 'var(--text-primary)',
            lineHeight: 1.2,
          }}>
            {conversation.name}
          </div>

          {conversation.type === 'dm' ? (
            <div style={{ marginTop: 3 }}>
              <div style={{
                fontSize: 12,
                color: statusConfig ? statusConfig.color : 'var(--text-muted)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusConfig ? statusConfig.dot : '#80848e',
                  display: 'inline-block',
                }} />
                {localizedStatusLabel}
              </div>

              {!isOnline && conversation?.otherUserId && (() => {
                const ls = getLastSeen(conversation.otherUserId);
                return ls ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {t('user_profile.active_at', { time: formatLastSeen(ls) })}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageCircle size={12} style={{ opacity: 0.7 }} />
              {t('chat.members_count_val', { count: conversation.memberCount || conversation.members || 0 })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarDisplay;