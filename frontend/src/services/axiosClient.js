import axios from 'axios';

// Định nghĩa URL máy chủ từ file .env. Vite bắt đầu bằng VITE_
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/backend/api';

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Quan trọng: Bắt buộc bật để đính kèm Cookies (đựng JWT token) trong mọi gói tin gửi đi
    withCredentials: true, 
});

// Chặn gửi đi (Request Interceptor)
axiosClient.interceptors.request.use(
    (config) => {
        // Nơi nhúng thêm Bearer token vào Header nếu nhóm bạn không xài thuần túy Cookies
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Chặn nhận về (Response Interceptor)
axiosClient.interceptors.response.use(
    (response) => {
        // Trả trực tiếp data để Code khi gọi API không cần ghi `.data.data` mệt mỏi
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    (error) => {
        // Móc sẵn dây bắt rụng Token (401 Unauthorized)
        if (error.response && error.response.status === 401) {
            console.error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
            // TODO: Bắn sự kiện Log_out hoặc gọi ngầm API /refresh-token tại đây
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;
