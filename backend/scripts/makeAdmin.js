/**
 * Script cấp quyền admin cho một user theo email.
 * Chạy: node scripts/makeAdmin.js vi0978294041@gmail.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns      = require('node:dns');
const mongoose = require('mongoose');
const User     = require('../src/models/userModel');

// Fix DNS SRV resolution cho MongoDB Atlas (giống index.js)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const targetEmail = process.argv[2];
if (!targetEmail) {
    console.error('Usage: node scripts/makeAdmin.js <email>');
    process.exit(1);
}

(async () => {
    await mongoose.connect(process.env.mongoDB_ZoloChatCluster);
    console.log('Connected to MongoDB');

    const user = await User.findOneAndUpdate(
        { email: targetEmail.toLowerCase() },
        { role: 'admin' },
        { returnDocument: 'after', select: '-passwordHash' }
    );

    if (!user) {
        console.error(`❌ Không tìm thấy user với email: ${targetEmail}`);
        process.exit(1);
    }

    console.log(`✅ Đã cấp quyền admin cho: ${user.displayName} (${user.email})`);
    await mongoose.disconnect();
})();