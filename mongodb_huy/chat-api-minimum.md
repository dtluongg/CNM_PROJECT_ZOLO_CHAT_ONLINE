# Zolo Chat - Schema Preview and Minimum API Plan

Tài liệu này là bản xem trước trước khi viết code thật. Mục tiêu là chốt:

1. Schema dữ liệu nào cần có để khớp với auth local + Supabase hiện tại.
2. Bộ API tối thiểu để đáp ứng yêu cầu tuần 2 và tuần 3.

## 1. Schema user nên giữ theo project hiện tại

User hiện tại không còn là bảng đơn giản kiểu `username / email / avatar` nữa. Nó cần phản ánh đúng luồng local auth + OAuth Supabase đang có trong backend và frontend.

Các field nên giữ:

- `_id`: MongoDB ObjectId
- `supabaseId`: id từ Supabase Auth, dùng để map tài khoản OAuth
- `username`: chỉ dùng cho tài khoản local, có thể rỗng với OAuth
- `passwordHash`: chỉ dùng cho local auth
- `email`: bắt buộc, unique
- `phone`: tùy chọn
- `displayName`: tên hiển thị
- `avatar`: ảnh đại diện
- `bio`: giới thiệu ngắn
- `status`: `online | idle | dnd | invisible`
- `statusText`: trạng thái tuỳ biến
- `banner`: ảnh bìa
- `usernameColor`: màu tên hiển thị
- `themeName`: tên theme
- `themeColors`: màu custom
- `isEmailVerified`
- `isPhoneVerified`
- `authProvider`: `local | google | facebook`
- `linkedProviders`: danh sách provider đã link
- `createdAt`, `updatedAt`

Điểm quan trọng: đây là phần user đang được frontend dùng thật, không phải field trang trí. Ví dụ `displayName`, `avatar`, `banner`, `statusText`, `usernameColor`, `themeName`, `themeColors` đều đang được đọc ở UI và API auth hiện tại.

## 2. Các bảng dữ liệu cần có cho chat

### users

Lưu thông tin tài khoản và profile.

### friend_requests

Dùng để thiết lập kết nối trước khi chat đơn.

- `fromUserId`
- `toUserId`
- `status`: `pending | accepted | rejected | canceled`
- `createdAt`
- `respondedAt`

### friendships

Bảng quan hệ bạn bè đã xác nhận. Nếu muốn đơn giản hơn thì có thể dùng bảng này thay vì truy vấn trực tiếp từ friend_requests.

### conversations

Lưu cả chat đơn và chat nhóm.

- `type`: `dm | group`
- `name`
- `avatar`
- `banner`
- `createdBy`
- `lastMessageId`
- `lastMessagePreview`
- `lastMessageTime`
- `isArchived`
- `isLocked`

### conversation_members

Quản lý thành viên cuộc trò chuyện.

- `role`: `owner | admin | member`
- `joinedAt`
- `leftAt`
- `unreadCount`
- `lastReadMessageId`
- `muted`
- `canSendMessages`
- `canInviteMembers`
- `canManageMembers`

### messages

Bảng trung tâm của hệ chat.

- `conversationId`
- `senderId`
- `content`
- `type`: `text | image | file | video | emoji | system`
- `replyToMessageId`
- `forwardFromMessageId`
- `edited`, `editedAt`
- `deleted`, `deletedAt`, `deletedBy`
- `revoked`, `revokedAt`, `revokedBy`
- `payload`

### message_attachments

Dùng cho file, ảnh, video, nhiều attachment trên một message.

- `url`
- `fileName`
- `mimeType`
- `fileSize`
- `width`, `height`
- `duration`

### message_reactions

Lưu emoji reaction theo user.

### message_reads

Lưu trạng thái đã đọc theo từng message và user.

### notification_settings

Lưu cấu hình mute / push / mention cho user trong từng conversation.

### presence

Lưu trạng thái online/offline và last seen cho web/app.

## 3. Đánh giá mức độ đáp ứng yêu cầu tuần 2

Mức dữ liệu hiện tại là đủ để triển khai các chức năng cơ bản:

- Thiết lập kết nối trước khi chat: cần `friend_requests` và/hoặc `friendships`
- Chat text: `messages.type = text`
- Gửi file: `messages` + `message_attachments`
- Emoji / reaction: `message_reactions`
- Thu hồi tin nhắn: `messages.revoked`
- Xóa tin nhắn: `messages.deleted`
- Chuyển tin nhắn: `messages.forwardFromMessageId`
- Hiện thực web và app: schema dùng chung, chỉ khác client

Kết luận cho tuần 2: schema này đạt phần dữ liệu. Phần còn thiếu nằm ở API và UI thực thi.

## 4. Đánh giá mức độ đáp ứng yêu cầu tuần 3

Mức dữ liệu hiện tại cũng đủ để làm chat nhóm và quản lý nhóm:

- Tạo nhóm: `conversations.type = group`
- Thêm thành viên: `conversation_members`
- Xóa thành viên: `leftAt` hoặc trạng thái thành viên
- Giải tán nhóm: `isLocked` hoặc soft delete conversation
- Gán quyền: `role`, `canInviteMembers`, `canManageMembers`, `canSendMessages`
- Chat text / file / emoji / thu hồi / xóa / chuyển tin nhắn: như tuần 2
- Gửi ảnh, video có hiển thị: `message_attachments` + `messages.type`

Kết luận cho tuần 3: schema này đủ để triển khai, nhưng chưa tự động có chức năng nếu chưa viết API và xử lý client.

## 5. Minimum API cần có

### Auth và profile

- `POST /auth/sync-oauth`
- `POST /auth/complete-oauth-profile`
- `GET /auth/authme`
- `PATCH /auth/update-profile`
- `GET /auth/users/search`
- `GET /auth/users/:userId/profile`

### Kết nối bạn bè

- `POST /friends/requests`
- `GET /friends/requests/incoming`
- `GET /friends/requests/outgoing`
- `POST /friends/requests/:id/accept`
- `POST /friends/requests/:id/reject`
- `DELETE /friends/requests/:id`
- `GET /friends/list`

### Conversation

- `POST /conversations/dm`
- `POST /conversations/group`
- `GET /conversations`
- `GET /conversations/:id`
- `PATCH /conversations/:id`
- `DELETE /conversations/:id`

### Membership và group management

- `POST /conversations/:id/members`
- `DELETE /conversations/:id/members/:userId`
- `PATCH /conversations/:id/members/:userId/role`
- `PATCH /conversations/:id/members/:userId/permissions`
- `GET /conversations/:id/members`

### Messages

- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`
- `PATCH /messages/:id`
- `DELETE /messages/:id`
- `POST /messages/:id/revoke`
- `POST /messages/:id/forward`
- `POST /messages/:id/reactions`
- `DELETE /messages/:id/reactions/:reactionId`
- `POST /messages/:id/read`

### Upload và media

- `POST /uploads/file`
- `POST /uploads/image`
- `POST /uploads/video`

### Presence và notification

- `GET /presence/:userId`
- `POST /presence/heartbeat`
- `PATCH /notification-settings`

## 6. Những chỗ còn phải code thêm dù schema đã đủ

- Logic tạo cuộc trò chuyện đơn khi hai user đã kết nối
- Đồng bộ unread count và last read message
- Xử lý revoke/delete khác nhau giữa người gửi và admin
- Upload file lên storage thật và trả metadata attachment
- WebSocket hoặc polling để realtime message/presence
- Đồng bộ Web và App dùng chung contract API

## 7. Gợi ý chốt phạm vi để làm bài

Nếu ưu tiên đúng rubric, nên chốt theo thứ tự:

1. Đăng nhập và profile hoạt động ổn định.
2. Friend request / dm chat / group chat tối thiểu.
3. Text, file, emoji, revoke, delete, forward.
4. Group management cơ bản: tạo nhóm, thêm/xóa member, role.
5. Nếu còn thời gian thì làm tính năng cộng điểm thưởng: ảnh nhóm, video preview, call video, import danh bạ.

Nếu bạn đồng ý bản nháp này, bước tiếp theo tôi sẽ viết Mongoose models và API minimum theo đúng schema này.