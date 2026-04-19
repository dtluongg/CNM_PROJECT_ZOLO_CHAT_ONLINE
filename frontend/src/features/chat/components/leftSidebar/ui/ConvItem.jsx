import React, { useState } from 'react';
import { Hash, BellOff } from 'lucide-react';
import Avatar from './Avatar';
import { usePresence } from '../../../../../context/PresenceContext';

const ConvItem = ({ conv, active, collapsed, isMobile, onClick }) => {
  const { isUserOnline, getPresenceStatus } = usePresence();
  const [hovered, setHovered] = useState(false);
  console.log("Check Mute:", conv.name, conv.isMuted);
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
        gap: isMobile ? 14 : 10,
        padding: collapsed ? '8px' : isMobile ? '12px 16px' : '7px 10px',
        minHeight: itemHeight,
        borderRadius: isMobile ? 0 : 8,
        cursor: 'pointer',
        position: 'relative',
        background: active
          ? (isMobile ? 'var(--bg-hover)' : 'var(--accent)')
          : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s',
        justifyContent: collapsed ? 'center' : 'flex-start',
        margin: isMobile ? 0 : '1px 6px',
        borderLeft: isMobile && active
          ? '3px solid var(--accent)'
          : isMobile ? '3px solid transparent' : 'none',
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
              fontWeight: 600,
              fontSize: isMobile ? 15 : 14,
              color: active && !isMobile ? '#fff' : (conv.usernameColor || 'var(--text-primary)'),
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
              color: active && !isMobile ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
              flexShrink: 0,
              marginLeft: 6,
            }}>
              {conv.time}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 13,
              color: active && !isMobile ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {conv.lastMessage}
            </span>

            {conv.unread > 0 && (
              <span style={{
                background: active && !isMobile ? 'rgba(255,255,255,0.25)' : '#ed4245',
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