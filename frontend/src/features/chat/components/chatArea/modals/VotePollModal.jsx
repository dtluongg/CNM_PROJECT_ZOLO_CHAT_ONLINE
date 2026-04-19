import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check } from 'lucide-react';

export default function VotePollModal({ isOpen, onClose, topic, options, multipleChoice, onVote, userVotes }) {
  const [selected, setSelected] = useState(new Set());
  const [newOptions, setNewOptions] = useState([]);
  const [selectedNew, setSelectedNew] = useState(new Set());
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(userVotes || []));
      setNewOptions([]);
      setSelectedNew(new Set());
      setInputValue('');
    }
  }, [isOpen, userVotes]);

  if (!isOpen) return null;

  const handleToggleOption = (optionId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        if (!multipleChoice) {
          next.clear();
          setSelectedNew(new Set());
        }
        next.add(optionId);
      }
      return next;
    });
  };

  const handleToggleNewOption = (optText) => {
    setSelectedNew(prev => {
      const next = new Set(prev);
      if (next.has(optText)) {
        next.delete(optText);
      } else {
        if (!multipleChoice) {
          next.clear();
          setSelected(new Set());
        }
        next.add(optText);
      }
      return next;
    });
  };

  const handleAddNewOption = () => {
    const val = inputValue.trim();
    if (val) {
      // Nếu text đã tồn tại trong danh sách chính thức
      const existing = options.find(o => o.text.toLowerCase() === val.toLowerCase());
      if (existing) {
        handleToggleOption(existing.id);
        setInputValue('');
        return;
      }

      // Nếu text đã tồn tại trong danh sách tạm (mới thêm)
      if (newOptions.includes(val)) {
        setInputValue('');
        return;
      }

      setNewOptions([...newOptions, val]);
      // Tự động chọn phương án mới vừa thêm (vẫn có thể bỏ chọn sau đó)
      if (!multipleChoice) {
        setSelected(new Set());
        setSelectedNew(new Set([val]));
      } else {
        setSelectedNew(prev => new Set([...prev, val]));
      }
      setInputValue('');
    }
  };

  const handleConfirm = () => {
    onVote({
      optionIds: Array.from(selected),
      newOptions: newOptions,
      votedNewOptions: Array.from(selectedNew)
    });
    onClose();
  };

  const modalContent = (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        backdropFilter: 'blur(12px)', animation: 'fadeIn 0.25s ease',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-secondary)', width: '100%', maxWidth: '440px',
          borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', maxHeight: '85vh',
          animation: 'modalOpen 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>Bình chọn</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', 
            color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.03)'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <div style={{ marginBottom: '24px' }}>
             <h4 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{topic}</h4>
             <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, opacity: 0.8 }}>
               {multipleChoice ? 'Chọn nhiều phương án' : 'Chọn 1 phương án'}
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((opt) => {
              const isSelected = selected.has(opt.id);
              return (
                <div 
                  key={opt.id} 
                  onClick={() => handleToggleOption(opt.id)}
                  style={{
                    padding: '12px 16px', borderRadius: '14px',
                    backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--bg-tertiary)',
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: multipleChoice ? '4px' : '50%',
                    border: `1.8px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    transition: 'all 0.15s'
                  }}>
                    {isSelected && <Check size={13} color="#fff" strokeWidth={4} />}
                  </div>
                  <span style={{ 
                    fontSize: '14.5px', 
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
                  }}>{opt.text}</span>
                </div>
              );
            })}

            {newOptions.map((optText, i) => {
               const isSelected = selectedNew.has(optText);
               return (
                <div 
                    key={`new-${i}`}
                    onClick={() => handleToggleNewOption(optText)}
                    style={{
                      padding: '12px 16px', borderRadius: '14px',
                      backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.06)' : 'var(--bg-tertiary)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: multipleChoice ? '4px' : '50%',
                      border: `1.8px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      transition: 'all 0.15s'
                    }}>
                      {isSelected && <Check size={13} color="#fff" strokeWidth={4} />}
                    </div>
                    <span style={{ 
                      fontSize: '14.5px', 
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
                    }}>{optText}</span>
                    <div style={{ flex: 1 }} />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewOptions(newOptions.filter((_, idx) => idx !== i));
                        setSelectedNew(prev => {
                          const next = new Set(prev);
                          next.delete(optText);
                          return next;
                        });
                      }}
                      style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
               );
            })}
          </div>

          {/* Add Option Input */}
          <div style={{ marginTop: '20px', position: 'relative' }}>
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Thêm lựa chọn..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewOption()}
              style={{
                width: '100%', padding: '12px 48px 12px 16px', borderRadius: '14px',
                backgroundColor: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text-primary)', outline: 'none', fontSize: '14px'
              }}
            />
            <button 
              onClick={handleAddNewOption}
              style={{
                position: 'absolute', right: '6px', top: '6px',
                width: '32px', height: '32px', borderRadius: '10px',
                backgroundColor: 'rgba(var(--accent-rgb), 0.1)', border: 'none',
                color: 'var(--accent)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', gap: '12px'
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '13px', borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)', border: 'none',
            color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '14px'
          }}>Hủy</button>
          <button 
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              backgroundColor: 'var(--accent)', border: 'none',
              color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
              boxShadow: '0 8px 16px -4px rgba(var(--accent-rgb), 0.3)'
            }}
          >Xác nhận</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalOpen { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
