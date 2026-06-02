const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/userModel');
const ConversationMember = require('../src/models/conversationMemberModel');

async function debugConvs() {
  try {
    const mongoUri = process.env.mongoDB_ZoloChatCluster;
    await mongoose.connect(mongoUri);

    const myUser = await User.findOne({ displayName: 'Vương Ngọc Huệ' });
    if (!myUser) {
        console.log('User not found');
        return;
    }

    const memberships = await ConversationMember.find({ userId: myUser._id });
    console.log(`--- Memberships for ${myUser._id} ---`);
    memberships.forEach(m => {
        console.log(`Conv: ${m.conversationId}, isDeleted: ${m.isDeleted}, isArchived: ${m.isArchived}, leftAt: ${m.leftAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugConvs();
