# Tóm tắt tính năng đã triển khai cho App

## Giới thiệu
Ứng dụng đã được mở rộng để hỗ trợ **cấu trúc nhiều phòng chat con (Topics/Channels)** bên trong một nhóm chat, lấy cảm hứng từ Discord.

## Những thay đổi chính đã hoàn thành

### 1. Backend API (`conversationApi.js`)
- Thêm `createGroupConversation`
- Thêm các API quản lý thành viên nhóm: `leaveConversation`, `getConversationMembers`, `updateGroupInfo`
- **Hỗ trợ đầy đủ CRUD cho Topic (phòng chat con)**:
    - `listTopics`
    - `createTopic`
    - `updateTopic`
    - `deleteTopic`

### 2. Message API (`messageApi.js`)
- `getMessages` hỗ trợ truyền `topicId` để lấy tin nhắn theo phòng
- `sendText` hỗ trợ truyền `topicId` làm tham số thứ 4

### 3. Custom Hook (`useMessages.js`)
- Hỗ trợ nhận `topicId` làm tham số thứ 3
- Tự động reload tin nhắn khi `activeTopic` thay đổi

### 4. MainTabScreen.js (Màn hình chính)
- Thêm nút **"+"** ở tab Chats để tạo nhóm mới
- Triển khai `CreateGroupSheet` (modal full-screen) với:
    - Chọn ảnh đại diện nhóm (sử dụng `expo-image-picker` + upload lên Supabase)
    - Nhập tên nhóm
    - Chọn loại nhóm (horizontal chip selector)
    - Nhập mô tả nhóm
    - Chọn nhiều bạn bè để thêm vào nhóm

### 5. InfoPanel.js (Bảng thông tin bên phải)
- Thêm tab **"Kênh"** (chỉ hiển thị khi là nhóm chat)
- Hiển thị danh sách topics với icon phù hợp (`#`, `🔊`, `📋`)
- Tap vào kênh sẽ gọi `onTopicSelect(topic)` và đóng panel

### 6. MessageScreen.js (Màn hình trò chuyện)
- Thêm state `activeTopic`
- Hiển thị thanh kênh hiện tại dưới header (`#tên_kênh · Tên_nhóm`)
- Truyền `topicId` khi gửi tin nhắn

## Kết quả đạt được
- Đã hỗ trợ tạo nhóm chat với avatar, loại nhóm và mô tả
- Đã có hệ thống nhiều phòng chat con (topics) bên trong nhóm
- Có thể chat riêng biệt theo từng phòng
- Giao diện chuyển kênh cơ bản đã hoạt động

---

## ⚠️ Hạn chế & Bug hiện tại

### 1. Bug nghiêm trọng
- **Chưa render được avatar nhóm (Group Avatar)**  
  → Ảnh đại diện nhóm không hiển thị sau khi tạo nhóm (cả trong danh sách nhóm lẫn trong chat).

### 2. Chưa hoàn thiện hiển thị
- **Chưa hiển thị loại kênh (Channel Type)** một cách rõ ràng và đẹp mắt:
    - Kênh hệ thống (System messages): "Người ra vào nhóm", "Nhóm đã được cập nhật",...
    - Chưa phân biệt rõ ràng giữa các loại kênh (text, voice, announcement...)

### 3. Chức năng chưa triển khai
- **Chưa tạo được kênh thoại (Voice Channel)**
- **Chưa hỗ trợ Call thoại nhóm**
- **Chưa hỗ trợ Call video nhóm**
- Chưa có cơ chế phân quyền cho từng kênh (permission per channel)
- Chưa có Category (nhóm kênh: 📚 Học tập, 🎮 Gaming...)

### 4. Các hạn chế khác
- Giao diện chuyển kênh vẫn còn thô (chưa mượt)
- Chưa có loading state và empty state khi chưa có topic nào
- Chưa xử lý tốt trường hợp topic bị xóa trong lúc đang chat

---

## Kế hoạch ưu tiên sắp tới

1. Fix bug hiển thị **avatar nhóm**
2. Cải thiện hiển thị loại kênh và system messages
3. Triển khai **Voice Channel** + Voice Room cơ bản
4. Thêm phân quyền cơ bản cho kênh, có quyền owner và set quyền admin cho người khác không phải owner

---

**Trạng thái hiện tại:**  
Nền tảng multi-channel đã có, nhưng vẫn còn một số bug quan trọng và thiếu các tính năng cốt lõi về voice & permission, nên Vi sẽ cập nhật vào ngày mai =)))
