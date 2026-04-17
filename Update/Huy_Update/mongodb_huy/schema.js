// ══════════════════════════════════════════════════════════════════════════════
//  ZOLO CHAT  —  DBML Schema (dbdiagram.io compatible)
//  Cập nhật: 2026-04-15  |  Phản ánh đúng models thực tế trong backend/src/models/
// ══════════════════════════════════════════════════════════════════════════════

Table users {
  _id             string    [pk, note: 'MongoDB ObjectId']
  supabaseId      string    [unique, note: 'Supabase Auth UID — sparse, nullable cho user local']
  username        string    [unique, note: 'Sparse — user OAuth có thể không có']
  passwordHash    string    [note: 'Local auth only']
  email           string    [unique]
  phone           string    [note: 'Sparse']
  displayName     string
  avatar          string    [note: 'URL']
  bio             string    [default: '']
  status          string    [note: 'online | idle | dnd | invisible']
  statusText      string
  banner          string
  usernameColor   string    [default: '#5865f2']
  themeName       string    [default: 'dark']
  themeColors     json
  isEmailVerified boolean
  isPhoneVerified boolean
  authProvider    string    [note: 'local | google | facebook']
  linkedProviders json      [note: '[{ provider, supabaseId }]']
  createdAt       timestamp
  updatedAt       timestamp
}

Table friend_requests {
  _id          string    [pk]
  fromUserId   string
  toUserId     string
  status       string    [note: 'pending | accepted | rejected | canceled']
  createdAt    timestamp
  respondedAt  timestamp
}

Table friendships {
  _id               string    [pk]
  userId1           string    [note: 'ID nhỏ hơn luôn ở đây để tránh trùng lặp']
  userId2           string    [note: 'ID lớn hơn luôn ở đây']
  nickname1         string    [note: 'Tên User 2 đặt cho User 1']
  nickname2         string    [note: 'Tên User 1 đặt cho User 2']
  isBlockedBy       string    [note: 'ObjectId của người đã chặn | null']
  createdAt         timestamp
  updatedAt         timestamp
}

Table conversations {
  _id                string    [pk]
  type               string    [note: 'dm | group']
  name               string
  avatar             string
  banner             string
  createdBy          string
  lastMessageId      string
  lastMessagePreview string
  lastMessageTime    timestamp
  isArchived         boolean
  isLocked           boolean
  createdAt          timestamp
  updatedAt          timestamp
}

Table conversation_members {
  _id              string    [pk]
  conversationId   string
  userId           string
  role             string    [note: 'owner | admin | member']
  joinedAt         timestamp
  leftAt           timestamp [note: 'null nếu còn trong nhóm']

  // Trạng thái đọc
  unreadCount          int
  lastReadMessageId    string

  // AI Summary — lưu vào DB để persist qua sessions
  aiSummary_summary       string    [note: 'Nội dung tóm tắt']
  aiSummary_summarizedAt  timestamp
  aiSummary_unreadCount   int
  aiSummary_fromMessageId string    [note: 'Tin nhắn ranh giới lúc tóm tắt']

  // Quyền đặc biệt
  canSendMessages  boolean
  canInviteMembers boolean
  canManageMembers boolean

  // Cài đặt cá nhân
  isArchived       boolean
  isDeleted        boolean
  deletedAt        timestamp
  createdAt        timestamp
  updatedAt        timestamp
}

Table messages {
  _id                  string    [pk]
  conversationId       string
  senderId             string    [note: 'null cho system message']
  content              text
  type                 string    [note: 'text | image | file | video | voice | emoji | system']
  replyToMessageId     string
  forwardFromMessageId string
  edited               boolean
  editedAt             timestamp
  deleted              boolean
  deletedAt            timestamp
  deletedBy            json      [note: 'Array<ObjectId> — xóa phía tôi']
  revoked              boolean
  revokedAt            timestamp
  revokedBy            string
  payload              json      [note: 'Metadata mở rộng (attachmentId, url, v.v.)']
  createdAt            timestamp
  updatedAt            timestamp
}

Table attachments {
  _id        string    [pk]
  url        string
  publicId   string
  fileName   string
  mimeType   string
  fileSize   int
  width      int
  height     int
  duration   int
  createdAt  timestamp
}

Table message_reactions {
  _id          string    [pk]
  messageId    string
  userId       string
  reactionType string    [note: 'Ref đến reaction_types._id']
  createdAt    timestamp
}

Table reaction_types {
  _id    string [pk]
  name   string [note: 'like | love | haha | wow | sad | angry']
  emoji  string
}

Table message_reads {
  _id            string    [pk]
  messageId      string
  userId         string
  conversationId string
  readAt         timestamp
}

Table notification_settings {
  _id            string    [pk]
  userId         string
  conversationId string
  muted          boolean
  pushEnabled    boolean
  mentionOnly    boolean
  createdAt      timestamp
  updatedAt      timestamp
}

Table notifications {
  _id        string    [pk]
  userId     string
  type       string    [note: 'friend_request | message | system | ...']
  title      string
  body       string
  data       json
  isRead     boolean
  createdAt  timestamp
}

Table presence {
  userId         string    [pk]
  online         boolean
  lastSeen       timestamp
  devicePlatform string    [note: 'web | mobile']
}

Table calls {
  _id            string    [pk]
  conversationId string    [note: 'null nếu gọi không qua conversation']
  callerId       string
  calleeId       string
  type           string    [note: 'audio | video']
  status         string    [note: 'calling | ongoing | ended | missed | rejected | busy']
  startedAt      timestamp [note: 'null nếu không được nhấc']
  endedAt        timestamp
  duration       int       [note: 'giây — 0 nếu chưa kết nối']
  endedBy        string
  createdAt      timestamp
  updatedAt      timestamp
}

Table otps {
  _id       string    [pk]
  userId    string
  email     string
  code      string
  type      string    [note: 'email_verify | phone_verify | reset_password']
  expiresAt timestamp
  used      boolean
  createdAt timestamp
}

// ── Refs ─────────────────────────────────────────────────────────────────────

Ref: friend_requests.fromUserId > users._id
Ref: friend_requests.toUserId   > users._id

Ref: friendships.userId1 > users._id
Ref: friendships.userId2 > users._id

Ref: conversations.createdBy      > users._id
Ref: conversations.lastMessageId  > messages._id

Ref: conversation_members.conversationId    > conversations._id
Ref: conversation_members.userId            > users._id
Ref: conversation_members.lastReadMessageId > messages._id

Ref: messages.conversationId       > conversations._id
Ref: messages.senderId             > users._id
Ref: messages.replyToMessageId     > messages._id
Ref: messages.forwardFromMessageId > messages._id
Ref: messages.revokedBy            > users._id

Ref: message_reactions.messageId    > messages._id
Ref: message_reactions.userId       > users._id
Ref: message_reactions.reactionType > reaction_types._id

Ref: message_reads.messageId    > messages._id
Ref: message_reads.userId       > users._id

Ref: notification_settings.userId         > users._id
Ref: notification_settings.conversationId > conversations._id

Ref: notifications.userId > users._id

Ref: presence.userId > users._id

Ref: calls.conversationId > conversations._id
Ref: calls.callerId       > users._id
Ref: calls.calleeId       > users._id
Ref: calls.endedBy        > users._id

Ref: otps.userId > users._id
