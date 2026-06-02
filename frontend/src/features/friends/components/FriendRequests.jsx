import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const FriendRequests = ({
  friends,
  incomingReqs,
  outgoingReqs,
  onAccept,
  onReject,
  onCancelRequest,
  onMessage,
  onSearchSubmit,
  searchQuery,
  setSearchQuery,
  isSearching,
  searchResults,
  onSendRequest,
}) => {
  const [subTab, setSubTab] = useState('received');
  const { t } = useLanguage();

  const resolveSearchBtn = (u) => {
    const friendData  = friends.find((f) => f.friendId === u._id);
    const isFriend    = friends.some((f) => f.friendId === u._id && !f.theyBlockedMe);
    const incomingReq = incomingReqs.find((req) => req.fromUserId?._id === u._id);
    const outgoingReq = outgoingReqs.find((req) => req.toUserId?._id === u._id);

    if (friendData?.theyBlockedMe) return { text: t('friends.cannot_add'), action: null, style: { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' } };
    if (isFriend)     return { text: t('friends.message_btn'),     action: () => onMessage(friendData || { friendId: u._id, displayName: u.displayName, originalName: u.displayName, avatar: u.avatar }), style: { backgroundColor: 'var(--accent)', color: '#fff' } };
    if (incomingReq)  return { text: t('friends.accept_btn'),       action: () => onAccept(incomingReq._id), style: { backgroundColor: 'var(--accent)', color: '#fff' } };
    if (outgoingReq)  return { text: t('friends.cancel_req_btn'),      action: () => onCancelRequest(outgoingReq._id), style: { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' } };
    return { text: t('friends.add_btn'), action: () => onSendRequest(u._id), style: { backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' } };
  };

  return (
    <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Search section */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <form onSubmit={onSearchSubmit} className="flex gap-2 max-w-lg mb-4">
          <input
            type="text"
            placeholder={t('friends.add_friend_placeholder')}
            className="flex-1 p-2.5 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" disabled={isSearching} className="text-white px-5 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--accent)' }}>
            {isSearching ? t('friends.searching') : t('friends.search_btn')}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-3 max-w-lg mb-4">
            <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{t('friends.search_results_title')}</p>
            {searchResults.map((u) => {
              const { text, action, style } = resolveSearchBtn(u);
              return (
                <div key={u._id} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.displayName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--bg-primary)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {u.displayName?.[0]}
                      </div>
                    )}
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{u.displayName}</p>
                  </div>
                  <button onClick={action} disabled={!action} className="px-4 py-1.5 rounded text-sm font-medium" style={style}>
                    {text}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-6 px-6 pt-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { key: 'received', label: t('friends.tab_received', { count: incomingReqs.length }) },
          { key: 'sent',     label: t('friends.tab_sent', { count: outgoingReqs.length }) },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className="pb-3 font-medium text-sm transition-colors border-b-2"
            style={{
              borderColor: subTab === key ? 'var(--accent)' : 'transparent',
              color:       subTab === key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4 max-w-3xl">
          {subTab === 'received' ? (
            <>
              {incomingReqs.length === 0 && <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('friends.no_received_reqs')}</p>}
              {incomingReqs.map((req) => (
                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl shadow-sm gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-4">
                    {req.fromUserId?.avatar ? (
                      <img src={req.fromUserId.avatar} alt={req.fromUserId.displayName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                        {req.fromUserId?.displayName?.[0] || 'N'}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{req.fromUserId?.displayName || t('friends.stranger')}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('friends.want_to_friend')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button onClick={() => onReject(req._id)} className="px-5 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{t('friends.reject_btn')}</button>
                    <button onClick={() => onAccept(req._id)} className="px-5 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>{t('friends.accept_btn')}</button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {outgoingReqs.length === 0 && <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('friends.no_sent_reqs')}</p>}
              {outgoingReqs.map((req) => (
                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl shadow-sm gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      {req.toUserId?.displayName?.[0] || 'N'}
                    </div>
                    <div>
                      <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{req.toUserId?.displayName || t('friends.stranger')}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('friends.waiting_accept')}</p>
                    </div>
                  </div>
                  <button onClick={() => onCancelRequest(req._id)} className="px-5 py-2 text-sm font-semibold rounded-lg self-end sm:self-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    {t('friends.cancel_invite_btn')}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequests;