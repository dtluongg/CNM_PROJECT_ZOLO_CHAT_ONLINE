const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  try {
    const connectMongoAtlas = require('./src/config/connectMongo');
    await connectMongoAtlas();
    console.log('DB Connected');

    const Message = require('./src/models/messageModel');
    const msg = await Message.findOne();
    console.log('Found one message:', msg ? msg._id : 'none');
    
    // Test creation of a text message
    const testMsg = new Message({
      conversationId: new mongoose.Types.ObjectId(), // dummy
      senderId: new mongoose.Types.ObjectId(), // dummy
      content: 'test content',
      type: 'text'
    });
    await testMsg.validate();
    console.log('Text message validation successful');

    // Test creation of a reminder message
    const reminderMsg = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderId: new mongoose.Types.ObjectId(),
      content: '[Nhắc hẹn]',
      type: 'reminder',
      payload: { reminderTime: new Date().toISOString(), content: 'test reminder' }
    });
    await reminderMsg.validate();
    console.log('Reminder message validation successful');

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
