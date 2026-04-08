const Message = require("../models/message.model");
const reactMessage = async (req, res) => {
  try {
    const { emoji, userId } = req.body;
    const messageId = req.params.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    const existing = message.reactions.find(
      (r) => r.userId === userId
    );

    if (existing) {
      if (existing.emoji === emoji) {
        // 👇 BẤM LẠI → XOÁ
        message.reactions = message.reactions.filter(
          (r) => r.userId !== userId
        );
      } else {
        // 👇 ĐỔI EMOJI
        existing.emoji = emoji;
      }
    } else {
      // 👇 THÊM MỚI
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json(err);
  }
};