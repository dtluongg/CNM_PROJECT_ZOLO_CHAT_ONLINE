import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
// Import apiClient của bạn (Hãy kiểm tra lại đường dẫn import này cho khớp với dự án)
import apiClient from '../services/apiClient';
import { SOCKET_URL } from '../config/env';

// 1. Tạo Context
const NotificationContext = createContext();

// 2. Hook tùy chỉnh để sử dụng Context dễ dàng
export const useNotifications = () => useContext(NotificationContext);

// 3. Provider (Nhà cung cấp dữ liệu)
export const NotificationProvider = ({ children }) => {
    const { token } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Hàm gọi API lấy danh sách thông báo từ Backend
    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            // LƯU Ý: Đảm bảo Backend của bạn có endpoint GET /notifications
            const res = await apiClient.get('/notifications');
            const data = res.data?.data || [];

            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (err) {
            console.error('Lỗi khi tải thông báo:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Lấy dữ liệu ngay khi người dùng đăng nhập thành công
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Lắng nghe thông báo mới theo thời gian thực (Real-time Socket)
    useEffect(() => {
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
        });

        // Tên sự kiện 'notification:new' phải khớp với tên Backend của bạn phát ra
        socket.on('notification:new', (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => socket.disconnect();
    }, [token]);

    // Hàm đánh dấu đã đọc (1 cái hoặc tất cả)
    const markAsRead = async (id) => {
        try {
            if (id === 'all') {
                // Thay đổi từ apiClient.put thành apiClient.patch để khớp với Backend
                await apiClient.patch('/notifications/read-all');
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            } else {
                // Thay đổi từ apiClient.put thành apiClient.patch
                await apiClient.patch(`/notifications/${id}/read`);
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            // Giữ lại log lỗi để theo dõi nếu cần
            console.error('Lỗi khi đánh dấu đã đọc:', err.response?.status, err.message);
            alert(`Lỗi API: ${err.response?.status} - Không thể đánh dấu đã đọc.`);
        }
    };
    // THÊM HÀM MỚI TẠI ĐÂY: Xử lý bật/tắt cài đặt thông báo
    const updateConversationSetting = async (conversationId, settingsPayload) => {
        try {
            // Gọi API PATCH lên server theo đúng router đã định nghĩa
            const res = await apiClient.patch(`/notifications/settings/${conversationId}`, settingsPayload);
            return res.data;
        } catch (err) {
            console.error('Lỗi khi cập nhật cài đặt thông báo:', err.response?.status, err.message);
            throw err; // Ném lỗi ra ngoài để component có thể catch (bắt lỗi) và dừng trạng thái loading
        }
    };
    // HÀM MỚI: Lấy trạng thái cài đặt thật từ Database
    const getConversationSetting = async (conversationId) => {
        try {
            const res = await apiClient.get(`/notifications/settings/${conversationId}`);
            return res.data?.data; // Trả về object chứa isMuted
        } catch (err) {
            console.error('Lỗi khi lấy cài đặt thông báo:', err);
            return null;
        }
    };
    // Cung cấp dữ liệu ra bên ngoài
    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            loading,
            fetchNotifications,
            updateConversationSetting,
            getConversationSetting,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};