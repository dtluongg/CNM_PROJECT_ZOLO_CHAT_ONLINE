import React, { useState } from 'react';
import { Hash, BellOff } from 'lucide-react';
import Avatar from './Avatar';
import { usePresence } from '../../../../../context/PresenceContext';
import { useLanguage } from '../../../../../context/LanguageContext';
import { translateLastMessage } from '../../../../../utils/translationUtils';

const ConvItem = ({ conv, active, collapsed, isMobile, onClick }) => {
  const { t } = useLanguage();
  const { isUserOnline, getPresenceStatus } = usePresence();
  const [hovered, setHovered] = useState(false);
  const isOnline = conv.otherUserId
    ? isUserOnline(conv.otherUserId)
    : (conv.online ?? false);

  const presStatus = conv.otherUserId
    ? (getPresenceStatus(conv.otherUserId) || conv.status || 'online')
    : (conv.status || 'online');

  const itemHeight = isMobile ? 68 : 'auto';

  return (
    <div
      onClick={() => onClick(conv)}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onTouchStart={() => isMobile && setHovered(true)}
      onTouchEnd={() => isMobile && setHovered(false)}
      title={collapsed ? conv.name : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 13 : 11,
        padding: collapsed ? '8px' : isMobile ? '11px 16px' : '8px 11px',
        minHeight: itemHeight,
        borderRadius: isMobile ? 0 : 12,
        cursor: 'pointer',
        position: 'relative',
        background: active
          ? 'rgba(var(--accent-rgb),0.12)'
          : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.18s ease, transform 0.12s ease',
        transform: hovered && !active && !isMobile ? 'translateX(2px)' : 'none',
        justifyContent: collapsed ? 'center' : 'flex-start',
        margin: isMobile ? 0 : '2px 8px',
        borderLeft: active
          ? '3px solid var(--accent)'
          : isMobile ? '3px solid transparent' : '3px solid transparent',
        paddingLeft: collapsed ? '8px' : isMobile ? '16px' : '9px',
      }}
    >
      <Avatar
        name={conv.name}
        avatar={conv.avatar}
        size={isMobile ? 48 : 36}
        online={conv.type === 'dm' ? isOnline : null}
        status={presStatus}
      />

      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2
          }}>
            <span style={{
              fontWeight: active ? 700 : 600,
              fontSize: isMobile ? 15 : 14,
              color: active ? 'var(--accent)' : (conv.usernameColor || 'var(--text-primary)'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4, // Tăng gap lên một chút để icon không dính sát vào tên
            }}>
              {conv.type === 'group' && <Hash size={12} style={{ opacity: 0.6, flexShrink: 0 }} />}

              {/* Tên nhóm / Người dùng */}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {conv.name}
              </span>

              {/* --- THÊM ICON MUTE TẠI ĐÂY --- */}
              {conv.raw?.isMuted && (
                <BellOff size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
              )}
            </span>
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              flexShrink: 0,
              marginLeft: 6,
            }}>
              {conv.time}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
               {translateLastMessage(conv.lastMessage, t)}
            </span>

            {conv.unread > 0 && (
              <span style={{
                background: '#ed4245',
                color: '#fff',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                flexShrink: 0,
                marginLeft: 6,
                minWidth: 20,
                textAlign: 'center',
              }}>
                {conv.unread > 99 ? '99+' : conv.unread}
              </span>
            )}
          </div>
        </div>
      )}

      {collapsed && conv.unread > 0 && (
        <span style={{
          position: 'absolute',
          top: 2,
          right: 2,
          background: '#ed4245',
          color: '#fff',
          borderRadius: 10,
          fontSize: 9,
          fontWeight: 700,
          padding: '1px 4px',
          border: '2px solid var(--bg-secondary)',
          minWidth: 14,
          textAlign: 'center',
        }}>
          {conv.unread > 9 ? '9+' : conv.unread}
        </span>
      )}
    </div>
  );
};

export default ConvItem;