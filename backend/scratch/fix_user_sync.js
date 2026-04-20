const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/userModel');

async function fixUser() {
  try {
    const mongoUri = process.env.mongoDB_ZoloChatCluster;
    if (!mongoUri) throw new Error('Missing mongoDB_ZoloChatCluster in .env');

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Tìm người dùng tên "Vương Ngọc Huệ"
    const users = await User.find({ 
      $or: [
        { displayName: 'Vương Ngọc Huệ' }
      ]
    });

    if (users.length < 2) {
      console.log(`Found ${users.length} users. No merge needed or user not found.`);
      console.log('Users:', JSON.stringify(users, null, 2));
      process.exit(0);
    }

    // Phân loại:
    // Bản ghi cũ: Thường có createdAt sớm hơn
    // Bản ghi mới: Thường được tạo gần đây sau khi đổi project Supabase
    users.sort((a, b) => a.createdAt - b.createdAt);
    
    const oldUser = users[0];
    const newUser = users[users.length - 1];

    console.log('--- OLD USER ---');
    console.log(`ID: ${oldUser._id}, SupabaseID: ${oldUser.supabaseId}, Email: ${oldUser.email}, Created: ${oldUser.createdAt}`);
    
    console.log('--- NEW USER ---');
    console.log(`ID: ${newUser._id}, SupabaseID: ${newUser.supabaseId}, Email: ${newUser.email}, Created: ${newUser.createdAt}`);

    if (oldUser.supabaseId === newUser.supabaseId) {
      console.log('IDs are already the same. Nothing to do.');
      process.exit(0);
    }

    const newSupabaseId = newUser.supabaseId;

    // BƯỚC 1: Xóa bản ghi mới (trống)
    await User.deleteOne({ _id: newUser._id });
    console.log(`🗑️ Deleted new user record: ${newUser._id}`);

    // BƯỚC 2: Cập nhật ID Supabase mới vào bản ghi cũ
    // Lưu ý: Chúng ta cần xóa supabaseId cũ trước hoặc update trực tiếp
    // Nếu có ràng buộc index unique, ta phải cẩn thận. 
    // Vì ta đã xóa newUser có cùng supabaseId này ở trên, nên bây giờ update sẽ thành công.
    oldUser.supabaseId = newSupabaseId;
    await oldUser.save();
    
    console.log(`✅ Successfully updated Old User ${oldUser._id} with new SupabaseID: ${newSupabaseId}`);
    console.log('🎉 Fix completed. Please restart your apps and re-login.');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixUser();
