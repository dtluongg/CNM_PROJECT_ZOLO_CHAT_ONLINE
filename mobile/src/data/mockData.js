export const MOCK_CONVERSATIONS = [
  {
    id: '1', type: 'dm', name: 'An Nguyen',
    lastMessage: 'Oke bạn nhé!', time: '10:32',
    unread: 3, online: true, status: 'online',
    usernameColor: '#5865f2',
    otherUserId: 'user1',
  },
  {
    id: '2', type: 'dm', name: 'Minh Tran',
    lastMessage: 'Tối nay đi chơi không?', time: '09:15',
    unread: 0, online: true, status: 'idle',
    usernameColor: '#eb459e',
    otherUserId: 'user2',
  },
  {
    id: '3', type: 'dm', name: 'Linh Pham',
    lastMessage: 'Ok mình hiểu rồi 😊', time: 'Hôm qua',
    unread: 1, online: false, status: 'offline',
    usernameColor: '#00b4d8',
    otherUserId: 'user3',
  },
  {
    id: '4', type: 'dm', name: 'Hoang Le',
    lastMessage: 'Cảm ơn bạn nhiều!', time: 'Hôm qua',
    unread: 0, online: true, status: 'dnd',
    usernameColor: '#faa61a',
    otherUserId: 'user4',
  },
  {
    id: '5', type: 'group', name: 'Nhóm CNM',
    lastMessage: 'Minh: Họp lúc 3h chiều nha', time: '11:00',
    unread: 5, online: null, members: 8,
    usernameColor: null,
    otherUserId: null,
  },
  {
    id: '6', type: 'group', name: 'Team ZoloChat',
    lastMessage: 'An: Deploy xong chưa?', time: 'Hôm qua',
    unread: 0, online: null, members: 4,
    usernameColor: null,
    otherUserId: null,
  },
];

const now = new Date();
const t = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

export const MOCK_MESSAGES = {
  '1': [
    { id: 1, senderId: 'user1', senderName: 'An Nguyen', content: 'Hey bạn ơi!', time: t(10,20), type: 'text' },
    { id: 2, senderId: 'user1', senderName: 'An Nguyen', content: 'Dự án hôm nay có họp không?', time: t(10,21), type: 'text' },
    { id: 3, senderId: 'me',    senderName: 'Tôi',       content: 'Có bạn ơi, 3h chiều nha', time: t(10,25), type: 'text' },
    { id: 4, senderId: 'user1', senderName: 'An Nguyen', content: 'Oke bạn nhé!', time: t(10,32), type: 'text' },
  ],
  '2': [
    { id: 1, senderId: 'me',    senderName: 'Tôi',       content: 'Tối nay rảnh không?', time: t(9,10), type: 'text' },
    { id: 2, senderId: 'user2', senderName: 'Minh Tran', content: 'Tối nay đi chơi không?', time: t(9,15), type: 'text' },
  ],
  '5': [
    { id: 1, senderId: 'user2', senderName: 'Minh Tran', content: 'Mọi người xem slide chưa?', time: t(10,45), type: 'text' },
    { id: 2, senderId: 'user3', senderName: 'Linh Pham', content: 'Chưa, gửi mình với!', time: t(10,50), type: 'text' },
    { id: 3, senderId: 'me',    senderName: 'Tôi',       content: 'Mình xem rồi, oke lắm 👍', time: t(10,55), type: 'text' },
    { id: 4, senderId: 'user2', senderName: 'Minh Tran', content: 'Họp lúc 3h chiều nha', time: t(11,0), type: 'text' },
  ],
};
