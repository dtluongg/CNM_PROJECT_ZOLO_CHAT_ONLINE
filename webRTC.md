# WebRTC Audio/Video Call — Lý thuyết lỗi & Lưu ý

## Bối cảnh

Cuộc gọi web ↔ mobile **đổ chuông và nghe máy được** nhưng **không có âm thanh/video**.  
WebRTC hoàn thành signaling (offer/answer/ICE exchange) nhưng **P2P media stream không thiết lập được**.

---

## 1. ICE Candidate Race Condition

### Lý thuyết

WebRTC bắt đầu **gather ICE candidates ngay sau khi `setLocalDescription()` hoàn thành**, không chờ bất kỳ điều kiện nào khác. Đây là hành vi của WebRTC engine, không thể can thiệp.

Trong kiến trúc này, `callId` do **server tạo ra và trả về qua ack** — tức là luôn đến **sau** khi ICE candidates đã được generate. Khoảng thời gian trống này (từ lúc ICE sinh ra đến lúc `callId` về) khiến candidates bị bỏ mất vì không có `callId` để gắn vào khi emit lên server.

Vấn đề xảy ra ở **cả caller lẫn callee**:
- **Caller**: `callId` chỉ có sau khi server ack `call:initiate`
- **Callee**: `callId` đã có (từ `call:incoming`), nhưng code gốc gọi `setCallId()` sau `createAnswer()` thay vì trước — ICE bắt đầu generate trong `createAnswer`, lúc đó `callIdRef` vẫn null

### Lưu ý

> ICE candidates là **thứ duy nhất** cho phép 2 peer tìm thấy nhau trên mạng. Mất dù chỉ **một vài candidates quan trọng** (đặc biệt srflx — server reflexive, loại xuyên NAT) là đủ để P2P thất bại hoàn toàn. Không có lỗi nào được throw ra — kết nối chỉ đơn giản timeout sau 30 giây.

---

## 2. Stale Closure trong Socket Handler

### Lý thuyết

Socket handlers được đăng ký **một lần duy nhất** trong `useEffect`. Tại thời điểm đó, mọi biến state (như `callType`) đều có giá trị **tại thời điểm đăng ký**, không phải giá trị hiện tại.

Khi `call:answered` được emit từ server (có thể vài giây sau), handler vẫn dùng `callType = null` vì closure đã capture giá trị cũ. Gọi `InCallManager.start({ media: null })` không có tác dụng gì, dẫn đến audio session không được khởi động đúng.

### Lưu ý

> Đây là một trong những lỗi phổ biến nhất với React + Socket.io. **Luôn dùng `ref` thay vì `state` bên trong socket handlers** cho bất kỳ giá trị nào cần được đọc sau khi handler đã đăng ký. State chỉ dùng để trigger re-render, không dùng để đọc trong closure bất đồng bộ.

---

## 3. InCallManager Timing

### Lý thuyết

`InCallManager` cần thời gian để **khởi tạo audio session** trên iOS/Android. Gọi `setForceSpeakerphoneOn()` ngay sau `start()` là gọi khi audio session chưa sẵn sàng — lệnh bị bỏ qua hoàn toàn mà không có lỗi.

Ngoài ra, khi caller nhận `call:answered`, audio session đã được start từ trước (trong `initiateCall`) nhưng chưa có remote stream. Cần **restart** để audio session nhận diện đúng media type và routing sau khi kết nối P2P thực sự thiết lập.

### Lưu ý

> Native audio session trên mobile **không phải là thứ có thể config ngay lập tức**. Cần ít nhất 300-500ms sau `start()` trước khi các lệnh routing có hiệu lực. Đây là giới hạn của OS, không phải của thư viện.

---

## 4. Browser Autoplay Policy

### Lý thuyết

Trình duyệt hiện đại **chặn autoplay audio** nếu người dùng chưa có tương tác với trang. Thuộc tính `autoPlay` trên thẻ `<audio>` **không đảm bảo** audio sẽ phát — nó chỉ là gợi ý cho browser.

Khi `srcObject` được gán vào element có `autoPlay`, browser vẫn có thể quyết định không phát nếu trang chưa đủ điều kiện "user activation". Gọi `.play()` thủ công sau khi gán `srcObject` là cách duy nhất để đảm bảo audio phát và nhận được lỗi cụ thể nếu bị chặn.

### Lưu ý

> Người dùng **đã bấm nút gọi** — đó là user gesture. Nhưng gesture đó xảy ra ở một component khác, không phải ở component render `<audio>`. Browser không nhất thiết transfer "activation" sang component render sau đó. Luôn gọi `.play()` thủ công trong `useEffect` khi `remoteStream` thay đổi.

---

## 5. HTTPS bắt buộc cho WebRTC

### Lý thuyết

WebRTC API (`getUserMedia`, `RTCPeerConnection`) chỉ hoạt động trong **Secure Context** — HTTPS hoặc `localhost`. Khi web được truy cập qua IP LAN (`192.168.x.x`) mà chỉ chạy HTTP, browser coi đây là insecure context và **silently block** các WebRTC API.

Camera và microphone có thể vẫn được cấp quyền (permission dialog hoạt động riêng), nhưng ICE gathering và media track sẽ không hoạt động đúng.

### Lưu ý

> `localhost` là ngoại lệ duy nhất — luôn được coi là secure context dù không có HTTPS. Nhưng ngay khi truy cập qua **bất kỳ IP nào khác**, HTTPS là bắt buộc. Trong môi trường dev, self-signed certificate là đủ — chỉ cần bấm "Proceed anyway" khi browser cảnh báo.

---

## 6. Socket URL phải là IP LAN khi test cross-device

### Lý thuyết

Backend là **signaling server trung gian** — relay ICE candidates giữa web và mobile thông qua socket rooms. Nếu web kết nối socket tới `localhost:2026` thay vì `192.168.x.x:2026`, web chỉ kết nối được từ chính máy tính đó, không phải qua mạng LAN.

Kết quả: web và mobile tuy cùng một server vật lý nhưng có thể không chia sẻ cùng socket room, khiến ICE candidates không được relay đúng chiều.

### Lưu ý

> Luôn dùng **IP LAN thực** cho mọi kết nối khi test cross-device. `localhost` chỉ dùng khi cả 2 bên chạy trên cùng một máy. Đặt vào `.env` và kiểm tra kỹ fallback value — một `|| 'http://localhost:2026'` vô tình có thể phá toàn bộ cross-device flow.

---

## 7. RTCView với streamURL rỗng

### Lý thuyết

`RTCView` của `react-native-webrtc` không báo lỗi khi nhận `streamURL=""`. Nó chỉ render một view trống. `toURL()` có thể trả về chuỗi rỗng trong khoảng thời gian ngắn sau khi `ontrack` được gọi nhưng trước khi stream được fully initialized bởi native engine.

Code kiểm tra `remoteStream.toURL ? remoteStream.toURL() : ''` chỉ check hàm có tồn tại không, không check kết quả trả về — nên vẫn có thể truyền `""` vào.

### Lưu ý

> Khác với web `<video>` có thể gán `srcObject` bất cứ lúc nào và tự update, `RTCView` cần `streamURL` hợp lệ ngay từ lúc mount. Không bao giờ render `RTCView` khi chưa xác nhận `toURL()` trả về giá trị non-empty.

---

## 8. Android Permissions và Audio Routing

### Lý thuyết

Android có hệ thống permission rất granular. `RECORD_AUDIO` cho phép ghi âm nhưng **không cho phép thay đổi audio routing**. `MODIFY_AUDIO_SETTINGS` mới là permission cần thiết để InCallManager chuyển audio giữa earpiece, speaker, và bluetooth.

Thiếu permission này, `setForceSpeakerphoneOn()` và `setSpeakerphoneOn()` **không có tác dụng** — không có lỗi, OS chỉ đơn giản ignore lệnh.

### Lưu ý

> Permissions trong `app.json` chỉ có hiệu lực sau khi **rebuild**. Thay đổi permission không ảnh hưởng đến APK đã cài. Khi thêm permission mới, bắt buộc phải build lại và cài lại app trên thiết bị.

---

## Nguyên tắc chung khi debug WebRTC

**Phân tách tầng rõ ràng**: Signaling (socket) và Media (P2P) là 2 tầng hoàn toàn độc lập. Signaling thành công (offer/answer trao đổi được) không có nghĩa là media thành công. Cần debug từng tầng riêng biệt.

**ICE state là chỉ số quan trọng nhất**: Nếu `iceConnectionState` không bao giờ đến `connected` hoặc `completed`, media sẽ không bao giờ chạy. Đây là điểm cần kiểm tra đầu tiên khi không có âm thanh/video.

**WebRTC thất bại rất im lặng**: Timeout, candidates bị bỏ, stream không phát — tất cả đều không throw exception. Không có lỗi không có nghĩa là đúng. Phải chủ động log từng bước mới biết chuyện gì đang xảy ra.

**Mobile và Web có hành vi khác nhau**: Mobile dùng `react-native-webrtc` (native module), Web dùng browser API. Timing, event sequence, và behavior có thể khác nhau ở một số edge case — không assume chúng giống nhau hoàn toàn.

**Ref vs State trong async context**: Trong bất kỳ callback bất đồng bộ nào (socket handler, setTimeout, Promise), luôn đọc giá trị từ ref, không đọc từ state. State là để React re-render, ref là để đọc giá trị hiện tại trong closure.