import React, { useState } from 'react';
import { usePresence } from '../../context/PresenceContext';
import { X, Image, FileText, MessageCircle, BellOff, Ban, LogOut, Download, Phone, Video } from 'lucide-react';

const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287',
  '#fee75c', '#ed4245', '#9b59b6', '#e67e22',
];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Config trạng thái
const STATUS_CONFIG = {
  online:    { color: '#3ba55c', label: 'Đang hoạt động', dot: '#3ba55c' },
  idle:      { color: '#faa61a', label: 'Vắng mặt',       dot: '#faa61a' },
  dnd:       { color: '#ed4245', label: 'Không làm phiền', dot: '#ed4245' },
  invisible: { color: '#80848e', label: 'Ẩn',              dot: '#80848e' },
};

// Mock shared media (placeholder)
const MOCK_MEDIA = [
  { id: 1, color: '#5865f2' },
  { id: 2, color: '#eb459e' },
  { id: 3, color: '#00b4d8' },
  { id: 4, color: '#57f287' },
  { id: 5, color: '#faa61a' },
  { id: 6, color: '#ed4245' },
];

const SectionHeader = ({ title }) => (
  <div style={{
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 8,
    marginTop: 4,
  }}>
    {title}
  </div>
);

const ActionButton = ({ icon, label, variant = 'default', onClick }) => {
  const [hovered, setHovered] = useState(false);
  const bg =
    variant === 'primary'
      ? hovered ? 'var(--accent-hover)' : 'var(--accent)'
      : variant === 'danger'
      ? hovered ? '#c0282b' : '#ed424520'
      : hovered ? 'var(--bg-hover)' : 'var(--bg-primary)';

  const color =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
      ? '#ed4245'
      : 'var(--text-secondary)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        color,
        border: 'none',
        borderRadius: 8,
        padding: '9px 12px',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'left',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export default function RightSidebar({ conversation, onClose, onViewProfile }) {
  const [tab, setTab] = useState('info');
  const { isUserOnline, getPresenceStatus } = usePresence();

  if (!conversation) return null;

  const accentColor = conversation.usernameColor || getAvatarColor(conversation.name);

  // Xác định trạng thái thực của user này
  // Nếu có otherUserId → dùng Supabase Presence thực
  // Nếu không → dùng mock data
  const isOnline = conversation.otherUserId
    ? isUserOnline(conversation.otherUserId)
    : (conversation.online ?? false);

  const presStatus = conversation.otherUserId
    ? (getPresenceStatus(conversation.otherUserId) || (isOnline ? 'online' : null))
    : (isOnline ? (conversation.status || 'online') : null);

  const statusConfig = presStatus ? STATUS_CONFIG[presStatus] || STATUS_CONFIG.online : null;

  return (
    <div style={{
      width: 260,
      minWidth: 260,
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px 0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          {conversation.type === 'dm' ? 'Thông tin người dùng' : 'Thông tin nhóm'}
        </span>
        <button
          onClick={onClose}
          title="Đóng"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '4px 6px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'none';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--bg-hover) transparent',
      }}>
        {/* Profile card */}
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 10,
          overflow: 'hidden',
          margin: 12,
        }}>
          {/* Banner - ảnh bìa thực hoặc gradient từ usernameColor */}
          <div style={{
            height: 72,
            background: conversation.banner
              ? `url(${conversation.banner}) center/cover no-repeat`
              : `linear-gradient(135deg, ${accentColor}cc, ${accentColor}55)`,
            flexShrink: 0,
          }} />

          {/* Avatar + name */}
          <div style={{ padding: '0 14px 14px', marginTop: -28 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {conversation.avatar ? (
                <img
                  src={conversation.avatar}
                  alt={conversation.name}
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
                  userSelect: 'none',
                }}>
                  {getInitials(conversation.name)}
                </div>
              )}
              {/* Status dot với màu đúng */}
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
              {/* Tên với usernameColor */}
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
                  {/* Status label */}
                  <div style={{
                    fontSize: 12,
                    color: statusConfig ? statusConfig.color : 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: statusConfig ? statusConfig.dot : '#80848e',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    {statusConfig ? statusConfig.label : 'Offline'}
                  </div>
                  {/* statusText nếu có */}
                  {conversation.statusText && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>
                      {conversation.statusText}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MessageCircle size={12} style={{ opacity: 0.7 }} />
                  {conversation.members || conversation.memberCount || 0} thành viên
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 2,
          margin: '0 12px 12px',
          background: 'var(--bg-primary)',
          borderRadius: 8,
          padding: 3,
        }}>
          {[
            { key: 'info', label: 'Thông tin' },
            { key: 'media', label: 'Media' },
            { key: 'files', label: 'File' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                background: tab === t.key ? 'var(--bg-secondary)' : 'none',
                border: 'none',
                cursor: 'pointer',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: tab === t.key ? 700 : 500,
                padding: '5px 4px',
                borderRadius: 6,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 12px 12px' }}>
          {/* Info tab */}
          {tab === 'info' && (
            <div>
              {/* Bio */}
              {conversation.type === 'dm' && (
                <div style={{ marginBottom: 16 }}>
                  <SectionHeader title="Giới thiệu" />
                  <p style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                    background: 'var(--bg-tertiary)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontStyle: conversation.bio ? 'normal' : 'italic',
                  }}>
                    {conversation.bio || 'Người dùng chưa thêm giới thiệu.'}
                  </p>
                </div>
              )}

              {/* Trạng thái chi tiết */}
              <div style={{ marginBottom: 16 }}>
                <SectionHeader title="Trạng thái" />
                <div style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}>
                  {conversation.type === 'dm' ? (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: statusConfig ? statusConfig.dot : '#80848e',
                          display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 13,
                          color: statusConfig ? statusConfig.color : 'var(--text-muted)',
                          fontWeight: 600,
                        }}>
                          {statusConfig ? statusConfig.label : 'Không hoạt động'}
                        </span>
                      </div>
                      {conversation.statusText && (
                        <div style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          marginTop: 6,
                          paddingLeft: 18,
                          fontStyle: 'italic',
                        }}>
                          {conversation.statusText}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MessageCircle size={14} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Nhóm · {conversation.members || conversation.memberCount || 0} thành viên
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionHeader title="Hành động" />
                <ActionButton icon={<MessageCircle size={15} />} label="Nhắn tin" variant="primary" onClick={() => {}} />
                {conversation.type === 'dm' && conversation.otherUserId && onViewProfile && (
                  <ActionButton icon={<span style={{ fontSize: 15 }}>👤</span>} label="Xem hồ sơ" onClick={() => onViewProfile(conversation.otherUserId)} />
                )}
                <ActionButton icon={<Phone size={15} />} label="Gọi điện" />
                <ActionButton icon={<BellOff size={15} />} label="Tắt thông báo" />
                {conversation.type === 'dm' && (
                  <ActionButton icon={<Ban size={15} />} label="Chặn người dùng" variant="danger" />
                )}
                {conversation.type === 'group' && (
                  <ActionButton icon={<LogOut size={15} />} label="Rời nhóm" variant="danger" />
                )}
              </div>
            </div>
          )}

          {/* Media tab */}
          {tab === 'media' && (
            <div>
              <SectionHeader title="Ảnh và video" />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
              }}>
                {MOCK_MEDIA.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 6,
                      background: item.color + '30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 20,
                      border: `1px solid ${item.color}40`,
                      transition: 'transform 0.15s, opacity 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.04)';
                      e.currentTarget.style.opacity = '0.85';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    <Image size={18} style={{ opacity: 0.6 }} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                6 ảnh đã chia sẻ
              </p>
            </div>
          )}

          {/* Files tab */}
          {tab === 'files' && (
            <div>
              <SectionHeader title="File đã chia sẻ" />
              {[
                { name: 'tài_liệu.pdf', size: '2.4 MB', icon: <FileText size={22} />, color: '#ed4245' },
                { name: 'bài_tập.docx', size: '845 KB', icon: <FileText size={22} />, color: '#5865f2' },
                { name: 'ảnh_nhóm.zip', size: '12.1 MB', icon: <FileText size={22} />, color: '#faa61a' },
              ].map((file, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    marginBottom: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ flexShrink: 0, color: file.color, display: 'flex', alignItems: 'center' }}>{file.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.size}</div>
                  </div>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    padding: 2,
                  }}>
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
