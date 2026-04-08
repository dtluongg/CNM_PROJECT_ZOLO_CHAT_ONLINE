import React, { useState, useEffect } from 'react';
import friendApi from './api/friendApi';

const FriendsPage = () => {
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetId, setTargetId] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const friendRes = await friendApi.getFriendList();
            const requestRes = await friendApi.getIncomingRequests();
            
            if (friendRes.success) setFriends(friendRes.data);
            if (requestRes.success) setRequests(requestRes.data);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAccept = async (id) => {
        try {
            await friendApi.acceptRequest(id);
            fetchData(); // Refresh lại danh sách 2 bên sau khi Accept thành công
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleSendRequest = async () => {
        if(!targetId) return alert('Vui lòng nhập ID người dùng');
        try {
            await friendApi.sendRequest(targetId);
            alert('Đã gửi lời mời thành công!');
            setTargetId('');
        } catch (error) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu Bạn bè...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto h-[100vh] mt-16 text-gray-800 dark:text-white">
            <h1 className="text-3xl font-bold mb-8">Quản lý Bạn Bè</h1>

            {/* Panel Gửi lời mời thủ công (Dành cho Coder test trước khi làm nút Add Friend ở trang Profile) */}
            <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Gửi lời mời kết bạn mới</h2>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Nhập User ID (MongoDB ObjectId) để gửi..."
                        className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                    />
                    <button 
                        onClick={handleSendRequest} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                    >
                        Gửi
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cột 1: Danh sách Lời mời đến */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span>🔥 Lời mời chờ duyệt</span>
                        {requests.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{requests.length}</span>
                        )}
                    </h2>
                    <div className="space-y-4">
                        {requests.length === 0 && <p className="text-gray-400 italic">Không có lời mời nào.</p>}
                        {requests.map(req => (
                            <div key={req._id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg flex justify-between items-center border border-gray-200 dark:border-gray-700">
                                <div>
                                    <p className="font-bold text-lg">{req.fromUserId?.displayName || 'Người lạ'}</p>
                                    <p className="text-sm text-gray-500">{req.fromUserId?.email}</p>
                                </div>
                                <button 
                                    onClick={() => handleAccept(req._id)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Đồng ý
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cột 2: Danh sách bạn bè hiện tại */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span>👥 Danh bạ của bạn</span>
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{friends.length}</span>
                    </h2>
                    <div className="space-y-4">
                        {friends.length === 0 && <p className="text-gray-400 italic">Bạn chưa có người bạn nào. Hãy kết bạn đi!</p>}
                        {friends.map(f => (
                            <div key={f.friendshipId} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 cursor-pointer transition-colors">
                                {/* Vẽ cục Avatar chữ cái đầu Fake */}
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full flex items-center justify-center text-xl font-bold">
                                    {f.displayName ? f.displayName[0].toUpperCase() : '?'}
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{f.displayName || 'Unnamed User'}</p>
                                    <p className="text-sm text-gray-500">{f.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendsPage;
