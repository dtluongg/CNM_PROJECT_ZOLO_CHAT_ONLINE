/**
 * CallNotification – toast nhỏ xuất hiện khi có thông báo cuộc gọi
 * (ví dụ: người dùng offline, lỗi kết nối...)
 */
import React, { useEffect, useState } from 'react';
import { PhoneOff, WifiOff, Info } from 'lucide-react';
import { useCall } from '../CallContext';

const ICONS = {
  warning: <WifiOff size={16} />,
  error:   <PhoneOff size={16} />,
  info:    <Info size={16} />,
};
const COLORS = {
  warning: { bg: '#faa61a20', border: '#faa61a60', icon: '#faa61a' },
  error:   { bg: '#ed424520', border: '#ed424560', icon: '#ed4245' },
  info:    { bg: '#5865f220', border: '#5865f260', icon: '#5865f2' },
};

export default function CallNotification() {
  const { notification } = useCall();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (notification) {
      setCurrent(notification);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [notification]);

  if (!current) return null;

  const type   = current.type || 'error';
  const color  = COLORS[type] || COLORS.error;
  const icon   = ICONS[type]  || ICONS.error;

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '-80px'})`,
      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex: 99999,
      background: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: 12,
      padding: '10px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(12px)',
      maxWidth: 360, minWidth: 220,
      pointerEvents: 'none',
    }}>
      <span style={{ color: color.icon, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#f2f3f5', fontSize: 13, fontWeight: 500 }}>
        {current.message}
      </span>
    </div>
  );
}
