const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/userModel');
const Conversation = require('../src/models/conversationModel');
const Message = require('../src/models/messageModel');

async function checkDB() {
  try {
    const mongoUri = process.env.mongoDB_ZoloChatCluster;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to:', mongoUri.split('@')[1]);

    const userCount = await User.countDocuments();
    const convCount = await Conversation.countDocuments();
    const msgCount = await Message.countDocuments();

    console.log(`--- Statistics ---`);
    console.log(`Users: ${userCount}`);
    console.log(`Conversations: ${convCount}`);
    console.log(`Messages: ${msgCount}`);

    if (convCount === 0) {
      console.log('⚠️ Warning: No conversations found in this database!');
    }

    const myUser = await User.findOne({ displayName: 'Vương Ngọc Huệ' });
    if (myUser) {
        console.log(`My User ID: ${myUser._id}`);
        const ConversationMember = require('../src/models/conversationMemberModel');
        const myConvs = await ConversationMember.find({ userId: myUser._id });
        console.log(`My Conversations Count: ${myConvs.length}`);
    }

  } catch (error) {
    console.error(' Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDB();
