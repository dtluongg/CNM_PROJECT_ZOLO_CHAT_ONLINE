/**
 * CallHistoryTab – tab lịch sử cuộc gọi trong RightSidebar
 * Lọc theo otherUserId để chỉ hiển thị cuộc gọi với người dùng đang chat.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Phone, Video, PhoneIncoming, PhoneMissed, PhoneOff, RefreshCw } from 'lucide-react';
import callApi from '../api/callApi';
import { useAuth } from '../../../context/AuthContext';
import { useCall } from '../CallContext';

const STATUS_CONFIG = {
  ended:    { label: 'Đã kết thúc',  color: '#b5bac1' },
  missed:   { label: 'Nhỡ',          color: '#ed4245' },
  rejected: { label: 'Từ chối',      color: '#ed4245' },
  ongoing:  { label: 'Đang gọi',     color: '#3ba55c' },
  calling:  { label: 'Đang đổ chuông', color: '#faa61a' },
  busy:     { label: 'Máy bận',      color: '#faa61a' },
};

const formatDur = (secs) => {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7)  return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

function CallIcon({ type, status, isOutgoing }) {
  const color = STATUS_CONFIG[status]?.color || '#b5bac1';
  if (status === 'missed' || status === 'rejected') return <PhoneMissed size={16} color={color} />;
  if (!isOutgoing) return <PhoneIncoming size={16} color={color} />;
  if (type === 'video') return <Video size={16} color={color} />;
  return <Phone size={16} color={color} />;
}

export default function CallHistoryTab({ otherUserId, otherUserName, otherUserAvatar }) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const currentUserId = user?._id?.toString();

  const fetchCalls = useCallback(async (p = 1) => {
    if (!otherUserId) return;
    setLoading(true);
    try {
      const res = await callApi.getHistory({ page: p, limit: 20 });
      const all = res.data?.calls || [];
      // Lọc cuộc gọi với người dùng này
      const filtered = all.filter((c) => {
        const cId = c.caller._id.toString();
        const eId = c.callee._id.toString();
        return (
          (cId === currentUserId && eId === otherUserId) ||
          (eId === currentUserId && cId === otherUserId)
        );
      });
      setCalls((prev) => p === 1 ? filtered : [...prev, ...filtered]);
      setHasMore(res.data?.pagination?.page < res.data?.pagination?.totalPages);
      setPage(p);
    } catch (err) {
      console.error('fetchCalls error:', err);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, currentUserId]);

  useEffect(() => { fetchCalls(1); }, [fetchCalls]);

  const handleCallBack = (type) => {
    initiateCall({ _id: otherUserId, displayName: otherUserName, avatar: otherUserAvatar }, type);
  };

  if (loading && calls.length === 0) {
    return (
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <RefreshCw size={20} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đang tải...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <PhoneOff size={32} color="var(--text-muted)" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          Chưa có cuộc gọi nào với người này
        </span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => handleCallBack('audio')} style={{
            background: '#3ba55c', border: 'none', borderRadius: 8,
            padding: '7px 14px', color: '#fff', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Phone size={13} /> Gọi thoại
          </button>
          <button onClick={() => handleCallBack('video')} style={{
            background: 'var(--accent)', border: 'none', borderRadius: 8,
            padding: '7px 14px', color: '#fff', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Video size={13} /> Gọi video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Nút gọi nhanh */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => handleCallBack('audio')} style={{
          flex: 1, background: '#3ba55c20', border: '1px solid #3ba55c40',
          borderRadius: 8, padding: '7px 10px', color: '#3ba55c',
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Phone size={13} /> Gọi thoại
        </button>
        <button onClick={() => handleCallBack('video')} style={{
          flex: 1, background: 'var(--accent)20', border: '1px solid var(--accent)40',
          borderRadius: 8, padding: '7px 10px', color: 'var(--accent)',
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Video size={13} /> Gọi video
        </button>
      </div>

      {/* Danh sách */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {calls.map((c) => {
          const cfg     = STATUS_CONFIG[c.status] || STATUS_CONFIG.ended;
          const isOut   = c.isOutgoing;
          const typeIcon = c.type === 'video' ? <Video size={12} /> : <Phone size={12} />;
          return (
            <div key={c._id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--bg-tertiary)',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onClick={() => handleCallBack(c.type)}
              title="Gọi lại"
            >
              <div style={{ color: cfg.color, flexShrink: 0 }}>
                <CallIcon type={c.type} status={c.status} isOutgoing={isOut} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {isOut ? 'Gọi đi' : 'Gọi đến'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
                    {typeIcon}
                    {c.type === 'video' ? 'video' : 'thoại'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: cfg.color }}>
                  {cfg.label}{c.duration ? ` · ${formatDur(c.duration)}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {formatTime(c.createdAt)}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button onClick={() => fetchCalls(page + 1)} disabled={loading} style={{
          width: '100%', marginTop: 8, background: 'none', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 0', color: 'var(--text-muted)', fontSize: 12,
          cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? 'Đang tải...' : 'Tải thêm'}
        </button>
      )}
    </div>
  );
}
