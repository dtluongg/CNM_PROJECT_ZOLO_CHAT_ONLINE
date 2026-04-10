const { Server } = require('socket.io');
const jwt         = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const userModel   = require('../models/userModel');

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
            origin:      ['http://localhost:5173', 'http://localhost:8081'],
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
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);

        // Mỗi user có room riêng để nhận targeted events
        socket.join(`user:${userId}`);

        // Đăng ký các event handler theo từng feature
        require('./callSocket')(io, socket, onlineUsers);
        require('./chatSocket')(io, socket, onlineUsers);

        // Khi socket ngắt kết nối
        socket.on('disconnect', () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) onlineUsers.delete(userId);
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
