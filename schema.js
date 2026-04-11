/**
 * CHAT APP SCHEMA (MVP 20-30 users)
 * Backend: NodeJS + MongoDB
 *
 * Goal:
 * - Chat private + group
 * - Send text + image + file
 * - Unread count per conversation
 * - Reply specific message
 * - Reaction for each message
 */

/**
 * 1) USER COLLECTION
 */
const User = {
  _id: "ObjectId",
  username: "String", // unique, login id
  displayName: "String",
  email: "String", // unique
  phone: "String",
  avatar: "String", // URL ảnh
  createdAt: "Date"
};

/**
 * =========================
 * 2. CONVERSATION COLLECTION
 * =========================
 */
const Conversation = {
  _id: "ObjectId",
  type: "private | group",
  // For private chat only. Build by sorting 2 userIds and joining with '_' to avoid duplicate private room.
  participantsKey: "String | null",
  // group fields (null for private)
  name: "String | null",
  avatar: "String | null",
  createdBy: "ObjectId",
  members: [
    {
      userId: "ObjectId",
      role: "admin | member",
      joinedAt: "Date",

      // unread per user is calculated from this field
      lastReadAt: "Date | null",
      muted: "Boolean"
    }
  ],
  // denormalized for fast conversation list
  lastMessage: {
    messageId: "ObjectId",
    senderId: "ObjectId",
    type: "text | image | file",
    preview: "String",
    createdAt: "Date"
  },

  createdAt: "Date",
  updatedAt: "Date"
};

/**
 * 3) MESSAGE COLLECTION
 */
const Message = {
  _id: "ObjectId",
  conversationId: "ObjectId",
  senderId: "ObjectId",

  // use text for normal message, keep null for attachment-only messages
  content: "String | null",
  type: "text | image | file",

  attachments: [
    {
      url: "String",
      fileName: "String",
      mimeType: "String",
      size: "Number",

      // optional, useful for image/file preview
      width: "Number | null",
      height: "Number | null"
    }
  ],

  // reply someone in private/group
  replyTo: {
    messageId: "ObjectId | null",
    senderId: "ObjectId | null",
    snippet: "String | null"
  },

  // reaction embed luôn
  reactions: [
    {
      userId: "ObjectId",
      type: "like | love | haha | wow | sad | angry",
      createdAt: "Date"
    }
  ],
  edited: "Boolean",
  deleted: "Boolean",
  createdAt: "Date",
  updatedAt: "Date"
};

/**
 * =========================
 * 4. FRIEND REQUEST
 * =========================
 */
const FriendRequest = {
  _id: "ObjectId",
  fromUserId: "ObjectId",
  toUserId: "ObjectId",
  status: "pending | accepted | rejected",
  createdAt: "Date"
};

/**
 * =========================
 * 5. PRESENCE (ONLINE/OFFLINE)
 * =========================
 */
const Presence = {
  _id: "ObjectId",
  userId: "ObjectId",
  online: "Boolean",
  lastSeen: "Date"
};

/**
 * =========================
 * 6. SAMPLE DATA (for visualization)
 * =========================
 */
const sampleData = {
  users: [
    {
      _id: "u1",
      username: "john",
      displayName: "John Doe",
      email: "john@gmail.com",
      phone: "0123456789",
      avatar: "https://cdn.example.com/avatars/john.png",
      createdAt: new Date("2026-03-10T08:00:00Z")
    },
    {
      _id: "u2",
      username: "jane",
      displayName: "Jane Smith",
      email: "jane@gmail.com",
      phone: "0987654321",
      avatar: "https://cdn.example.com/avatars/jane.png",
      createdAt: new Date("2026-03-10T08:05:00Z")
    },
    {
      _id: "u3",
      username: "mike",
      displayName: "Mike Nguyen",
      email: "mike@gmail.com",
      phone: "0901111222",
      avatar: "https://cdn.example.com/avatars/mike.png",
      createdAt: new Date("2026-03-10T08:10:00Z")
    }
  ],

  conversations: [
    {
      _id: "c_private_1",
      type: "private",
      participantsKey: "u1_u2",
      name: null,
      avatar: null,
      createdBy: "u1",
      members: [
        {
          userId: "u1",
          role: "member",
          joinedAt: new Date("2026-03-10T09:00:00Z"),
          lastReadAt: new Date("2026-03-21T09:01:30Z"),
          muted: false
        },
        {
          userId: "u2",
          role: "member",
          joinedAt: new Date("2026-03-10T09:00:00Z"),
          lastReadAt: new Date("2026-03-21T09:00:30Z"),
          muted: false
        }
      ],
      lastMessage: {
        messageId: "m2",
        senderId: "u1",
        type: "text",
        preview: "Tối nay call nhé?",
        createdAt: new Date("2026-03-21T09:01:00Z")
      },
      createdAt: new Date("2026-03-10T09:00:00Z"),
      updatedAt: new Date("2026-03-21T09:01:00Z")
    },
    {
      _id: "c_group_1",
      type: "group",
      participantsKey: null,
      name: "Team Zolo",
      avatar: "https://cdn.example.com/groups/team-zolo.png",
      createdBy: "u1",
      members: [
        {
          userId: "u1",
          role: "admin",
          joinedAt: new Date("2026-03-11T07:00:00Z"),
          lastReadAt: new Date("2026-03-21T10:00:00Z"),
          muted: false
        },
        {
          userId: "u2",
          role: "member",
          joinedAt: new Date("2026-03-11T07:02:00Z"),
          lastReadAt: new Date("2026-03-21T09:58:00Z"),
          muted: false
        },
        {
          userId: "u3",
          role: "member",
          joinedAt: new Date("2026-03-11T07:05:00Z"),
          lastReadAt: null,
          muted: true
        }
      ],
      lastMessage: {
        messageId: "m5",
        senderId: "u3",
        type: "file",
        preview: "design-v1.pdf",
        createdAt: new Date("2026-03-21T10:05:00Z")
      },
      createdAt: new Date("2026-03-11T07:00:00Z"),
      updatedAt: new Date("2026-03-21T10:05:00Z")
    }
  ],

  messages: [
    {
      _id: "m1",
      conversationId: "c_private_1",
      senderId: "u2",
      content: "Chào John, chiều họp nha",
      type: "text",
      attachments: [],
      replyTo: {
        messageId: null,
        senderId: null,
        snippet: null
      },
      reactions: [
        {
          userId: "u1",
          type: "like",
          createdAt: new Date("2026-03-21T09:00:10Z")
        }
      ],
      edited: false,
      deleted: false,
      createdAt: new Date("2026-03-21T09:00:00Z"),
      updatedAt: new Date("2026-03-21T09:00:00Z")
    },
    {
      _id: "m2",
      conversationId: "c_private_1",
      senderId: "u1",
      content: "Tối nay call nhé?",
      type: "text",
      attachments: [],
      replyTo: {
        messageId: "m1",
        senderId: "u2",
        snippet: "Chào John, chiều họp nha"
      },
      reactions: [],
      edited: false,
      deleted: false,
      createdAt: new Date("2026-03-21T09:01:00Z"),
      updatedAt: new Date("2026-03-21T09:01:00Z")
    },
    {
      _id: "m3",
      conversationId: "c_group_1",
      senderId: "u1",
      content: "Mọi người check tài liệu giúp mình",
      type: "text",
      attachments: [],
      replyTo: {
        messageId: null,
        senderId: null,
        snippet: null
      },
      reactions: [],
      edited: false,
      deleted: false,
      createdAt: new Date("2026-03-21T09:57:00Z"),
      updatedAt: new Date("2026-03-21T09:57:00Z")
    },
    {
      _id: "m4",
      conversationId: "c_group_1",
      senderId: "u2",
      content: null,
      type: "image",
      attachments: [
        {
          url: "https://cdn.example.com/chat/team-zolo/mockup.png",
          fileName: "mockup.png",
          mimeType: "image/png",
          size: 512000,
          width: 1280,
          height: 720
        }
      ],
      replyTo: {
        messageId: "m3",
        senderId: "u1",
        snippet: "Mọi người check tài liệu giúp mình"
      },
      reactions: [
        {
          userId: "u3",
          type: "wow",
          createdAt: new Date("2026-03-21T10:01:00Z")
        }
      ],
      edited: false,
      deleted: false,
      createdAt: new Date("2026-03-21T10:00:00Z"),
      updatedAt: new Date("2026-03-21T10:00:00Z")
    },
    {
      _id: "m5",
      conversationId: "c_group_1",
      senderId: "u3",
      content: "Mình gửi file PDF ở đây",
      type: "file",
      attachments: [
        {
          url: "https://cdn.example.com/chat/team-zolo/design-v1.pdf",
          fileName: "design-v1.pdf",
          mimeType: "application/pdf",
          size: 2457600,
          width: null,
          height: null
        }
      ],
      replyTo: {
        messageId: null,
        senderId: null,
        snippet: null
      },
      reactions: [
        {
          userId: "u1",
          type: "love",
          createdAt: new Date("2026-03-21T10:06:00Z")
        },
        {
          userId: "u2",
          type: "like",
          createdAt: new Date("2026-03-21T10:06:30Z")
        }
      ],
      edited: false,
      deleted: false,
      createdAt: new Date("2026-03-21T10:05:00Z"),
      updatedAt: new Date("2026-03-21T10:05:00Z")
    }
  ],

  friendRequests: [
    {
      _id: "f1",
      fromUserId: "u1",
      toUserId: "u3",
      status: "pending",
      createdAt: new Date("2026-03-20T13:00:00Z")
    }
  ],

  presence: [
    {
      _id: "p1",
      userId: "u1",
      online: true,
      lastSeen: new Date("2026-03-21T10:06:45Z")
    },
    {
      _id: "p2",
      userId: "u2",
      online: false,
      lastSeen: new Date("2026-03-21T10:02:30Z")
    },
    {
      _id: "p3",
      userId: "u3",
      online: true,
      lastSeen: new Date("2026-03-21T10:06:10Z")
    }
  ]
};

/**
 * =========================
 * 7. QUERY SAMPLES
 * =========================
 */
const QuerySamples = {
  // Count unread messages for one user in one conversation
  countUnread: `
const unreadCount = await Message.countDocuments({
  conversationId,
  createdAt: { $gt: lastReadAt },
  deleted: false
});`,

  // Load latest 20 messages (newest first)
  loadLatestMessages: `
const messages = await Message.find({
  conversationId,
  deleted: false
})
  .sort({ createdAt: -1 })
  .limit(20);`,

  // Load older messages for infinite scroll
  loadMoreMessages: `
const olderMessages = await Message.find({
  conversationId,
  createdAt: { $lt: cursorCreatedAt },
  deleted: false
})
  .sort({ createdAt: -1 })
  .limit(20);`,

  // Mark conversation as read for current user
  markAsRead: `
await Conversation.updateOne(
  {
    _id: conversationId,
    "members.userId": userId
  },
  {
    $set: {
      "members.$.lastReadAt": new Date()
    }
  }
);`,

  // Keep lastMessage in conversation in sync after sending message
  updateLastMessageAfterSend: `
await Conversation.updateOne(
  { _id: conversationId },
  {
    $set: {
      lastMessage: {
        messageId: newMessage._id,
        senderId: newMessage.senderId,
        type: newMessage.type,
        preview: newMessage.content || (newMessage.attachments?.[0]?.fileName || "Attachment"),
        createdAt: newMessage.createdAt
      },
      updatedAt: new Date()
    }
  }
);`
};

module.exports = {
  User,
  Conversation,
  Message,
  FriendRequest,
  Presence,
  sampleData,
  QuerySamples
};
