# Tài liệu tổng quan tính năng gọi WebRTC trong Zolo Chat

Người viết: Vi

Mục đích của tài liệu này là để chia sẻ với các bạn trong nhóm cách tính năng gọi audio/video trong Zolo Chat hoạt động, vai trò của WebRTC, vai trò của server, các luồng gọi chính, và nguyên nhân lỗi mobile gọi web không nghe được mà nhóm vừa debug.

---

## 1. Tổng quan tính năng gọi

Tính năng gọi trong Zolo Chat cho phép hai người dùng gọi audio hoặc video realtime với nhau.

Hệ thống có 3 phần chính:

```txt
1. Mobile client
2. Web client
3. Backend server
```

Luồng tổng quát:

```txt
Mobile/Web A                 Server                  Mobile/Web B
     |                         |                           |
     | ---- signaling -------->|                           |
     |                         | ---- signaling ---------->|
     |                         |                           |
     | <--- signaling ---------| <---- signaling ----------|
     |                         |                           |
     | ======= WebRTC media trực tiếp giữa 2 client =======|
```

Điểm quan trọng nhất:

```txt
Server không truyền âm thanh/video.
Server chỉ làm nhiệm vụ signaling và lưu trạng thái cuộc gọi.
Audio/video thật đi trực tiếp giữa 2 client thông qua WebRTC.
```

---

## 2. WebRTC là gì?

WebRTC là công nghệ giúp hai thiết bị truyền realtime audio/video/data với nhau.

Trong tính năng gọi của mình, WebRTC làm các nhiệm vụ chính:

```txt
1. Lấy microphone/camera của người dùng
2. Tạo RTCPeerConnection giữa 2 bên
3. Tạo offer/answer để thống nhất cuộc gọi
4. Tạo ICE candidate để tìm đường kết nối
5. Gửi và nhận audio/video trực tiếp giữa 2 thiết bị
```

Có thể hiểu đơn giản:

```txt
WebRTC = đường dây điện thoại thật giữa 2 người dùng
Socket server = tổng đài giúp 2 người tìm thấy nhau
Database = nơi lưu lịch sử cuộc gọi
```

---

## 3. Server làm gì?

Backend server trong tính năng gọi là signaling server.

Server không xử lý âm thanh, không nghe tiếng, không xem video. Server chỉ chuyển các thông tin cần thiết giữa 2 client để WebRTC có thể tự kết nối.

Server làm các nhiệm vụ:

```txt
1. Xác thực user qua token
2. Quản lý user online/offline
3. Tạo bản ghi cuộc gọi trong database
4. Gửi incoming call đến người nhận
5. Relay SDP offer từ caller sang callee
6. Relay SDP answer từ callee về caller
7. Relay ICE candidate giữa 2 bên
8. Quản lý timeout nếu người nhận không bắt máy
9. Cập nhật trạng thái cuộc gọi: calling, ongoing, missed, rejected, ended
10. Tính duration khi kết thúc cuộc gọi
11. Cung cấp API lấy lịch sử và chi tiết cuộc gọi
```

---

## 4. Có 2 nhóm API/server logic

Trong backend có 2 nhóm chính:

```txt
1. HTTP API: lấy lịch sử và chi tiết cuộc gọi
2. Socket signaling: xử lý cuộc gọi realtime
```

---

## 5. HTTP API cho lịch sử cuộc gọi

Route:

```js
router.get('/history', verifyToken, getCallHistory);
router.get('/:callId', verifyToken, getCallDetail);
```

### 5.1. `GET /backend/api/calls/history`

API này lấy lịch sử cuộc gọi của user đang đăng nhập.

Server làm:

```txt
1. Lấy userId từ token
2. Tìm các cuộc gọi mà user là caller hoặc callee
3. Nếu có query type thì lọc audio/video
4. Sắp xếp mới nhất trước
5. Populate thông tin caller/callee
6. Trả về danh sách cuộc gọi và pagination
```

Điều kiện tìm call:

```js
const filter = {
  $or: [{ callerId: userId }, { calleeId: userId }],
};
```

Ý nghĩa:

```txt
Lấy các cuộc gọi mà tôi là người gọi
hoặc
Lấy các cuộc gọi mà tôi là người nhận
```

Response có các thông tin:

```txt
_id
status
type
duration
startedAt
endedAt
createdAt
caller
callee
isOutgoing
```

`isOutgoing` dùng để biết cuộc gọi đó là gọi đi hay gọi đến:

```txt
isOutgoing = true  -> tôi là người gọi
isOutgoing = false -> tôi là người nhận
```

### 5.2. `GET /backend/api/calls/:callId`

API này lấy chi tiết một cuộc gọi.

Server làm:

```txt
1. Kiểm tra callId hợp lệ
2. Tìm cuộc gọi trong database
3. Populate caller/callee
4. Kiểm tra user hiện tại có nằm trong cuộc gọi không
5. Nếu không phải caller/callee thì trả 403
6. Nếu hợp lệ thì trả chi tiết cuộc gọi
```

Đoạn kiểm tra quyền quan trọng:

```js
const isParticipant =
  call.callerId._id.toString() === userId ||
  call.calleeId._id.toString() === userId;
```

Ý nghĩa:

```txt
Chỉ người tham gia cuộc gọi mới được xem chi tiết cuộc gọi đó.
```

---

## 6. Socket signaling server

File `callSocket.js` xử lý phần realtime của cuộc gọi.

Các event chính:

```txt
call:initiate       -> bắt đầu gọi
call:incoming       -> báo cuộc gọi đến
call:answer         -> người nhận nghe máy
call:answered       -> báo caller rằng callee đã nghe
call:ice-candidate  -> trao đổi ICE candidate
call:reject         -> từ chối cuộc gọi
call:end            -> kết thúc cuộc gọi
call:timeout        -> hết thời gian chờ nghe máy
```

---

## 7. Socket room trong cuộc gọi

Server dùng 2 loại room:

```txt
user:{userId}
call:{callId}
```

### 7.1. `user:{userId}`

Đây là room cá nhân của mỗi user.

Dùng để gửi các event trực tiếp tới user đó:

```txt
- call:incoming
- call:timeout
- call:rejected
```

Ví dụ:

```js
io.to(`user:${calleeId}`).emit('call:incoming', {...});
```

### 7.2. `call:{callId}`

Đây là room riêng của một cuộc gọi.

Dùng để relay event giữa 2 người trong cùng cuộc gọi:

```txt
- call:answered
- call:ice-candidate
- call:ended
```

Caller join room khi bắt đầu gọi:

```js
socket.join(`call:${callId}`);
```

Callee join room khi nghe máy:

```js
socket.join(`call:${callId}`);
```

---

## 8. Luồng bắt đầu cuộc gọi: `call:initiate`

Người gọi gửi:

```js
socket.emit('call:initiate', {
  calleeId,
  type,
  offer,
}, callback);
```

Server xử lý:

```txt
1. Validate calleeId, type, offer
2. Không cho gọi chính mình
3. Kiểm tra callee có tồn tại không
4. Tạo bản ghi Call trong database
5. Caller join room call:{callId}
6. Nếu callee offline thì đánh dấu missed
7. Nếu callee online thì emit call:incoming cho callee
8. Tạo timeout 30 giây
9. Ack trả callId về caller
```

Điểm quan trọng:

```txt
Server phải trả callId về caller.
Client cần callId để gửi ICE candidate đúng vào cuộc gọi đó.
```

---

## 9. Luồng người nhận nghe máy: `call:answer`

Callee gửi:

```js
socket.emit('call:answer', {
  callId,
  answer,
}, callback);
```

Server xử lý:

```txt
1. Kiểm tra callId và answer
2. Tìm cuộc gọi trong database
3. Kiểm tra user hiện tại có phải callee không
4. Kiểm tra call còn ở trạng thái calling không
5. Hủy timeout
6. Update status = ongoing
7. Set startedAt
8. Callee join room call:{callId}
9. Emit call:answered về caller
10. Ack success cho callee
```

Đoạn quan trọng:

```js
socket.to(`call:${callId}`).emit('call:answered', { callId, answer });
```

Ý nghĩa:

```txt
Gửi answer cho caller trong room cuộc gọi, không gửi lại cho chính callee.
```

---

## 10. Luồng trao đổi ICE candidate

Hai bên đều có thể gửi:

```js
socket.emit('call:ice-candidate', {
  callId,
  candidate,
});
```

Server chỉ relay:

```js
socket.to(`call:${callId}`).emit('call:ice-candidate', {
  callId,
  candidate,
});
```

Server không sửa candidate, không phân tích candidate, không tạo candidate.

Nhiệm vụ của server chỉ là:

```txt
Client A gửi candidate
Server chuyển candidate cho Client B
Client B addIceCandidate(candidate)
```

---

## 11. Offer, Answer, ICE Candidate là gì?

### 11.1. Offer

Offer do người gọi tạo.

Offer nói với người nhận:

```txt
Tôi muốn gọi audio/video
Tôi có những media track nào
Tôi hỗ trợ codec nào
Đây là thông tin SDP ban đầu của tôi
```

### 11.2. Answer

Answer do người nhận tạo.

Answer nói với người gọi:

```txt
Tôi chấp nhận cuộc gọi
Tôi cũng có audio/video track
Tôi đồng ý với codec/media này
Đây là SDP phản hồi của tôi
```

### 11.3. ICE Candidate

ICE candidate là địa chỉ/kênh kết nối mà WebRTC có thể thử dùng.

Ví dụ:

```txt
- IP LAN
- IP public lấy qua STUN
- TURN relay nếu có TURN server
```

Offer/Answer chỉ giúp hai bên đồng ý gọi. ICE candidate mới giúp hai bên tìm đường truyền thật.

---

## 12. STUN và TURN

### STUN

STUN giúp client biết địa chỉ public của mình.

Ví dụ:

```js
{ urls: 'stun:stun.l.google.com:19302' }
```

STUN không truyền audio/video thay client.

### TURN

TURN là server relay media khi kết nối P2P trực tiếp thất bại.

Nếu không có TURN, một số mạng có thể gặp lỗi:

```txt
ICE state = checking mãi
ICE state = failed
một chiều nghe được, một chiều không
```

Trong dự án hiện tại mình chưa thêm TURN, nên trước mắt phải đảm bảo signaling và ICE exchange đúng đã.

---

## 13. Luồng Web gọi Mobile

```txt
Web caller                             Server                        Mobile callee
     |                                   |                                |
     | getLocalStream                    |                                |
     | addTrack                          |                                |
     | createOffer                       |                                |
     | call:initiate ------------------->|                                |
     |                                   | create Call DB                 |
     |                                   | caller join call room          |
     |                                   | emit call:incoming ----------->|
     |<----------- ack { callId } -------|                                |
     | flush local ICE ----------------->|                                |
     |                                   | relay ICE -------------------->|
     |                                   |                                | answerCall
     |                                   |                                | getLocalStream
     |                                   |                                | addTrack
     |                                   |                                | setCallId(callId)
     |                                   |                                | createAnswer
     |                                   |<-------------- call:answer ----|
     |<---------------- call:answered ---|                                |
     |                                   |                                |
     |================ ICE connected =====================================|
     |================ audio/video trực tiếp qua WebRTC ==================|
```

---

## 14. Luồng Mobile gọi Web

Đây là chiều từng bị lỗi.

```txt
Mobile caller                          Server                         Web callee
     |                                   |                                |
     | getLocalStream                    |                                |
     | addTrack                          |                                |
     | createOffer                       |                                |
     | ICE local sinh ra sớm             |                                |
     | queue pendingLocalCandidates      |                                |
     | call:initiate ------------------->|                                |
     |                                   | create Call DB                 |
     |                                   | caller join call room          |
     |                                   | emit call:incoming ----------->|
     |<----------- ack { callId } -------|                                |
     | flushLocalCandidates(callId) ---->|                                |
     |                                   | relay ICE -------------------->|
     |                                   |                                | answerCall
     |                                   |                                | getLocalStream
     |                                   |                                | addTrack
     |                                   |                                | setCallId(callId)
     |                                   |                                | createAnswer
     |                                   |                                | local ICE sinh ra
     |                                   |                                | emit/queue local ICE
     |                                   |<-------------- call:answer ----|
     |<---------------- call:answered ---|                                |
     | setRemoteAnswer                   |                                |
     | add remote ICE                    |                                |
     |                                   | relay ICE <--------------------|
     |<---------------- ICE -------------|                                |
     |                                   |                                |
     |================ ICE connected =====================================|
     |================ audio/video trực tiếp qua WebRTC ==================|
```

---

## 15. Vì sao lỗi mobile gọi web không nghe?

Nguyên nhân chính là ICE candidate sinh ra trước khi client có callId.

Khi mobile là caller:

```txt
mobile createOffer()
-> WebRTC sinh ICE candidate rất sớm
-> lúc đó mobile chưa có callId
-> vì callId chỉ có sau khi server ack call:initiate
-> candidate không gửi được hoặc bị queue sai
-> web/mobile không trao đổi đủ ICE
-> ICE stuck ở checking
-> mobile không gửi RTP audio
-> web không nghe được mobile
```

Log thường thấy:

```txt
[Mobile ICE state] checking
[Mobile audio outbound] packetsSent: 0
```

Điều này nghĩa là:

```txt
Offer/Answer có thể đã đúng,
nhưng đường truyền WebRTC thật chưa connected.
```

---

## 16. Cách fix lỗi ICE candidate

Cần tách 2 loại queue:

```js
pendingCandidates
pendingLocalCandidates
```

Ý nghĩa:

```txt
pendingCandidates      = remote ICE từ peer gửi tới, chờ addIceCandidate
pendingLocalCandidates = local ICE của máy mình, chờ có callId để emit lên server
```

### Khi local ICE sinh ra

```txt
Nếu đã có callId -> emit lên server ngay
Nếu chưa có callId -> lưu vào pendingLocalCandidates
```

### Khi server trả callId

```txt
setCallId(callId)
flushLocalCandidates(callId)
```

### Khi nhận remote ICE từ server

```txt
Nếu đã có remoteDescription -> addIceCandidate
Nếu chưa có remoteDescription -> lưu vào pendingCandidates
```

---

## 17. Vì sao web phải setCallId trước createAnswer?

Khi web là callee, web đã nhận được callId từ event `call:incoming`.

Thứ tự sai:

```js
const answer = await createAnswer(offer);
setCallId(cid);
```

Sai vì `createAnswer()` có thể làm ICE candidate sinh ra ngay. Nếu lúc đó callId chưa set, candidate không gửi được.

Thứ tự đúng:

```js
setCallId(cid);
const answer = await createAnswer(offer);
```

Như vậy khi ICE candidate web sinh ra, client đã biết callId và gửi được candidate về server.

---

## 18. Vì sao mobile phải lấy mic trước InCallManager?

Trên Android, `InCallManager` quản lý audio session, speaker, microphone mute, ringtone.

Nếu gọi `InCallManager.start()` quá sớm, có thể ảnh hưởng đến mic capture.

Thứ tự an toàn hơn:

```txt
getLocalStream()
enable audio track
setLocalStream()
addLocalStream()
prepareAudioSession()
createOffer/createAnswer()
```

Tức là:

```txt
Lấy mic và addTrack trước,
rồi mới chỉnh audio route bằng InCallManager.
```

---

## 19. Ai làm nhiệm vụ gì?

### Mobile client

```txt
1. Kết nối socket bằng token
2. Gọi người khác bằng call:initiate
3. Nhận call:incoming
4. Lấy mic/camera bằng react-native-webrtc
5. Tạo offer hoặc answer
6. Gửi/nhận ICE candidate
7. Add remote stream
8. Điều khiển mute/camera/speaker bằng InCallManager
9. End/reject/timeout cleanup
```

### Web client

```txt
1. Kết nối socket bằng token
2. Gọi người khác bằng call:initiate
3. Nhận call:incoming
4. Lấy mic/camera bằng navigator.mediaDevices.getUserMedia
5. Tạo offer hoặc answer
6. Gửi/nhận ICE candidate
7. Gắn remote stream vào audio/video element
8. Xử lý autoplay trên trình duyệt
9. End/reject/timeout cleanup
```

### Server

```txt
1. Xác thực socket
2. Quản lý onlineUsers
3. Cho socket join user room
4. Tạo Call record
5. Cho caller/callee join call room
6. Chuyển offer từ caller sang callee
7. Chuyển answer từ callee sang caller
8. Chuyển ICE candidate giữa 2 bên
9. Quản lý timeout 30s
10. Update trạng thái cuộc gọi trong DB
11. Cung cấp API lịch sử cuộc gọi
```

---

## 20. Trạng thái cuộc gọi trong database

Các trạng thái chính:

```txt
calling   = đang đổ chuông
ongoing   = đã nghe máy, đang gọi
ended     = kết thúc bình thường
missed    = nhỡ cuộc gọi
rejected  = bị từ chối
```

Các field thường có:

```txt
callerId
calleeId
type
status
duration
startedAt
endedAt
createdAt
```

---

## 21. Checklist khi debug cuộc gọi

### Kiểm tra local stream

Cần thấy:

```txt
getLocalStream tracks: audio
```

Nếu không có audio track thì lỗi permission/mic.

### Kiểm tra addTrack

Cần thấy:

```txt
addTrack: audio
```

Nếu không addTrack thì SDP có thể thiếu audio.

### Kiểm tra SDP

SDP cần có:

```txt
m=audio
a=sendrecv
```

### Kiểm tra ICE candidate

Cần thấy:

```txt
queued local candidate
flushing local candidates
queued remote candidate
addIceCandidate
```

### Kiểm tra ICE state

Cần thấy:

```txt
ICE state connected
```

Nếu cứ đứng ở:

```txt
checking
```

thì chưa tìm được đường kết nối.

### Kiểm tra audio packet

Cần thấy:

```txt
packetsSent tăng
packetsReceived tăng
```

Nếu `packetsSent = 0`, bên gửi chưa truyền audio RTP.

Nếu `packetsSent tăng` nhưng bên kia không nghe, lỗi có thể nằm ở audio playback.

---

## 22. Tổng kết ngắn gọn

Tính năng gọi hoạt động như sau:

```txt
Client lấy mic/camera
Client tạo offer/answer bằng WebRTC
Server chuyển offer/answer giữa 2 user
Client tạo ICE candidate
Server chuyển ICE candidate giữa 2 user
WebRTC dùng ICE để kết nối 2 thiết bị
Audio/video chạy trực tiếp giữa 2 thiết bị
Server lưu lịch sử và trạng thái cuộc gọi
```

Một câu dễ nhớ:

```txt
Socket server giúp hai máy làm quen.
WebRTC giúp hai máy nói chuyện thật.
Database lưu lại cuộc gọi đã xảy ra.
```

Hoặc:

```txt
Offer/Answer = đồng ý gọi
ICE Candidate = tìm đường kết nối
Track = tiếng/hình thật
Socket = người đưa thư
Server = tổng đài
WebRTC = đường dây điện thoại
```

---

## 23. Kết luận của Vi

Theo mình, lỗi vừa rồi không nằm ở route lịch sử cuộc gọi hay permission đơn thuần. Lỗi chính nằm ở signaling/WebRTC, cụ thể là ICE candidate sinh ra trước khi client có callId.

Cách xử lý đúng là:

```txt
1. Tách local ICE và remote ICE thành 2 queue riêng
2. Local ICE chưa có callId thì lưu lại
3. Khi có callId thì flush local ICE lên server
4. Remote ICE chưa có remoteDescription thì lưu lại
5. Khi setRemoteDescription xong thì add remote ICE
6. Web callee phải setCallId trước createAnswer
7. Mobile nên lấy mic/addTrack trước khi gọi InCallManager
```

Sau khi hiểu đúng các luồng này, mình nghĩ nhóm mình sẽ dễ debug hơn rất nhiều khi gặp lỗi kiểu:

```txt
- Một chiều nghe được, một chiều không
- ICE checking mãi
- ontrack có nhưng không nghe
- packetsSent = 0
- packetsReceived = 0
```

Quan trọng nhất là phải phân biệt rõ:

```txt
Offer/Answer đúng chưa chắc audio đã chạy.
Muốn audio chạy thì ICE phải connected và track phải được gửi thật.
```
