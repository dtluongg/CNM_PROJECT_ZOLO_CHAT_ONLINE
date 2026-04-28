import { fmtTime } from './formatTime';

export const normalizeMsg = (msg) => ({
  ...msg,
  senderId: (msg.senderId?._id || msg.senderId)?.toString(),
  time: fmtTime(msg.createdAt)
});