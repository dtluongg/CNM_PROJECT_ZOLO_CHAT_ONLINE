import React, { useState } from 'react';
import { Search, X, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../../../../utils/languages';

const LanguageSelectorModal = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)', width: '100%', maxWidth: 400,
        borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        animation: 'scaleUp 0.2s ease-out'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Chọn ngôn ngữ dịch</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0 12px'
          }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              type="text"
              placeholder="Tìm kiếm ngôn ngữ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', background: 'none', border: 'none', padding: '10px 8px',
                color: 'var(--text-primary)', outline: 'none', fontSize: 14
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ maxHeight: 350, overflowY: 'auto', padding: '0 8px 12px' }}>
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map(lang => (
              <div
                key={lang.code}
                onClick={() => { onSelect(lang.code); onClose(); }}
                style={{
                  padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.2s', color: 'var(--text-primary)', fontSize: 14
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>{lang.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                  {lang.code}
                </span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Không tìm thấy ngôn ngữ nào
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LanguageSelectorModal;
