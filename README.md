Zolo Chat - Backend
 Tính năng đã hoàn thiện
   Quản lý Tin nhắn (Messages)
            Gửi tin nhắn văn bản (text)
            Gửi tin nhắn thoại (Voice Message)
            Gửi hình ảnh (image)
            Gửi file đính kèm (file)
            Trả lời tin nhắn (Reply)
🎙 Voice Message (Ghi âm trực tiếp)
      Ghi âm trực tiếp từ microphone qua MediaRecorder
      Hỗ trợ đa định dạng theo từng trình duyệt:
      Chrome/Edge: audio/webm;codecs=opus (.webm)
      Firefox: audio/ogg;codecs=opus (.ogg)
      Safari: audio/mp4 (.m4a)
      Fallback: .wav, .mp3, .aac, .flac...
    Status realtime qua socket
Giới hạn tối đa 25MB
Lưu trữ trên AWS S3 + CloudFront (CDN)
Lưu metadata vào Attachment model (tách biệt với Message)
Hiển thị thời lượng (duration)

      Upload File & Hình ảnh
Upload file và ảnh qua multipart/form-data
Tái sử dụng uploadService chung (không duplicate code)
Lưu metadata vào Attachment model
Tự động gán messageId khi gửi tin nhắn thành công

Conversation
Lấy danh sách tin nhắn (cursor-based pagination)
Lấy danh sách ảnh & file đã gửi trong cuộc trò chuyện / Ở web thì hiển thị đc nhưng mobile chưa hiển thị đc danh sách đã upload
Cập nhật preview tin nhắn cuối cùng
------
## Mobile chạy trên expo go andoird và web expo
----LOGS Vi đang gặp:
Hết
