const axios = require('axios');

/**
 * Phân tích User-Agent để lấy tên thiết bị và nền tảng
 */
const parseUserAgent = (ua, clientType, customDeviceName, customPlatform) => {
    // Nếu Mobile gửi thông tin tên máy thật (ví dụ từ expo-device)
    if (customDeviceName) {
        return { 
            deviceName: customDeviceName, 
            platform: customPlatform || 'Unknown' 
        };
    }

    if (!ua && !clientType) return { deviceName: 'Thiết bị không xác định', platform: 'Unknown' };

    let platform = 'Unknown';
    let deviceName = 'Thiết bị không xác định';

    // 1. Ưu tiên xác định qua User-Agent
    if (/android|mobile/i.test(ua)) {
        platform = 'Android';
        const match = ua.match(/\(([^;]+);/);
        deviceName = match ? match[1] : 'Mobile Device';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
        platform = 'iOS';
        deviceName = /ipad/i.test(ua) ? 'iPad' : 'iPhone';
    } else if (/windows/i.test(ua)) {
        platform = 'Windows';
        deviceName = 'Windows PC';
    } else if (/macintosh/i.test(ua)) {
        platform = 'macOS';
        deviceName = 'MacBook / iMac';
    } else if (/linux/i.test(ua)) {
        platform = 'Linux';
        deviceName = 'Linux PC';
    }

    // 2. Fallback dựa trên clientType (Header X-Zolo-Client)
    if (platform === 'Unknown' && clientType === 'Mobile-App') {
        platform = 'Android'; // Default cho mobile app nếu không nhận diện được UA cụ thể
        deviceName = 'Mobile Device';
    }

    // 3. Tinh chỉnh tên thiết bị nếu là trình duyệt
    if (ua && ua.includes('Chrome/')) {
        deviceName = `Chrome - ${platform}`;
    } else if (ua && ua.includes('Firefox/')) {
        deviceName = `Firefox - ${platform}`;
    } else if (ua && ua.includes('Safari/') && !ua.includes('Chrome')) {
        deviceName = `Safari - ${platform}`;
    }

    return { deviceName, platform };
};

/**
 * Lấy vị trí từ IP qua dịch vụ bên ngoài (ip-api.com)
 */
const getLocationFromIP = async (ip) => {
    try {
        // Nếu là localhost hoặc IP nội bộ, gọi API không truyền IP để nó định vị IP public của server
        const isLocal = !ip || 
                        ip === '::1' || 
                        ip === '127.0.0.1' || 
                        ip.startsWith('192.168.') || 
                        ip.startsWith('10.') || 
                        ip.startsWith('172.');

        const queryIp = isLocal ? '' : ip;
        const response = await axios.get(`http://ip-api.com/json/${queryIp}?fields=status,message,country,city`);
        
        if (response.data && response.data.status === 'success') {
            return `${response.data.city}, ${response.data.country}`;
        }
        
        return isLocal ? 'Localhost (Phát triển)' : 'Không rõ vị trí';
    } catch (error) {
        console.error('[SessionHelper] Get location error:', error.message);
        return 'Không rõ vị trí';
    }
};

module.exports = {
    parseUserAgent,
    getLocationFromIP,
};
