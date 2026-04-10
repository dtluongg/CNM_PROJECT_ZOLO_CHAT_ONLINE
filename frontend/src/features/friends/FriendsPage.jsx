import React, { useState, useEffect } from 'react';
import friendApi from './api/friendApi';

const FriendsPage = () => {
    // ---- State ----
    const [activeTab, setActiveTab] = useState('friends_list'); // 'friends_list', 'friend_requests'
    const [subTab, setSubTab] = useState('received'); // 'received', 'sent' (for friend_requests)

    const [friends, setFriends] = useState([]);
    const [incomingReqs, setIncomingReqs] = useState([]);
    const [outgoingReqs, setOutgoingReqs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [friendFilterText, setFriendFilterText] = useState('');

    // ---- Fetch Data ----
    const fetchData = async () => {
        try {
            setLoading(true);
            const [friendRes, inReqRes, outReqRes] = await Promise.all([
                friendApi.getFriendList().catch(() => ({ data: { success: false } })),
                friendApi.getIncomingRequests().catch(() => ({ data: { success: false } })),
                friendApi.getOutgoingRequests().catch(() => ({ data: { success: false } }))
            ]);

            if (friendRes.data?.success) setFriends(friendRes.data.data || []);
            if (inReqRes.data?.success) setIncomingReqs(inReqRes.data.data || []);
            if (outReqRes.data?.success) setOutgoingReqs(outReqRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ---- Handlers ----
    const handleAccept = async (id) => {
        try {
            await friendApi.acceptRequest(id);
            fetchData();
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Từ chối lời mời này?')) return;
        try {
            await friendApi.rejectRequest(id);
            fetchData();
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleCancelRequest = async (id) => {
        if (!window.confirm('Thu hồi lời mời đã gửi?')) return;
        try {
            await friendApi.cancelRequest(id);
            fetchData();
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleUnfriend = async (friendId) => {
        if (!window.confirm('Xóa người này khỏi danh sách bạn bè?')) return;
        try {
            await friendApi.unfriend(friendId);
            fetchData();
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleUpdateNickname = async (friendId) => {
        const newNickname = window.prompt('Nhập biệt danh mới cho người này:');
        if (newNickname === null) return;
        try {
            await friendApi.updateNickname(friendId, newNickname);
            fetchData();
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || 'Không thể đổi biệt danh'));
        }
    };

    const handleBlockFriend = async (friendId, isBlocked) => {
        const actionStr = isBlocked ? 'bỏ chặn' : 'chặn';
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionStr} người này không?`)) return;
        try {
            await friendApi.blockFriend(friendId);
            alert(`Đã ${actionStr} thành công`);
            fetchData();
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || `Không thể ${actionStr}`));
        }
    };

    const handleSearchGlobal = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim() || searchQuery.length < 2) return alert('Nhập ít nhất 2 ký tự');
        try {
            setIsSearching(true);
            const res = await friendApi.searchUsers(searchQuery);
            if (res.data.users) setSearchResults(res.data.users);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequestGlobal = async (targetId) => {
        try {
            await friendApi.sendRequest(targetId);
            alert('Đã gửi lời mời thành công!');
            fetchData(); // reload outgoing
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    // ---- Grouping Alphabetically ----
    const filteredFriends = friends.filter(f => 
        (f.displayName || '').toLowerCase().includes(friendFilterText.toLowerCase())
    );

    const groupedFriends = filteredFriends.reduce((acc, f) => {
        const firstLetter = f.displayName ? f.displayName[0].toUpperCase() : '#';
        const group = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
        if (!acc[group]) acc[group] = [];
        acc[group].push(f);
        return acc;
    }, {});

    const sortedGroups = Object.keys(groupedFriends).sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    // ---- Renders ----
    const renderSidebar = () => (
        <div className="w-[300px] border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="p-4 flex items-center gap-3">
                <div className="w-full relative">
                    <span className="absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }}>🔍</span>
                    <input 
                        type="text" 
                        className="w-full border-none rounded-md py-2 pl-9 pr-3 text-sm outline-none"
                        style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
                        placeholder="Tìm bạn bè..."
                        value={friendFilterText}
                        onChange={(e) => setFriendFilterText(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {/* Menu danh sách bạn bè */}
                <button 
                    onClick={() => setActiveTab('friends_list')}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${activeTab === 'friends_list' ? 'font-semibold' : ''}`}
                    style={{ 
                        backgroundColor: activeTab === 'friends_list' ? 'var(--bg-hover)' : 'transparent', 
                        color: activeTab === 'friends_list' ? 'var(--accent)' : 'var(--text-primary)' 
                    }}
                >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>👥</span>
                    <span>Danh sách bạn bè</span>
                </button>

                {/* Menu Lời mời */}
                <button 
                    onClick={() => setActiveTab('friend_requests')}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${activeTab === 'friend_requests' ? 'font-semibold' : ''}`}
                    style={{ 
                        backgroundColor: activeTab === 'friend_requests' ? 'var(--bg-hover)' : 'transparent', 
                        color: activeTab === 'friend_requests' ? 'var(--accent)' : 'var(--text-primary)' 
                    }}
                >
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>📥</span>
                        <span>Lời mời kết bạn</span>
                    </div>
                    {incomingReqs.length > 0 && (
                        <span className="text-white text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#ef4444' }}>
                            {incomingReqs.length}
                        </span>
                    )}
                </button>

                {/* Menu Nhóm bla bla - Fake UI */}
                <button className="w-full flex items-center gap-3 px-4 py-3 opacity-60" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>👨‍👩‍👧‍👦</span>
                    <span>Danh sách nhóm</span>
                </button>
            </div>
        </div>
    );

    const renderFriendsList = () => (
        <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="px-6 py-4 border-b flex items-center flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bạn bè ({friends.length})</span>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {sortedGroups.length === 0 && <p className="text-center mt-10" style={{ color: 'var(--text-muted)' }}>Không tìm thấy bạn bè nào.</p>}
                
                {sortedGroups.map(letter => (
                    <div key={letter} className="mb-6">
                        <h3 className="text-lg font-bold mb-3 ml-2" style={{ color: 'var(--text-primary)' }}>{letter}</h3>
                        <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                            {groupedFriends[letter].map((f, idx) => (
                                <div key={f.friendshipId} className={`flex items-center justify-between p-3 px-5 transition cursor-pointer ${idx !== groupedFriends[letter].length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}>
                                            {f.displayName ? f.displayName[0].toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{f.displayName}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.email}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Action Box */}
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleUpdateNickname(f.friendId); }}
                                            className="px-3 py-1.5 text-xs font-semibold rounded"
                                            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                                        >
                                            Biệt danh
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleBlockFriend(f.friendId, f.isBlocked); }}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded ${f.isBlocked ? 'text-gray-600 bg-gray-200 hover:bg-gray-300' : 'text-orange-600 bg-orange-50 hover:bg-orange-100'}`}
                                        >
                                            {f.isBlocked ? 'Bỏ chặn' : 'Chặn'}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleUnfriend(f.friendId); }}
                                            className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 rounded text-red-600"
                                        >
                                            Xoá
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFriendRequests = () => (
        <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Find section */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <form onSubmit={handleSearchGlobal} className="flex gap-2 max-w-lg mb-4">
                    <input 
                        type="text" 
                        placeholder="Thêm bạn bằng tên hoặc email..."
                        className="flex-1 p-2.5 rounded-lg border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" disabled={isSearching} className="text-white px-5 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--accent)' }}>
                        {isSearching ? 'Đang T...' : 'Tìm kiếm'}
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div className="space-y-3 max-w-lg mb-4">
                         <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>KẾT QUẢ TÌM KIẾM</p>
                         {searchResults.map(u => {
                             const isFriend = friends.some(f => f.friendId === u._id);
                             const incomingReq = incomingReqs.find(req => req.fromUserId?._id === u._id);
                             const outgoingReq = outgoingReqs.find(req => req.toUserId?._id === u._id);

                             let btnText = 'Kết bạn';
                             let btnAction = () => handleSendRequestGlobal(u._id);
                             let btnStyle = { backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' };

                             if (isFriend) {
                                 btnText = 'Bạn bè';
                                 btnAction = undefined;
                                 btnStyle = { backgroundColor: 'transparent', color: 'var(--text-muted)' };
                             } else if (incomingReq) {
                                 btnText = 'Đồng ý';
                                 btnAction = () => handleAccept(incomingReq._id);
                                 btnStyle = { backgroundColor: 'var(--accent)', color: '#fff' };
                             } else if (outgoingReq) {
                                 btnText = 'Thu hồi';
                                 btnAction = () => handleCancelRequest(outgoingReq._id);
                                 btnStyle = { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' };
                             }

                             return (
                             <div key={u._id} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                                        {u.displayName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{u.displayName}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                                    </div>
                                </div>
                                <button onClick={btnAction} disabled={isFriend} className={`px-4 py-1.5 rounded text-sm font-medium ${isFriend ? 'cursor-default opacity-50' : ''}`} style={btnStyle}>
                                    {btnText}
                                </button>
                             </div>
                             );
                         })}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-6 px-6 pt-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <button 
                    onClick={() => setSubTab('received')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2`}
                    style={{ 
                        borderColor: subTab === 'received' ? 'var(--accent)' : 'transparent', 
                        color: subTab === 'received' ? 'var(--accent)' : 'var(--text-muted)' 
                    }}
                >
                    Đã nhận ({incomingReqs.length})
                </button>
                <button 
                    onClick={() => setSubTab('sent')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2`}
                    style={{ 
                        borderColor: subTab === 'sent' ? 'var(--accent)' : 'transparent', 
                        color: subTab === 'sent' ? 'var(--accent)' : 'var(--text-muted)' 
                    }}
                >
                    Đã gửi ({outgoingReqs.length})
                </button>
            </div>

            {/* Content Lists */}
            <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {subTab === 'received' ? (
                    <div className="space-y-4 max-w-3xl">
                        {incomingReqs.length === 0 && <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Không có lời mời nào đến bạn.</p>}
                        {incomingReqs.map(req => (
                            <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl shadow-sm gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                        {req.fromUserId?.displayName?.[0] || 'N'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{req.fromUserId?.displayName || 'Người lạ'}</p>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{req.fromUserId?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <button onClick={() => handleReject(req._id)} className="px-5 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                                        Từ chối
                                    </button>
                                    <button onClick={() => handleAccept(req._id)} className="px-5 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                                        Đồng ý
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4 max-w-3xl">
                        {outgoingReqs.length === 0 && <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Bạn chưa gửi lời mời kết bạn nào.</p>}
                        {outgoingReqs.map(req => (
                            <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl shadow-sm gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                        {req.toUserId?.displayName?.[0] || 'N'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{req.toUserId?.displayName || 'Người lạ'}</p>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Đang chờ đối phương xác nhận...</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <button onClick={() => handleCancelRequest(req._id)} className="px-5 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                                        Thu hồi lời mời
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (loading && friends.length === 0) return <div className="h-screen flex items-center justify-center font-semibold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>Đang tải kết nối...</div>;

    return (
        <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {renderSidebar()}
            {activeTab === 'friends_list' && renderFriendsList()}
            {activeTab === 'friend_requests' && renderFriendRequests()}
        </div>
    );
};

export default FriendsPage;
