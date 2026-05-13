
const axios = require('axios');

// THAY ĐỔI CÁC THÔNG TIN DƯỚI ĐÂY THEO TÀI KHOẢN CỦA BẠN
const BASE_URL = 'http://localhost:2026/backend/api';
const EMAIL = 'test@example.com'; // Thay bằng email của bạn
const PASSWORD = 'password123';   // Thay bằng password của bạn

async function debugFlow() {
    console.log('--- BẮT ĐẦU DEBUG FLOW ---');
    
    try {
        // 1. Giả lập Web Login
        console.log('\n1. Đang giả lập Web Login...');
        const webLogin = await axios.post(`${BASE_URL}/auth/signin`, {
            email: EMAIL,
            password: PASSWORD
        }, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
        });
        const webToken = webLogin.data.accessToken;
        const webSID = webLogin.data.session?.sessionId;
        console.log('=> Web Login Thành công!');
        console.log(`=> Web Token: ${webToken.substring(0, 20)}...`);
        console.log(`=> Web SID: ${webSID}`);

        // 2. Giả lập Mobile Login
        console.log('\n2. Đang giả lập Mobile Login...');
        const mobileLogin = await axios.post(`${BASE_URL}/auth/signin`, {
            email: EMAIL,
            password: PASSWORD
        }, {
            headers: { 
                'User-Agent': 'ZoloChat/1.0 (Android 13)',
                'X-Zolo-Client': 'Mobile-App'
            }
        });
        const mobileSID = mobileLogin.data.session?.sessionId;
        console.log('=> Mobile Login Thành công!');
        console.log(`=> Mobile SID: ${mobileSID}`);

        // 3. Web gọi danh sách thiết bị
        console.log('\n3. Web gọi danh sách thiết bị...');
        const deviceList = await axios.get(`${BASE_URL}/sessions/list`, {
            headers: { 'Authorization': `Bearer ${webToken}` }
        });

        console.log('\n--- KẾT QUẢ PHÂN TÍCH ---');
        const current = deviceList.data.current;
        const others = deviceList.data.others;

        console.log(`SID Hiện tại của Web trong Token: ${webSID}`);
        console.log(`SID Web trả về từ API: ${current?.sessionId}`);
        console.log(`Số lượng thiết bị khác: ${others.length}`);
        
        const foundMobile = others.find(o => o.sessionId === mobileSID);
        if (foundMobile) {
            console.log('✅ THÀNH CÔNG: Đã tìm thấy Mobile trong danh sách của Web.');
        } else {
            console.log('❌ THẤT BẠI: Mobile không có trong danh sách của Web.');
            console.log('Danh sách SID đang online:', others.map(o => o.sessionId));
        }

    } catch (error) {
        console.error('\n❌ LỖI TRONG QUÁ TRÌNH DEBUG:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

debugFlow();
