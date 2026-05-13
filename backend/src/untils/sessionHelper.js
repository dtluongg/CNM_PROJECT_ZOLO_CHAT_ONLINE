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
 * Trích xuất IP từ request một cách an toàn & chuẩn hóa.
 * Thứ tự: x-forwarded-for → req.ip → req.socket.remoteAddress (fallback req.connection)
 * Xử lý IPv6-mapped, multi-proxy comma-separated, null/undefined.
 */
const extractClientIP = (req) => {
    if (!req) return null;

    try {
        let ip = req.headers['x-forwarded-for']
              || req.ip
              || req.socket?.remoteAddress
              || req.connection?.remoteAddress
              || null;

        if (!ip || typeof ip !== 'string') return null;

        // Multi-proxy: lấy IP đầu tiên (client thật)
        if (ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        // Chuẩn hóa IPv6-mapped → IPv4 thuần (::ffff:192.168.1.1 → 192.168.1.1)
        if (ip.startsWith('::ffff:')) {
            ip = ip.slice(7); // '::ffff:'.length === 7
        }

        return ip || null;
    } catch {
        return null;
    }
};

/**
 * Lấy vị trí từ IP qua dịch vụ bên ngoài (ip-api.com)
 */
const getLocationFromIP = async (ip) => {
    try {
        // Chuẩn hóa IPv6-mapped trước khi kiểm tra
        if (ip && typeof ip === 'string' && ip.startsWith('::ffff:')) {
            ip = ip.slice(7);
        }

        // Nếu là localhost hoặc IP nội bộ, gọi API không truyền IP để nó định vị IP public của server
        const isLocal = !ip || 
                        typeof ip !== 'string' ||
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

/**
 * Thu thập toàn bộ metadata phiên đăng nhập từ request (fail-safe).
 * Trả về object với defaults an toàn nếu bất kỳ bước nào lỗi.
 * Dùng chung cho cả Local login và OAuth login để đảm bảo consistency.
 */
const buildSessionMeta = async (req) => {
    const defaults = {
        deviceName: 'Thiết bị không xác định',
        platform: 'Unknown',
        ip: null,
        location: 'Không rõ vị trí',
        ua: '',
        clientType: null,
    };

    if (!req) return defaults;

    try {
        const ua = req.headers['user-agent'] || '';
        const clientType = req.headers['x-zolo-client'] || null;

        const { deviceName, platform } = parseUserAgent(
            ua,
            clientType,
            req.headers['x-device-name'],
            req.headers['x-device-platform']
        );

        const ip = extractClientIP(req);

        let location = defaults.location;
        try {
            location = await getLocationFromIP(ip);
        } catch (locErr) {
            console.error('[buildSessionMeta] Location lookup failed:', locErr.message);
        }

        return { deviceName, platform, ip, location, ua, clientType };
    } catch (err) {
        console.error('[buildSessionMeta] Metadata collection error:', err.message);
        return defaults;
    }
};

/**
 * Reverse geocode GPS coordinates (lat, lng) → city/province name.
 * Dùng Nominatim (OpenStreetMap) — free, không cần API key, hỗ trợ tiếng Việt.
 * Rate limit: 1 req/s (chỉ gọi 1 lần sau login → không vấn đề).
 */
const reverseGeocode = async (lat, lng) => {
    try {
        if (lat == null || lng == null) return 'Không rõ vị trí';

        const response = await axios.get(
            'https://nominatim.openstreetmap.org/reverse', {
                params: {
                    lat,
                    lon: lng,
                    format: 'json',
                    'accept-language': 'vi', // Trả tên tiếng Việt (TP. Hồ Chí Minh thay vì Ho Chi Minh City)
                    zoom: 10, // City/district level
                },
                headers: {
                    'User-Agent': 'ZoloChat/1.0 (session-tracking)',
                },
                timeout: 5000,
            }
        );

        const data = response.data;
        if (data && data.address) {
            const city = data.address.city
                      || data.address.town
                      || data.address.county
                      || data.address.state;
            const country = data.address.country || '';
            if (city) return `${city}, ${country}`.replace(/,\s*$/, '');
            if (country) return country;
        }

        return 'Không rõ vị trí';
    } catch (error) {
        console.error('[ReverseGeocode] Error:', error.message);
        return 'Không rõ vị trí';
    }
};

/**
 * Tạo fingerprint đơn giản cho thiết bị từ platform + userAgent.
 * Loại bỏ version numbers trong UA để tránh false-positive khi browser tự update.
 * Trả về chuỗi hash 32 ký tự (SHA-256 truncated).
 */
const generateDeviceFingerprint = (platform, userAgent) => {
    const crypto = require('crypto');
    // Chuẩn hóa: bỏ version numbers (vd: Chrome/125.0.0 → Chrome/)
    const normalizedUA = (userAgent || '')
        .replace(/\/[\d.]+/g, '/')
        .replace(/\s+/g, ' ')
        .trim();
    const raw = `${platform || 'Unknown'}::${normalizedUA}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
};

module.exports = {
    parseUserAgent,
    getLocationFromIP,
    extractClientIP,
    buildSessionMeta,
    reverseGeocode,
    generateDeviceFingerprint,
};
