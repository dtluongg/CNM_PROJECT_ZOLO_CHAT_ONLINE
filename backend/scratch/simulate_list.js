const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/userModel');
const ConversationMember = require('../src/models/conversationMemberModel');
const Conversation = require('../src/models/conversationModel');

async function simulateList() {
  try {
    const mongoUri = process.env.mongoDB_ZoloChatCluster;
    await mongoose.connect(mongoUri);

    const myUser = await User.findOne({ displayName: 'Vương Ngọc Huệ' });
    const userId = myUser._id.toString();

    console.log(`Simulating list for user: ${userId}`);

    const memberFilter = {
        userId,
        leftAt: null,
        isDeleted: { $ne: true },
        isArchived: false
    };

    const members = await ConversationMember.find(memberFilter).lean();
    console.log(`Matching memberships: ${members.length}`);

    if (members.length > 0) {
        const conversations = await Conversation.find({
            _id: { $in: members.map((m) => m.conversationId) },
        }).lean();
        console.log(`Matching conversations in DB: ${conversations.length}`);
        
        conversations.forEach(c => {
            console.log(`- ${c._id} [${c.type}] name: ${c.name}`);
        });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

simulateList();
