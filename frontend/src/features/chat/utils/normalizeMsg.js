import { fmtTime } from './formatTime';

export const normalizeMsg = (msg) => ({ ...msg, time: fmtTime(msg.createdAt) });