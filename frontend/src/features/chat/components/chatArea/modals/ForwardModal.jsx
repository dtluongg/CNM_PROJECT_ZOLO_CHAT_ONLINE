import React, { useEffect, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import Avatar from '../ui/Avatar';
import messageApi from '../../../api/messageApi';
import conversationApi from '../../../api/conversationApi';
import { useLanguage } from '../../../../../context/LanguageContext';

const ForwardModal = ({ isOpen, onClose, msg, onForward }) => {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch]               = useState('');
  const [selectedIds, setSelectedIds]     = useState([]);
  const [loading, setLoading]             = useState(false);
  const [sending, setSending]             = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      conversationApi.listMyConversations()
        .then(res => setConversations(res.data.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setSearch('');
      setSelectedIds([]);
      setSending(false);
    }
  }, [isOpen]);

  const filtered = conversations.filter(c => {
    const name = c.type === 'dm' ? c.otherUser?.displayName : c.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      for (const convId of selectedIds) {
        await messageApi.forwardMessage(convId, msg._id || msg.id);
      }
      onForward();
      onClose();
    } catch (err) {
      console.error('Forward error:', err);
      alert(t('forward_modal.error'));
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
        maxHeight: '80vh', animation: 'modalIn 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{t('forward_modal.title')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            position: 'relative', background: '#f3f4f6', borderRadius: 10,
            display: 'flex', alignItems: 'center', padding: '0 12px',
          }}>
            <Search size={18} color="#888" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('forward_modal.search_placeholder')}
              style={{ flex: 1, border: 'none', background: 'none', padding: '10px 8px', outline: 'none', fontSize: 14 }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t('forward_modal.loading')}</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t('forward_modal.no_results')}</div>
          ) : filtered.map(c => {
            const id   = c.id || c._id;
            const name = c.type === 'dm' ? c.otherUser?.displayName : c.name;
            const av   = c.type === 'dm' ? c.otherUser?.avatar : c.avatar;
            const sel  = selectedIds.includes(id);
            return (
              <div
                key={id}
                onClick={() => toggleSelect(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s',
                  background: sel ? '#f0f7ff' : 'transparent',
                }}
                onMouseEnter={e => !sel && (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => !sel && (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar name={name} avatar={av} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {c.type === 'dm' ? t('forward_modal.dm_label') : t('forward_modal.members_count', { count: c.totalMembers })}
                  </div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, border: '2px solid',
                  borderColor: sel ? 'var(--accent)' : '#ccc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: sel ? 'var(--accent)' : 'transparent', transition: 'all 0.2s',
                }}>
                  {sel && <Check size={14} color="#fff" strokeWidth={4} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: 20, borderTop: '1px solid #eee' }}>
          <button
            disabled={selectedIds.length === 0 || sending}
            onClick={handleSend}
            style={{
              width: '100%',
              background: selectedIds.length > 0 ? 'var(--accent)' : '#ccc',
              color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
              fontWeight: 700, cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {sending ? t('forward_modal.sending') : (selectedIds.length > 0 ? t('forward_modal.forward_btn_count', { count: selectedIds.length }) : t('forward_modal.forward_btn'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;