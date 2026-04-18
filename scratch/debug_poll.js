const mongoose = require('mongoose');
const Message = require('./backend/src/models/messageModel');
const User = require('./backend/src/models/userModel');

async function debug() {
  try {
    await mongoose.connect('mongodb://localhost:27017/zolo_chat'); // Giả sử DB name này
    console.log('Connected');

    const poll = await Message.findOne({ type: 'poll' });
    if (!poll) {
      console.log('No poll found');
      return;
    }

    console.log('Found poll:', poll._id);

    try {
      const p = await Message.findById(poll._id)
        .populate('payload.options.voterIds', 'displayName avatar');
      console.log('Populate result:', JSON.stringify(p.payload.options[0].voterIds, null, 2));
    } catch (e) {
      console.error('Populate failed:', e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Debug error:', err);
    process.exit(1);
  }
}

debug();
