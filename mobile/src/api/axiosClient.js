import axios from 'axios';

// Ở Expo (React Native), URL localhost hoặc 127.0.0.1 sẽ trỏ vào cái giả lập máy sấy điện thoại (không trỏ về NodeJS).
// Do đó bạn phải điền IP LAN gốc của máy tính ở chỗ này (Ví dụ: 192.168.1.x) hoặc đưa biến lên .env (EXPO_PUBLIC_API_URL)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/backend/api';

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosClient.interceptors.request.use(
    async (config) => {
        // Tại mobile, cơ chế Cookie không ổn định như Browser. Thường Team sẽ dùng AsyncStorage 
        // để lưu AuthToken. Code chỗ này tương lai Thành viên làm Auth sẽ móc nó lên gắn vào Header:
        // const token = await AsyncStorage.getItem('accessToken');
        // if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response) => {
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('Mobile: Token hết hạn, đang cố thử văng app ra màn hình Login...');
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
