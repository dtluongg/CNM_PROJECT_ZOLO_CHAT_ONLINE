
const express = require("express");

const {
  sendDirectMessage,
  sendGroupMessage,
} = require("../controllers/messageController");

// const {
//   checkFriendship,
//   checkGroupMembership,
// } = require("../middlewares/friendMiddleware");

const router = express.Router();
console.log(sendDirectMessage, sendGroupMessage);

router.post("/direct", checkFriendship, sendDirectMessage);
router.post("/group", checkGroupMembership, sendGroupMessage);

module.exports = router;