import React, { useState } from 'react';
import { X, Plus, BarChart2 } from 'lucide-react';

export default function CreatePollModal({ isOpen, onClose, onCreate }) {
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (!topic.trim() || validOptions.length < 2) {
      alert('Vui lòng nhập chủ đề và ít nhất 2 phương án.');
      return;
    }
    onCreate({ 
      topic: topic.trim(), 
      options: validOptions,
      multipleChoice 
    });
    setTopic('');
    setOptions(['', '']);
    setMultipleChoice(false);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      backdropFilter: 'blur(20px)', animation: 'fadeIn 0.3s ease'
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'rgba(var(--bg-secondary-rgb), 0.85)', width: '100%', maxWidth: '450px',
        borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        animation: 'modalOpen 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(var(--accent-rgb), 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <BarChart2 size={20} color="var(--accent)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Tạo bình chọn</h3>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', 
            color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 800,
              color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Chủ đề bình chọn</label>
            <input
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Nhập câu hỏi bình chọn..."
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text-primary)', outline: 'none', fontSize: '15px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 800,
              color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Các lựa chọn</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    placeholder={`Lựa chọn ${i + 1}`}
                    style={{
                      flex: 1, padding: '12px 16px', borderRadius: '12px',
                      backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                      color: 'var(--text-primary)', outline: 'none', fontSize: '14px',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(i)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444',
                      padding: '4px'
                    }}>
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                style={{
                  marginTop: '16px', width: '100%', padding: '12px',
                  borderRadius: '12px', border: '1px dashed rgba(var(--accent-rgb), 0.3)',
                  backgroundColor: 'rgba(var(--accent-rgb), 0.05)', color: 'var(--accent)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 700,
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={16} /> Thêm lựa chọn
              </button>
            )}
          </div>

          {/* Toggle Chọn nhiều */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Chọn nhiều phương án</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cho phép bình chọn nhiều lựa chọn</span>
            </div>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
              <input 
                type="checkbox" 
                checked={multipleChoice}
                onChange={(e) => setMultipleChoice(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: multipleChoice ? 'var(--accent)' : '#444', 
                transition: '0.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', height: '18px', width: '18px', left: multipleChoice ? '22px' : '3px', bottom: '3px',
                  backgroundColor: 'white', transition: '0.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', gap: '16px', marginTop: '32px'
          }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              backgroundColor: 'rgba(255,255,255,0.05)', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700,
              fontSize: '15px'
            }}>Hủy bỏ</button>
            <button type="submit" style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', border: 'none',
              color: '#fff', cursor: 'pointer', fontWeight: 700,
              fontSize: '15px', boxShadow: '0 8px 16px -4px rgba(var(--accent-rgb), 0.4)'
            }}>Tạo bình chọn</button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalOpen {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: Poll 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
