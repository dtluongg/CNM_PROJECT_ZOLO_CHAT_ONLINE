const mongoose = require('mongoose');

const reactionTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // định danh như 'like', 'heart'
    emoji: { type: String, required: true },            // kí tự emoji như '👍', '❤️'
    label: { type: String, required: true },            // nhãn hiển thị 'Thích', 'Yêu thích'
    order: { type: Number, default: 0 },                 // thứ tự hiển thị
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReactionType', reactionTypeSchema);
