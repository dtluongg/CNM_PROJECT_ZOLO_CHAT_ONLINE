
const mongoose = require('mongoose');

const URI = 'mongodb://trantronghuydqd_db_user:MEOISU9Al0BV0roW@ac-dzxpuih-shard-00-00.yd6wlem.mongodb.net:27017,ac-dzxpuih-shard-00-01.yd6wlem.mongodb.net:27017,ac-dzxpuih-shard-00-02.yd6wlem.mongodb.net:27017/?ssl=true&replicaSet=atlas-fx078t-shard-0&authSource=admin&appName=Cluster0';

async function checkDB() {
    console.log('--- ĐANG KẾT NỐI DATABASE ---');
    try {
        await mongoose.connect(URI);
        const db = mongoose.connection.db;
        
        // 1. Lấy 10 session mới nhất
        const sessions = await db.collection('sessions').find({}).sort({updatedAt: -1}).limit(10).toArray();
        
        console.log('\n--- 10 SESSION MỚI NHẤT TRONG DB ---');
        sessions.forEach(s => {
            console.log(`[${s.isActive ? 'ACTIVE' : 'DEAD  '}] SID: ${s.sessionId} | PL: ${s.platform.padEnd(7)} | UA: ${s.userAgent.substring(0, 30)}... | Updated: ${s.updatedAt}`);
        });

        // 2. Kiểm tra xem có User nào đang bị "đá" chéo không
        const activeUsers = [...new Set(sessions.filter(s => s.isActive).map(s => s.userId.toString()))];
        console.log(`\nPhát hiện ${activeUsers.length} người dùng đang có session active.`);

        for (const uid of activeUsers) {
            const userSessions = sessions.filter(s => s.userId.toString() === uid);
            const activeWeb = userSessions.filter(s => s.isActive && !['Android', 'iOS'].includes(s.platform));
            const activeMobile = userSessions.filter(s => s.isActive && ['Android', 'iOS'].includes(s.platform));
            
            console.log(`\nUser: ${uid}`);
            console.log(`- Web Active: ${activeWeb.length}`);
            console.log(`- Mobile Active: ${activeMobile.length}`);
            
            if (activeWeb.length > 0 && activeMobile.length > 0) {
                console.log('✅ TRẠNG THÁI ĐÚNG: Cả Web và Mobile đều đang Online cùng lúc.');
            } else {
                console.log('⚠️ TRẠNG THÁI NGHI VẤN: Chỉ có một bên Online.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('LỖI KẾT NỐI:', err.message);
        process.exit(1);
    }
}

checkDB();
