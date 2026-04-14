# Zolo Chat — API Endpoint Reference

> Cập nhật: 2026-04-15 | Phản ánh đúng routes thực tế trong `backend/src/routes/`
> Base URL: `http://localhost:2026/api`
> Auth: `Authorization: Bearer <token>` (trừ khi ghi chú [Public])

---

## 1. Auth (`/auth`)

| Method | Endpoint                     | Ghi chú                                          |
|--------|------------------------------|--------------------------------------------------|
| POST   | `/auth/signup`               | [Public] Đăng ký tài khoản local                |
| POST   | `/auth/signin`               | [Public] Đăng nhập local                        |
| POST   | `/auth/signout`              | [Public] Đăng xuất                              |
| POST   | `/auth/refreshme`            | [Public] Lấy access token mới bằng refresh token |
| GET    | `/auth/authme`               | 🔒 Lấy thông tin user đang đăng nhập            |
| POST   | `/auth/change-password`      | 🔒 (localToken) Đổi mật khẩu                    |
| POST   | `/auth/forgot-password`      | [Public] Gửi email reset mật khẩu               |
| POST   | `/auth/reset-password`       | [Public] Đặt lại mật khẩu bằng token            |
| POST   | `/auth/sync-oauth`           | [Public] Đồng bộ tài khoản Google/Facebook từ Supabase |
| POST   | `/auth/complete-oauth-profile` | [Public] Hoàn thiện profile OAuth lần đầu     |
| POST   | `/auth/send-email-otp`       | [Public] Gửi OTP email                          |
| POST   | `/auth/verify-email-otp`     | [Public] Xác minh OTP email                     |
| POST   | `/auth/send-phone-otp`       | [Public] Gửi OTP SMS                            |
| POST   | `/auth/verify-phone-otp`     | 🔒 Xác minh OTP điện thoại                      |
| GET    | `/auth/sms-balance`          | 🔒 Xem số dư SMS Twilio (dev)                   |

---

## 2. User (`/users`)

| Method | Endpoint                     | Ghi chú                                          |
|--------|------------------------------|--------------------------------------------------|
| PATCH  | `/users/update-profile`      | 🔒 Cập nhật profile: avatar, bio, banner, theme… |
| GET    | `/users/search?q=`           | 🔒 Tìm kiếm user theo displayName / username / email |
| GET    | `/users/:userId/profile`     | 🔒 Xem hồ sơ công khai của user bất kỳ          |

---

## 3. Friends (`/friends`)

| Method | Endpoint                         | Ghi chú                                      |
|--------|----------------------------------|----------------------------------------------|
| GET    | `/friends/list`                  | 🔒 Danh sách bạn bè hiện tại                 |
| GET    | `/friends/blocked`               | 🔒 Danh sách người đã chặn                   |
| POST   | `/friends/requests`              | 🔒 Gửi lời mời kết bạn                       |
| GET    | `/friends/requests/incoming`     | 🔒 Lời mời người khác gửi đến mình           |
| GET    | `/friends/requests/outgoing`     | 🔒 Lời mời mình đã gửi đi                    |
| POST   | `/friends/requests/:id/accept`   | 🔒 Chấp nhận lời mời                         |
| POST   | `/friends/requests/:id/reject`   | 🔒 Từ chối lời mời                           |
| DELETE | `/friends/requests/:id`          | 🔒 Thu hồi lời mời mình đã gửi               |
| GET    | `/friends/:userId/status`        | 🔒 Kiểm tra quan hệ với user (friend/blocked/…) |
| PATCH  | `/friends/:userId/nickname`      | 🔒 Đặt biệt danh cho bạn bè                  |
| POST   | `/friends/:userId/block`         | 🔒 Chặn / bỏ chặn người dùng (toggle)        |
| DELETE | `/friends/:userId`               | 🔒 Hủy kết bạn                               |

---

## 4. Conversations (`/conversations`)

| Method | Endpoint                              | Ghi chú                                           |
|--------|---------------------------------------|---------------------------------------------------|
| POST   | `/conversations/dm`                   | 🔒 Tạo DM (chat 1-1) với user khác               |
| POST   | `/conversations/group`                | 🔒 Tạo nhóm chat                                 |
| GET    | `/conversations`                      | 🔒 Danh sách conversation của user (có `myMembership`) |
| GET    | `/conversations/:id`                  | 🔒 Chi tiết 1 conversation                        |
| PATCH  | `/conversations/:id`                  | 🔒 Cập nhật thông tin nhóm (name, avatar)         |
| PATCH  | `/conversations/:id/lock`             | 🔒 Khóa / mở khóa nhóm                           |
| PATCH  | `/conversations/:id/archive`          | 🔒 Lưu trữ / bỏ lưu trữ (phía cá nhân)           |
| DELETE | `/conversations/:id`                  | 🔒 Xóa cuộc trò chuyện phía tôi                  |
| GET    | `/conversations/:id/members`          | 🔒 Danh sách thành viên (query: includeLeft=true)  |
| POST   | `/conversations/:id/members`          | 🔒 Thêm thành viên vào nhóm                       |
| POST   | `/conversations/:id/leave`            | 🔒 Tự rời nhóm                                    |
| POST   | `/conversations/:id/disband`          | 🔒 Owner giải tán nhóm                            |
| DELETE | `/conversations/:id/members/:userId`  | 🔒 Kick thành viên                                |
| PATCH  | `/conversations/:id/transfer-owner`   | 🔒 Owner chuyển quyền owner                       |
| PATCH  | `/conversations/:id/members/:userId/role` | 🔒 Cập nhật role + quyền đặc biệt của member |

---

## 5. Messages (`/messages`)

| Method | Endpoint                                      | Ghi chú                                      |
|--------|-----------------------------------------------|----------------------------------------------|
| GET    | `/messages/:conversationId`                   | 🔒 Lấy tin nhắn (query: limit, before)       |
| POST   | `/messages/:conversationId`                   | 🔒 Gửi tin nhắn mới                          |
| GET    | `/messages/:conversationId/attachments`       | 🔒 Lấy ảnh & file đã chia sẻ trong conversation |
| POST   | `/messages/:conversationId/read/:messageId`   | 🔒 Đánh dấu đã đọc đến messageId             |
| POST   | `/messages/:conversationId/aiSummary`         | 🔒 Tóm tắt tin nhắn chưa đọc bằng AI (body: `{ fromMessageId }`) |
| PATCH  | `/messages/:messageId`                        | 🔒 Chỉnh sửa nội dung tin nhắn               |
| PATCH  | `/messages/:messageId/revoke`                 | 🔒 Thu hồi tin nhắn (2 chiều)                |
| PATCH  | `/messages/:messageId/delete-for-me`          | 🔒 Xóa tin nhắn phía tôi                     |

---

## 6. Reactions (`/reactions`)

| Method | Endpoint                  | Ghi chú                                           |
|--------|---------------------------|---------------------------------------------------|
| GET    | `/reactions/types`        | [Public] Danh sách emoji có sẵn                  |
| POST   | `/reactions/:messageId`   | 🔒 Thả / hủy reaction (toggle) — body: `{ emoji }` |
| GET    | `/reactions/:messageId`   | 🔒 Xem danh sách người đã react một tin nhắn      |

---

## 7. Uploads (`/uploads`)

| Method | Endpoint          | Ghi chú                                                   |
|--------|-------------------|-----------------------------------------------------------|
| POST   | `/uploads/image`  | 🔒 Upload ảnh (≤10MB) — multipart `field: "file"`         |
| POST   | `/uploads/file`   | 🔒 Upload tài liệu (≤50MB) — multipart `field: "file"`    |
| POST   | `/uploads/video`  | 🔒 Upload video (≤100MB) — multipart `field: "file"`      |

Response: `{ file: { url, fileName, mimeType, fileSize, ... } }`

---

## 8. Voice (`/voice`)

| Method | Endpoint         | Ghi chú                                     |
|--------|------------------|---------------------------------------------|
| POST   | `/voice/upload`  | 🔒 Upload file ghi âm — multipart `field: "file"` |

---

## 9. Calls (`/calls`)

> WebRTC signaling chạy qua Socket.io. REST chỉ dùng để lưu lịch sử.

| Method | Endpoint                            | Ghi chú                            |
|--------|-------------------------------------|------------------------------------|
| POST   | `/calls/initiate`                   | 🔒 Bắt đầu cuộc gọi               |
| POST   | `/calls/:callId/answer`             | 🔒 Nhấc máy                        |
| POST   | `/calls/:callId/reject`             | 🔒 Từ chối cuộc gọi               |
| POST   | `/calls/:callId/end`                | 🔒 Kết thúc cuộc gọi              |
| GET    | `/calls/history`                    | 🔒 Lịch sử cuộc gọi               |

---

## 10. Notifications (`/notifications`)

| Method | Endpoint                        | Ghi chú                                  |
|--------|---------------------------------|------------------------------------------|
| GET    | `/notifications`                | 🔒 Danh sách thông báo của user hiện tại |
| PATCH  | `/notifications/:id/read`       | 🔒 Đánh dấu đã đọc 1 thông báo          |
| PATCH  | `/notifications/read-all`       | 🔒 Đánh dấu đọc tất cả                  |

---

## 11. Presence (chạy qua Socket.io)

| Socket event         | Chiều          | Ghi chú                                    |
|----------------------|----------------|--------------------------------------------|
| `presence:heartbeat` | Client → Server | Báo hiệu user vẫn online                 |
| `presence:update`    | Server → Client | Broadcast khi trạng thái user thay đổi   |

---

## Schema tóm tắt — `myMembership` (đính kèm mỗi conversation trong GET /conversations)

```json
{
  "myMembership": {
    "role": "member",
    "unreadCount": 3,
    "lastReadMessageId": "ObjectId",
    "canSendMessages": true,
    "canInviteMembers": true,
    "canManageMembers": false,
    "isArchived": false,
    "aiSummary": {
      "summary": "Nội dung tóm tắt...",
      "summarizedAt": "ISO Date",
      "unreadCount": 3,
      "fromMessageId": "ObjectId"
    }
  }
}
```

---

## Socket.io Events (chat)

| Event                  | Chiều          | Payload                                     |
|------------------------|----------------|---------------------------------------------|
| `chat:join`            | Client → Server | `{ conversationId }`                       |
| `chat:leave`           | Client → Server | `{ conversationId }`                       |
| `chat:new-message`     | Server → Client | `{ conversationId, message }`              |
| `chat:typing`          | Client → Server | `{ conversationId }`                       |
| `chat:stop-typing`     | Client → Server | `{ conversationId }`                       |
| `chat:typing`          | Server → Client | `{ conversationId, userId, displayName }`  |
| `chat:stop-typing`     | Server → Client | `{ conversationId, userId }`               |
| `chat:reaction`        | Server → Client | `{ messageId, reactions }`                 |
| `chat:message-revoked` | Server → Client | `{ messageId }`                            |
| `chat:message-edited`  | Server → Client | `{ message }`                              |
| `chat:read`            | Server → Client | `{ conversationId, userId, messageId }`    |
| `chat:unread-reset`    | Server → Client | `{ conversationId }`                       |
