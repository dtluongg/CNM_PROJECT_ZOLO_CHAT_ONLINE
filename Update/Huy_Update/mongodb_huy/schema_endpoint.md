# Zolo Chat - Schema Preview and Minimum API Plan

Sử dụng thư viện ODM như Mongoose (Node.js). Thư viện này hỗ trợ một tính năng gọi là timestamps. Chỉ cần bật nó lên khi định nghĩa Schema, Mongoose sẽ tự động thêm vào và quản lý song song hai trường createdAt và updatedAt ở database giúp bạn một cách hoàn toàn tự động, bạn không cần phải tự gửi lên nữa.

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

### friendships

Bảng quan hệ bạn bè đã xác nhận.

- `userId1` (luôn lưu ID có giá trị nhỏ hơn vào userId1 và ID lớn hơn vào userId2)
- `userId2` (luôn lưu ID có giá trị nhỏ hơn vào userId1 và ID lớn hơn vào userId2)
- `nickname1` (tên User 2 đặt cho User 1)
- `nickname2` (tên User 1 đặt cho User 2)
- `isBlockedBy` (id của người đã chặn)

### conversations

Lưu cả chat đơn và chat nhóm.

- `type`: `dm | group`
- `name`
- `avatar`
- `createdBy`
- `lastMessageId`
- `lastMessagePreview`
- `lastMessageTime`
- `isLocked`

### conversation_members

Quản lý thành viên cuộc trò chuyện.

- `role`: `owner | admin | member`
- `joinedAt`
- `leftAt`
- `unreadCount`
- `lastReadMessageId`
- `canSendMessages`
- `canInviteMembers`
- `canManageMembers`
- `isArchived`

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

- `messageId`
- `url`
- `fileName`
- `mimeType`
- `fileSize`
- `width`, `height`
- `duration`

### message_reactions

Lưu emoji reaction (thả tim, haha...) theo từng user. Bảng này tách ra để 1 người thả 1 biểu tượng thì không phải Update cái bảng message nặng nề.

- `messageId`
- `userId`
- `emoji`: (Ví dụ: '👍', '❤️', '😂' hoặc text định danh 'like', 'love')

### message_reads

Lưu trạng thái đã đọc theo từng message và user (Dùng để truy vấn ngược cực kỳ chi tiết xem thằng A đã xem tin nhắn này vào đúng mấy giờ - Nếu bạn chỉ cần hiện số chưa đọc căn bản, dùng 'lastReadMessageId' ở bảng member là đủ).

- `messageId`
- `userId`
- `conversationId` (Trường này có thể có để query nhanh cả nhóm mà không cần bóc tách)

### notification_settings

Lưu cấu hình thông báo chi tiết cho user trong từng conversation (chuyên nghiệp hơn việc chỉ xài biến 'muted' True/False giản đơn).

- `userId`
- `conversationId`
- `isMuted`
- `muteUntil`: (Ví dụ tính năng: Tắt thông báo trong 1 giờ / 8 giờ / Đến khi tôi mở lại)
- `mentionConfig`: `all | mentions_only | none` (Có muốn nhận Ting Ting khi bị @ tên không)
- `pushEnabled`: (Cho phép bắn Noti về màn hình khoá điện thoại)

### presence

Bảng chuyên dụng (cập nhật liên tục mỗi vài giây) để hiện đèn xanh lá cây "Đang hoạt động". Không nên lưu cái này vào bảng User vì nhịp độ quét (heartbeat) rất dày làm quá tải DB chính.

- `userId`
- `status`: `online | offline`
- `lastActiveAt`: Cập nhật liên tục khi user chạm vào màn hình.
- `deviceStr`: `web | ios | android` (Dùng để hiện icon điện thoại hay máy tính cạnh nick của họ).

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

- `POST /auth/sync-oauth` (Đồng bộ tài khoản OAuth từ Supabase về Local DB)
- `POST /auth/complete-oauth-profile` (Cập nhật thông tin bổ sung cho tài khoản OAuth mới đăng nhập lần đầu)
- `GET /auth/authme` (Lấy thông tin profile hiện tại của người đang đăng nhập qua Token)
- `PATCH /auth/update-profile` (Chỉnh sửa thông tin cá nhân: avatar, bio, theme...)
- `GET /auth/users/search` (Tìm kiếm người dùng lạ bằng tên, username, email hoặc mã QR)
- `GET /auth/users/:userId/profile` (Xem trang cá nhân của một người dùng bất kỳ)

### Kết nối bạn bè

- `POST /friends/requests` (Gửi lời mời kết bạn đến một người)
- `GET /friends/requests/incoming` (Xem danh sách người khác gửi lời mời đến mình)
- `GET /friends/requests/outgoing` (Xem danh sách lời mời mà mình đã gửi đi chờ người ta duyệt)
- `POST /friends/requests/:id/accept` (Đồng ý lời mời kết bạn)
- `POST /friends/requests/:id/reject` (Từ chối lời mời kết bạn của người khác)
- `DELETE /friends/requests/:id` (Thu hồi lại lời mời kết bạn mình lỡ gửi đi)
- `GET /friends/list` (Lấy danh sách tất cả bạn bè hiện tại)
- `DELETE /friends/:userId` (Hủy kết bạn - Xóa khỏi bảng friendships)
- `PATCH /friends/:userId/nickname` (Đổi biệt danh cho bạn bè để dễ nhớ)
- `POST /friends/:userId/block` (Chặn một người dùng khỏi việc nhắn tin)

### Conversation

- `POST /conversations/dm` (Tạo cuộc hội thoại riêng tư Nhắn tin 1-1 đôi lứa)
- `POST /conversations/group` (Tạo lập nhóm chat mới với nhiều người)
- `GET /conversations` (Lấy danh sách toàn bộ các phòng chat hiển thị bên thanh Sidebar)
- `GET /conversations/:id` (Lấy thông tin chi tiết của một phòng chat cụ thể)
- `PATCH /conversations/:id` (Chỉnh sửa thông tin nhóm: đổi tên nhóm, thay avatar nhóm)
- `DELETE /conversations/:id` (Giải tán nhóm hoặc tự rời khỏi nhóm)

### Membership và group management

- `POST /conversations/:id/members` (Thêm một hoặc nhiều người mới vào nhóm chat)
- `DELETE /conversations/:id/members/:userId` (Đuổi một thành viên ra khỏi nhóm)
- `PATCH /conversations/:id/members/:userId/role` (Bổ nhiệm/Bãi nhiệm chức vụ Trưởng nhóm, Phó nhóm)
- `PATCH /conversations/:id/members/:userId/permissions` (Sửa đổi quyền hạn của mem: được chat không, được mời người không)
- `GET /conversations/:id/members` (Lấy danh sách tất cả các thành viên đang có mặt trong nhóm)

### Messages

- `GET /conversations/:id/messages` (Truy xuất lịch sử tin nhắn của một phòng chat - dùng để kéo lên xem tin nhắn cũ)
- `POST /conversations/:id/messages` (Nhắn một tin mới vào phòng)
- `PATCH /messages/:id` (Chỉnh sửa nội dung một dòng tin nhắn)
- `DELETE /messages/:id` (Xóa vĩnh viễn tin nhắn khỏi máy cả hai phía - hoặc gỡ bỏ tin)
- `POST /messages/:id/revoke` (Thu hồi tin nhắn - Tin sẽ biến thành thông báo "Đã thu hồi tin nhắn này")
- `POST /messages/:id/forward` (Chuyển tiếp tin nhắn này sang cuộc trò chuyện khác)
- `POST /messages/:id/reactions` (Thả cảm xúc Emoji, Haha, Thả tim vào tin nhắn)
- `DELETE /messages/:id/reactions/:reactionId` (Gỡ cái biểu tượng thả tim ra khỏi tin nhắn)
- `POST /messages/:id/read` (Đánh dấu trạng thái là ai: "Đã xem" tin nhắn này)

### Upload và media

- `POST /uploads/file` (Tải lên một tài liệu, file nén hoặc file tĩnh)
- `POST /uploads/image` (Tải lên hình ảnh đơn bọc nén hoặc base64)
- `POST /uploads/video` (Tải lên video đính kèm)

### Presence và notification

- `GET /presence/:userId` (Kiểm tra trạng thái Truy Cập hiện tại của 1 user (đèn sáng hay tắt))
- `POST /presence/heartbeat` (Ping lên Server báo cáo rằng: "Tôi vẫn đang online kìa đừng tắt đèn")
- `PATCH /notification-settings` (Điều chỉnh cấu hình: Tắt Noti phòng này 1 tiếng, nhận Mention Only...)

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
