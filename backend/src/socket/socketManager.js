const { Server } = require('socket.io');
const jwt         = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const userModel   = require('../models/userModel');
const Presence    = require('../models/presenceModel');
const mongoose    = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
//  Singleton io instance
// ─────────────────────────────────────────────────────────────────────────────
let io = null;

// userId (string) → Set<socketId>  — hỗ trợ multi-tab / multi-device
const onlineUsers = new Map();

// ═════════════════════════════════════════════════════════════════════════════
//  initSocket  –  Khởi tạo Socket.io gắn vào HTTP server
//  Gọi một lần duy nhất trong index.js
// ═════════════════════════════════════════════════════════════════════════════
const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin:      ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8081' , "https://warehouseposlvsh.dotienluong.id.vn"],
            credentials: true,
        },
        // Tăng buffer cho video signaling (SDP có thể dài)
        maxHttpBufferSize: 1e6, // 1 MB
    });

    // ── Auth middleware: dùng cùng logic với verifytoken.js ───────────────
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('AUTH_MISSING: Thiếu token xác thực'));
        }

        // Thử Supabase trước
        try {
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
            if (!error && supabaseUser) {
                const dbUser =
                    await userModel.findOne({ supabaseId: supabaseUser.id }) ||
                    await userModel.findOne({ 'linkedProviders.supabaseId': supabaseUser.id }) ||
                    await userModel.findOne({ email: supabaseUser.email });

                if (!dbUser) return next(new Error('USER_NOT_SYNCED'));
                socket.user = dbUser;
                return next();
            }
        } catch (_) {
            // Supabase lỗi → thử local JWT
        }

        // Thử local JWT
        try {
            const decoded = jwt.verify(token, process.env.acc_secret);
            const user = await userModel.findById(decoded.user_id).select('-passwordHash');
            if (!user) return next(new Error('USER_NOT_FOUND'));
            socket.user = user;
            return next();
        } catch (_) {
            return next(new Error('AUTH_INVALID: Token không hợp lệ'));
        }
    });

    // ── Connection handler ────────────────────────────────────────────────
    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();

        // Ghi nhận online
        const isFirstSocket = !onlineUsers.has(userId) || onlineUsers.get(userId).size === 0;
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);

        // Mỗi user có room riêng để nhận targeted events
        socket.join(`user:${userId}`);

        // Thông báo user vừa online cho tất cả clients khác
        // invisible → hiện như offline với người khác
        if (isFirstSocket) {
            const chosenStatus = socket.user.status || 'online';
            const broadcastStatus = chosenStatus === 'invisible' ? 'offline' : chosenStatus;
            const chosenStatusText = socket.user.statusText || '';
            if (chosenStatus !== 'invisible') {
                socket.broadcast.emit('presence:online', {
                    userId,
                    status: broadcastStatus,
                    statusText: chosenStatusText,
                });
            }
            // Lưu trạng thái online vào DB (fire-and-forget)
            Presence.findOneAndUpdate(
                { userId: new mongoose.Types.ObjectId(userId) },
                { status: chosenStatus, lastActiveAt: new Date() },
                { upsert: true, new: true }
            ).catch(e => console.error('[Presence] update online error:', e));
        }

        // Client yêu cầu danh sách online hiện tại (gọi 1 lần khi kết nối)
        socket.on('presence:subscribe', async () => {
            // Lấy snapshot online từ Presence collection để tránh lệch giữa các tab/cửa sổ
            const onlineIds = [...onlineUsers.keys()];
            let statusMap = {};
            try {
                const presences = await Presence.find(
                    { userId: { $in: onlineIds } },
                    { userId: 1, status: 1 }
                ).lean();

                presences.forEach((presence) => {
                    const st = presence.status || 'online';
                    // invisible users không xuất hiện trong danh sách online của người khác
                    if (st !== 'invisible' && st !== 'offline') {
                        statusMap[presence.userId.toString()] = st;
                    }
                });

                // Fallback an toàn: nếu Presence chưa kịp ghi, vẫn coi là online khi socket đang nối
                onlineIds.forEach((id) => {
                    if (!statusMap[id]) {
                        statusMap[id] = 'online';
                    }
                });
            } catch (_) {
                // fallback: tất cả là online
                onlineIds.forEach(id => { statusMap[id] = 'online'; });
            }
            // Lấy statusText riêng (cho những user visible)
            const statusTextMap = {};
            try {
                const users2 = await userModel.find(
                    { _id: { $in: Object.keys(statusMap) } },
                    { _id: 1, statusText: 1 }
                ).lean();
                users2.forEach(u => { statusTextMap[u._id.toString()] = u.statusText || ''; });
            } catch (_) {}
            socket.emit('presence:online-list', {
                userIds: Object.keys(statusMap),
                statusMap,
                statusTextMap,
            });
        });

        // Đăng ký các event handler theo từng feature
        require('./callSocket')(io, socket, onlineUsers);
        require('./chatSocket')(io, socket, onlineUsers);
        require('./voiceRoomSocket')(io, socket, onlineUsers);

        // Khi socket ngắt kết nối
        socket.on('disconnect', () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    const lastSeen = new Date().toISOString();
                    io.emit('presence:offline', { userId, lastSeen });
                    Presence.findOneAndUpdate(
                        { userId: new mongoose.Types.ObjectId(userId) },
                        { status: 'offline', lastActiveAt: new Date() },
                        { upsert: true }
                    ).catch(e => console.error('[Presence] update offline error:', e));
                }
            }
        });
    });

    console.log('Socket.io đã khởi tạo');
    return io;
};

// ─────────────────────────────────────────────────────────────────────────────
//  getIO  –  Lấy io instance từ bất kỳ đâu trong app
// ─────────────────────────────────────────────────────────────────────────────
const getIO = () => {
    if (!io) throw new Error('Socket.io chưa được khởi tạo, gọi initSocket() trước');
    return io;
};

module.exports = { initSocket, getIO, onlineUsers };
