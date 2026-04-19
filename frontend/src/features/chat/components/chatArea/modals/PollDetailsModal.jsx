import React from 'react';
import { X, ChevronLeft, BarChart2 } from 'lucide-react';

export default function PollDetailsModal({ isOpen, onClose, topic, options, THEME }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', width: '100%', maxWidth: '500px',
        maxHeight: '80vh', borderRadius: '24px', position: 'relative',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: '15px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Chi tiết bình chọn
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)', width: '32px', height: '32px',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Topic Info */}
        <div style={{ padding: '20px 24px', backgroundColor: 'rgba(var(--accent-rgb), 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <BarChart2 size={16} color="var(--accent)" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Chủ đề</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{topic}</div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }} className="custom-scrollbar">
          {options.map((opt) => (
            <div key={opt.id} style={{ marginBottom: '20px' }}>
              {/* Option Title */}
              <div style={{
                padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px',
                backgroundColor: 'rgba(255,255,255,0.02)', borderY: '1px solid rgba(255,255,255,0.03)'
              }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                  {opt.text}
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 800, color: 'var(--accent)',
                  backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                  padding: '2px 8px', borderRadius: '10px'
                }}>
                  {opt.voterIds?.length || 0}
                </span>
              </div>

              {/* Voter List */}
              <div style={{ padding: '0 24px' }}>
                {opt.voterIds?.length > 0 ? (
                  opt.voterIds.map((voter) => (
                    <div key={voter._id || voter.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.02)'
                    }}>
                      {voter.avatar ? (
                        <img src={voter.avatar} alt={voter.displayName} style={{
                          width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover',
                          border: '2px solid rgba(255,255,255,0.1)'
                        }} />
                      ) : (
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          backgroundColor: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#fff',
                          fontSize: '16px', fontWeight: 800, border: '2px solid rgba(255,255,255,0.1)'
                        }}>
                          {voter.displayName?.charAt(0)}
                        </div>
                      )}
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {voter.displayName}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Chưa có ai bình chọn phương án này
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
      `}</style>
    </div>
  );
}
