# Conversations API Guide

Tai lieu nay mo ta day du endpoint, quyen va rang buoc cho module Conversations.

## 1. Base URL va Xac Thuc

- Base path: `/backend/api/conversations`
- Tat ca endpoint deu yeu cau dang nhap.
- Header bat buoc:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## 2. Dinh Nghia Vai Tro

- owner: truong nhom, duy nhat 1 nguoi, co full quyen quan tri.
- admin: pho nhom, co quyen quan tri han che theo policy.
- member: thanh vien thuong.

## 3. Danh Sach Endpoint

### 3.1 Tao conversation

#### POST /dm
Tao DM giua user hien tai va user dich.

Body:
```json
{
  "targetUserId": "USER_ID"
}
```

Rang buoc:
- `targetUserId` hop le.
- Khong duoc tao DM voi chinh minh.
- Neu DM da ton tai thi tra ve conversation cu.

#### POST /group
Tao nhom chat.

Body:
```json
{
  "name": "Team Backend",
  "avatar": "",
  "memberIds": ["USER_ID_1", "USER_ID_2"]
}
```

Logic:
- User tao nhom tro thanh `owner`.
- Member duoc tao mac dinh:
  - `canSendMessages = true`
  - `canInviteMembers = true`
  - `canManageMembers = false`

### 3.2 Lay danh sach/chi tiet conversation

#### GET /
Lay danh sach conversation cua user hien tai.

Query:
- `archive=exclude|only|all` (mac dinh `exclude`).

#### GET /:id
Lay chi tiet conversation theo id.

Rang buoc:
- User phai la member active (`leftAt = null`) cua conversation.

### 3.3 Quan ly thong tin nhom

#### PATCH /:id
Cap nhat thong tin nhom (`name`, `avatar`).

Body (vi du):
```json
{
  "name": "Team Backend Updated",
  "avatar": ""
}
```

Quyen:
- owner/admin (theo logic hien tai).

#### PATCH /:id/lock
Khoa/mo khoa nhom.

Body:
```json
{
  "isLocked": true
}
```

Quyen:
- owner.

#### PATCH /:id/archive
Archive/unarchive conversation theo tung user.

Body:
```json
{
  "isArchived": true
}
```

Luu y:
- Chi anh huong den nguoi goi API.

### 3.4 Quan ly thanh vien nhom

#### GET /:id/members
Lay danh sach thanh vien.

Query:
- `includeLeft=true` de lay ca thanh vien da roi.

#### POST /:id/members
Them 1 hoac nhieu thanh vien vao nhom.

Body cach 1:
```json
{
  "memberUserId": "USER_ID"
}
```

Body cach 2:
```json
{
  "memberUserIds": ["USER_ID_1", "USER_ID_2"]
}
```

Quyen:
- owner luon duoc them.
- admin/member duoc them neu `canInviteMembers = true`.

Rang buoc:
- Nhom bi khoa (`isLocked = true`) thi khong them duoc.
- User da roi nhom co the duoc re-join.

#### PATCH /:id/members/:userId/role
Endpoint chuan de cap nhat role va quyen dac biet cho 1 thanh vien.

Body (vi du):
```json
{
  "role": "admin",
  "canSendMessages": true,
  "canInviteMembers": true,
  "canManageMembers": false
}
```

Policy:
- owner:
  - duoc doi role `admin/member`.
  - duoc sua quyen dac biet.
- admin:
  - khong duoc doi role.
  - chi duoc sua quyen dac biet cua `member` thuong.

#### DELETE /:id/members/:userId
Kick thanh vien khoi nhom.

Policy:
- owner: kick duoc admin/member.
- admin: chi kick duoc member thuong.

Rang buoc:
- Khong kick duoc owner.
- Khong tu kick chinh minh.

#### PATCH /:id/transfer-owner
Chuyen owner cho thanh vien khac trong cung nhom.

Body:
```json
{
  "newOwnerUserId": "USER_ID"
}
```

Quyen:
- Chi owner hien tai.

Rang buoc:
- `newOwnerUserId` phai la member active trong nhom.

#### POST /:id/leave
Thanh vien tu roi nhom.

Rang buoc:
- owner khong roi duoc neu nhom con thanh vien khac.
- owner can transfer owner hoac disband truoc.

#### POST /:id/disband
Giai tan nhom.

Quyen:
- owner.

Logic:
- Dat nhom `isLocked = true`.
- Toan bo member active thanh da roi (`leftAt != null`).

## 4. Ma Loi Thuong Gap

- `400`: du lieu dau vao khong hop le.
- `401`: thieu token hoac token khong hop le.
- `403`: khong du quyen thao tac.
- `404`: khong tim thay conversation/member/user.

## 5. Bien Postman De Test

Collection file: `backend/postman_test/conversation_api_collection.json`

Bien quan trong:
- `baseUrl`
- `accessToken`
- `accessTokenAlt`
- `id` (conversation id)
- `userId`
- `userId2`
- `newOwnerUserId`

## 6. Goi Y Flow Test Nhanh

1. Dang nhap owner -> lay `accessToken`.
2. Tao group qua `POST /group` -> luu `id`.
3. Them member qua `POST /:id/members`.
4. Cap role/quyen qua `PATCH /:id/members/:userId/role`.
5. Test kick/transfer owner/leave/disband theo policy.
