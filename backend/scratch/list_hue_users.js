const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/userModel');

async function listUsers() {
  try {
    const mongoUri = process.env.mongoDB_ZoloChatCluster;
    await mongoose.connect(mongoUri);

    const users = await User.find({ displayName: 'Vương Ngọc Huệ' });
    console.log(`Found ${users.length} users with name 'Vương Ngọc Huệ':`);
    users.forEach(u => {
      console.log(`- ID: ${u._id}, Email: ${u.email}, SupabaseID: ${u.supabaseId}, Created: ${u.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers();
