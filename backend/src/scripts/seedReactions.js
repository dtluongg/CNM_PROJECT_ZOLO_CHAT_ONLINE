const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const ReactionType = require('../models/reactionTypeModel');
const connectDB = require('../config/connectMongo');


const reactions = [
  { code: 'like',  emoji: '👍', label: 'Thích',    order: 1 },
  { code: 'love',  emoji: '❤️', label: 'Yêu thích', order: 2 },
  { code: 'haha',  emoji: '😂', label: 'Haha',      order: 3 },
  { code: 'wow',   emoji: '😮', label: 'Ngạc nhiên', order: 4 },
  { code: 'sad',   emoji: '😢', label: 'Buồn',      order: 5 },
  { code: 'angry', emoji: '😡', label: 'Phẫn nộ',   order: 6 },
];

const seedReactions = async () => {
  try {
    await connectDB();

    // Xóa dữ liệu cũ để tránh trùng lặp khi chạy lại
    await ReactionType.deleteMany({});
    
    await ReactionType.insertMany(reactions);
    
    console.log('✅ Seed dữ liệu Reaction thành công!');
    process.exit();
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  }
};

seedReactions();
