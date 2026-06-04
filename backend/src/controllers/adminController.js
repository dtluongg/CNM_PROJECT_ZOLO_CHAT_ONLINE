const User         = require('../models/userModel');
const Report       = require('../models/reportModel');
const Conversation = require('../models/conversationModel');
const Message      = require('../models/messageModel');
const Presence     = require('../models/presenceModel');
const Notification = require('../models/notificationModel');
const { sendBanEmail, sendReportResolvedEmail } = require('../services/emailService');
const { getIO }    = require('../socket/socketManager');
const os           = require('os');

// ─── Stats ────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
    try {
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [
            totalUsers,
            newUsersToday,
            bannedUsers,
            totalConversations,
            totalMessages,
            messagesThisWeek,
            pendingReports,
            onlineUsers,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: today } }),
            User.countDocuments({ isBanned: true }),
            Conversation.countDocuments(),
            Message.countDocuments(),
            Message.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
            Report.countDocuments({ status: 'pending' }),
            Presence.countDocuments({ status: { $in: ['online', 'idle'] }, lastActiveAt: { $gte: new Date(Date.now() - 5 * 60000) } }),
        ]);

        // Messages per day (last 7 days)
        const msgPerDay = await Message.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // New users per day (last 7 days)
        const usersPerDay = await User.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const mem     = process.memoryUsage();
        const cpuLoad = os.loadavg();

        res.json({
            users: { total: totalUsers, newToday: newUsersToday, banned: bannedUsers, online: onlineUsers },
            conversations: { total: totalConversations },
            messages: { total: totalMessages, thisWeek: messagesThisWeek, perDay: msgPerDay },
            reports: { pending: pendingReports },
            charts: { messagesPerDay: msgPerDay, usersPerDay },
            system: {
                uptime: Math.floor(process.uptime()),
                memoryMB: Math.round(mem.rss / 1024 / 1024),
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
                cpuLoad1m: cpuLoad[0].toFixed(2),
                platform: os.platform(),
                nodeVersion: process.version,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Users ────────────────────────────────────────────────────────────────────

exports.listUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '', banned = '' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {};
        if (search) {
            filter.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { email:       { $regex: search, $options: 'i' } },
                { username:    { $regex: search, $options: 'i' } },
            ];
        }
        if (role)   filter.role     = role;
        if (banned === 'true')  filter.isBanned = true;
        if (banned === 'false') filter.isBanned = false;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-passwordHash')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            User.countDocuments(filter),
        ]);

        res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordHash').lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.banUser = async (req, res) => {
    try {
        const { reason = 'Vi phạm điều khoản sử dụng' } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Không thể ban admin' });

        user.isBanned    = true;
        user.bannedReason = reason;
        user.bannedAt    = new Date();
        await user.save();

        // Gửi email thông báo (không block response)
        sendBanEmail(user.email, user.displayName, reason).catch(() => {});

        res.json({ message: 'Đã ban user', user: { _id: user._id, isBanned: true, bannedReason: reason } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.unbanUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isBanned     = false;
        user.bannedReason = null;
        user.bannedAt     = null;
        await user.save();

        res.json({ message: 'Đã gỡ ban user', user: { _id: user._id, isBanned: false } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.changeRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'moderator', 'admin'].includes(role))
            return res.status(400).json({ message: 'Role không hợp lệ' });

        // chỉ admin mới cấp admin
        if (role === 'admin' && req.user.role !== 'admin')
            return res.status(403).json({ message: 'Chỉ admin mới có thể cấp quyền admin' });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { returnDocument: 'after', select: '-passwordHash' }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Đã cập nhật role', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString())
            return res.status(400).json({ message: 'Không thể tự xóa tài khoản mình' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Không thể xóa admin' });
        await user.deleteOne();
        res.json({ message: 'Đã xóa user' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Reports ─────────────────────────────────────────────────────────────────

exports.createReport = async (req, res) => {
    try {
        const { targetType, targetId, targetSnapshot, reason, description } = req.body;
        const report = await Report.create({
            reporter: req.user._id,
            targetType,
            targetId,
            targetSnapshot,
            reason,
            description,
        });
        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.listReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = '' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = {};
        if (status) filter.status = status;

        const [reports, total] = await Promise.all([
            Report.find(filter)
                .populate('reporter',   'displayName avatar email')
                .populate('resolvedBy', 'displayName avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Report.countDocuments(filter),
        ]);

        res.json({ reports, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getReportTarget = async (req, res) => {
    try {
        const { targetType, targetId } = req.params;
        let data = null;

        if (targetType === 'message') {
            const msg = await Message.findById(targetId)
                .populate('senderId', 'displayName avatar username')
                .lean();
            if (msg) data = {
                type: 'message',
                content: msg.content,
                msgType: msg.type,
                payload: msg.payload || null,
                sender: msg.senderId,
                createdAt: msg.createdAt,
                revoked: msg.revoked || false,
            };
        } else if (targetType === 'user') {
            const user = await User.findById(targetId)
                .select('displayName avatar email username role isBanned bio createdAt')
                .lean();
            if (user) data = { type: 'user', ...user };
        } else if (targetType === 'conversation') {
            const conv = await Conversation.findById(targetId)
                .select('name avatar type totalMembers createdAt')
                .lean();
            if (conv) data = { type: 'conversation', ...conv };
        }

        if (!data) return res.status(404).json({ message: 'Không tìm thấy nội dung' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateReport = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const allowed = ['pending', 'reviewing', 'resolved', 'dismissed'];
        if (!allowed.includes(status))
            return res.status(400).json({ message: 'Status không hợp lệ' });

        const update = { status, adminNote };
        const isFinalized = ['resolved', 'dismissed'].includes(status);
        if (isFinalized) {
            update.resolvedBy = req.user._id;
            update.resolvedAt = new Date();
        }

        const report = await Report.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
            .populate('reporter',   'displayName avatar email')
            .populate('resolvedBy', 'displayName avatar');

        if (!report) return res.status(404).json({ message: 'Report not found' });

        // Thông báo cho người báo cáo khi report được giải quyết hoặc bỏ qua
        if (isFinalized && report.reporter) {
            const reporter = report.reporter;
            const statusLabel = status === 'resolved' ? 'đã được xử lý' : 'đã được xem xét và đóng lại';
            const title = `Báo cáo của bạn ${statusLabel}`;
            const body = adminNote
                ? `Ghi chú: ${adminNote}`
                : (status === 'resolved'
                    ? 'Chúng tôi đã xử lý nội dung vi phạm theo báo cáo của bạn.'
                    : 'Chúng tôi đã xem xét và không tìm thấy vi phạm trong nội dung này.');

            // In-app notification
            try {
                const notif = await Notification.create({
                    userId:  reporter._id,
                    actorId: req.user._id,
                    type:    'report',
                    title,
                    body,
                    data: { reportId: report._id, reportStatus: status, isReportNotification: true },
                });
                const io = getIO();
                io.to(`user:${reporter._id.toString()}`).emit('notifications:new', { notification: notif });
            } catch (_) {}

            // Email notification (non-blocking)
            if (reporter.email) {
                sendReportResolvedEmail(reporter.email, reporter.displayName, status, adminNote, report.targetSnapshot)
                    .catch(() => {});
            }
        }

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Quick ban từ modal báo cáo
exports.banFromReport = async (req, res) => {
    try {
        const { reason = 'Vi phạm điều khoản sử dụng' } = req.body;
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Không thể ban admin' });

        user.isBanned     = true;
        user.bannedReason = reason;
        user.bannedAt     = new Date();
        await user.save();

        sendBanEmail(user.email, user.displayName, reason).catch(() => {});

        res.json({ message: 'Đã ban user', user: { _id: user._id, isBanned: true, bannedReason: reason } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};