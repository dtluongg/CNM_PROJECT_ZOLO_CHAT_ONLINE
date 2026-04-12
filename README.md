# Zolo Chat - Backend Progress Report


---

## Tổng quan


- Web (build bằng Vite)
- Mobile (React Native - Expo Go Android)

Hiện tại các chức năng chính đã hoạt động ổn định trên cả hai nền tảng.

---

## Những chức năng mình đã hoàn thành

### 1. Hệ thống tin nhắn

- Gửi tin nhắn văn bản
- Trả lời tin nhắn 
- Chỉnh sửa tin nhắn
- Thu hồi tin nhắn 
- Xóa tin nhắn phía người dùng 
- Trạng thái người dùng

Đã áp dụng optimistic UI để tăng trải nghiệm người dùng (hiển thị ngay khi gửi).

---

### 2. Voice Message (ghi âm)

- Ghi âm trực tiếp bằng MediaRecorder
- Tự động xử lý format theo trình duyệt
- Upload và tạo message
- Hiển thị thời lượng

Đã test ổn định trên web và mobile.

---

### 3. Upload file và hình ảnh

- Upload qua multipart/form-data
- Dùng chung uploadService
- Lưu metadata vào Attachment model
- Tự động gắn với message

File được lưu trên AWS S3 và sử dụng CloudFront để tăng tốc độ tải.

---

### 4. Realtime (Socket)

Đã triển khai:

- Nhận tin nhắn realtime
- Typing indicator
- Reaction realtime
- Thu hồi / chỉnh sửa message realtime
- Trạng thái đã xem

---

### 5. Reaction (thả cảm xúc)

- Lấy danh sách emoji từ server
- Toggle reaction
- Đồng bộ realtime

---

### 6. Conversation

- Lấy danh sách cuộc trò chuyện
- Tạo chat 1-1 (DM)
- Cập nhật tin nhắn cuối
- Phân trang bằng cursor

---

### 7. Trạng thái người dùng

- Online / Offline
- Last seen
- Hiển thị realtime

---

### 8. Media & Attachments

Hiện tại đã hoàn thiện:

- Lấy danh sách ảnh và file trong conversation
- Hiển thị đầy đủ trên:
    - Web (Vite)
    - Mobile (Expo Go Android)
- Hỗ trợ preview ảnh và mở file

---

### 9. Các chức năng bổ sung

- Forward tin nhắn
- Mark as read
- Delete for me

---

## Những vấn đề đã xử lý

### Upload file trên React Native

Gặp lỗi Network Error khi upload.

Nguyên nhân:

- Axios không xử lý đúng FormData trên React Native

Giải pháp:

- Override transformRequest
- Set Content-Type phù hợp

Hiện tại đã hoạt động ổn định.

---

### Hiển thị media trên mobile

Trước đây mobile chưa hiển thị được attachments.

Hiện tại đã fix:

- Gọi đúng API getAttachments
- Xử lý data phù hợp với UI mobile
- Hiển thị được danh sách ảnh và file

---

### Tối ưu hiệu năng

- Dùng cursor-based pagination
- Tránh load toàn bộ tin nhắn
- Lazy load khi cần

---

## Tình trạng hiện tại

- Web (Vite): hoạt động ổn định
- Mobile (Expo Go):
    - Chat realtime ổn định
    - Upload file/voice/image hoạt động tốt
    - Đã hiển thị được media (attachments)

---

## Hướng phát triển tiếp theo

- Tối ưu upload file dung lượng lớn
- Cải thiện UI/UX
- Thêm tính năng cho group chat
- Tăng độ ổn định khi mạng yếu

---

## Ghi chú

---

## Người thực hiện

Ng Vi

---