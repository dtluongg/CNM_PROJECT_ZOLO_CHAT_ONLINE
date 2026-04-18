import React, { useState } from 'react';
import { ChevronRight, BarChart2, Check } from 'lucide-react';
import PollDetailsModal from './PollDetailsModal';
import VotePollModal from '../modals/VotePollModal';

export default function PollMessage({ message, onVote, currentUserId, isPinned }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  
  const payload = message.payload || {};
  const { topic, options = [], multipleChoice = false, isClosed = false } = payload;

  const totalVoters = new Set(
    (options || []).flatMap(opt => opt.voterIds?.map(v => (v?._id || v || '').toString()) || [])
  ).size;

  const totalVotes = (options || []).reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);

  const userVotes = (options || []).filter(opt => 
    opt.voterIds?.some(v => (v?._id || v || '').toString() === (currentUserId || '').toString())
  ).map(opt => opt.id);

  const userVoted = userVotes.length > 0;

  if (!topic || !options) return null;

  return (
    <div style={{
      padding: '16px 18px', 
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '20px', 
      border: '1px solid var(--border)',
      maxWidth: '500px', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      color: 'var(--text-primary)',
      margin: '4px 0',
    }}>
      {/* Pinned Label */}
      {isPinned && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 6, 
          marginBottom: 8, paddingBottom: 6, 
          borderBottom: '1px solid var(--border)',
          opacity: 0.9, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          color: 'var(--accent)'
        }}>
          <span>📌</span>
          <span>Ghim tin nhắn</span>
        </div>
      )}

      {/* Header */}
      <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '4px 0 2px 0', lineHeight: 1.4 }}>
        {topic}
      </h3>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
        {multipleChoice ? 'Chọn nhiều phương án' : 'Chọn 1 phương án'}
      </div>

      {/* Summary - Only show if voted or closed */}
      <div 
        onClick={() => totalVoters > 0 && setShowDetails(true)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px',
          cursor: totalVoters > 0 ? 'pointer' : 'default',
          color: 'var(--accent)', fontSize: '13.5px', fontWeight: 700
        }}
      >
        <BarChart2 size={16} />
        <span>{totalVoters} người bình chọn</span>
        <ChevronRight size={16} />
      </div>

      {/* Options List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {options.map((opt) => {
          const voteCount = opt.voterIds?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVotes.includes(opt.id);

          return (
            <div 
              key={opt.id} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div style={{
                flex: 1, position: 'relative', height: '42px', borderRadius: '10px',
                backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--bg-tertiary)',
                border: `1.2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 14px',
              }}>
                {/* Progress Bar (Only if userVoted) */}
                {userVoted && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, width: `${percentage}%`,
                    backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.12)' : 'rgba(var(--accent-rgb), 0.05)',
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 0
                  }} />
                )}

                <span style={{ 
                  zIndex: 1, fontSize: '14px', fontWeight: isSelected ? 700 : 500,
                  flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
                }}>
                  {opt.text}
                </span>

                {userVoted && isSelected && (
                  <div style={{ zIndex: 1, color: 'var(--accent)', display: 'flex' }}>
                    <Check size={18} strokeWidth={3.5} />
                  </div>
                )}
              </div>
              
              {userVoted && (
                <span style={{ 
                  fontSize: '13.5px', fontWeight: 700, minWidth: '24px', textAlign: 'right',
                  color: voteCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {voteCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <button 
        onClick={() => !isClosed && setShowVoteModal(true)}
        style={{
          width: '100%', height: '44px', borderRadius: '12px',
          border: `1.5px solid var(--accent)`,
          backgroundColor: userVoted ? 'transparent' : 'rgba(var(--accent-rgb), 0.05)',
          color: 'var(--accent)', fontWeight: 800, fontSize: '14px',
          cursor: isClosed ? 'default' : 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {userVoted ? 'Đổi lựa chọn' : 'Bình chọn'}
      </button>

      <PollDetailsModal 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)}
        topic={topic}
        options={options}
      />

      <VotePollModal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        topic={topic}
        options={options}
        multipleChoice={multipleChoice}
        userVotes={userVotes}
        onVote={(data) => onVote && onVote(data)}
      />
    </div>
  );
}
