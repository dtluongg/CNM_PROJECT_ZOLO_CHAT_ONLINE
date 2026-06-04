import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const TYPE_CFG = {
  success: { color: '#3ba55c', Icon: CheckCircle },
  error:   { color: '#ed4245', Icon: XCircle },
  info:    { color: '#5865f2', Icon: Info },
  warning: { color: '#faa61a', Icon: AlertTriangle },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        left: '50%', transform: 'translateX(-50%)', zIndex: 4000,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
        width: 'max-content', maxWidth: '92vw',
      }}>
        {toasts.map(({ id, message, type }) => {
          const cfg = TYPE_CFG[type] || TYPE_CFG.info;
          const Icon = cfg.Icon;
          return (
            <div key={id} style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${cfg.color}`,
              borderRadius: 12, padding: '11px 14px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
              animation: 'toastIn 0.22s cubic-bezier(0.2,0.9,0.3,1)',
              minWidth: 240,
            }}>
              <Icon size={18} style={{ color: cfg.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{message}</span>
              <button onClick={() => dismiss(id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', padding: 2, flexShrink: 0,
              }}><X size={15} /></button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastContext.Provider>
  );
}