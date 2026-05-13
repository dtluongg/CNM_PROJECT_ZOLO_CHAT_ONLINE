const sessionModel = require('../models/sessionModel');
const { getIO } = require('../socket/socketManager');
const { parseUserAgent, reverseGeocode } = require('../untils/sessionHelper');

/**
 * Liệt kê danh sách các phiên đăng nhập
 * NGUYÊN TẮC: API này CHỈ ĐỌC, KHÔNG BAO GIỜ sửa/xóa dữ liệu trong DB.
 */
const listSessions = async (req, res) => {
    try {
        const userId = req.user._id;
        let currentSessionId = req.sessionId;
        
        // Lấy tất cả session của user
        const sessions = await sessionModel.find({ userId }).sort({ lastActiveAt: -1 });

        // Fallback: Nếu không có sessionId trong token (do login cũ), thử tìm cái khớp nhất
        if (!currentSessionId && sessions.length > 0) {
            const ua = req.headers['user-agent'];
            const fallback = sessions.find(s => s.isActive && s.userAgent === ua);
            if (fallback) currentSessionId = fallback.sessionId;
            else if (sessions[0].isActive) currentSessionId = sessions[0].sessionId;
        }

        // Phân loại đơn giản: current / others (active) / history (inactive)
        const current = sessions.find(s => s.sessionId === currentSessionId && s.isActive) || null;
        const others = sessions.filter(s => s.sessionId !== currentSessionId && s.isActive);
        const history = sessions.filter(s => !s.isActive).slice(0, 10);

        return res.status(200).json({ current, others, history });
    } catch (error) {
        console.error('[SessionController] listSessions error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * Đăng xuất một phiên cụ thể
 */
const logoutSession = async (req, res) => {
    try {
        const userId = req.user._id;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ message: 'Thiếu sessionId' });
        }

        const session = await sessionModel.findOne({ sessionId, userId });
        if (!session) {
            return res.status(404).json({ message: 'Không tìm thấy phiên đăng nhập' });
        }

        if (!session.isActive) {
            return res.status(400).json({ message: 'Phiên này đã đăng xuất trước đó' });
        }

        // Cập nhật trạng thái
        session.isActive = false;
        await session.save();

        // Gửi event Real-time để kick thiết bị
        try {
            const io = getIO();
            const userRoom = `user:${String(userId)}`;
            io.to(userRoom).emit('session:terminated', { 
                sessionId,
                initiatedBy: req.sessionId,
                reason: 'Phiên đăng nhập này đã bị kết thúc từ một thiết bị khác.' 
            });
            io.to(userRoom).emit('session:update');
        } catch (e) {
            console.error('[SessionController] Socket emit error:', e.message);
        }

        return res.status(200).json({ message: 'Đã đăng xuất thiết bị thành công' });
    } catch (error) {
        console.error('[SessionController] logoutSession error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * Đăng xuất tất cả thiết bị khác
 */
const logoutAllOthers = async (req, res) => {
    try {
        const userId = req.user._id;
        const currentSessionId = req.body?.currentSessionId || req.sessionId;

        if (!currentSessionId) {
            return res.status(400).json({ message: 'Không thể xác định phiên làm việc hiện tại. Vui lòng đăng nhập lại.' });
        }

        const otherSessions = await sessionModel.find({
            userId,
            sessionId: { $ne: currentSessionId },
            isActive: true
        });

        if (otherSessions.length === 0) {
            return res.status(200).json({ message: 'Không có thiết bị nào khác đang đăng nhập' });
        }

        const otherIds = otherSessions.map(s => s.sessionId);
        
        // Update DB
        await sessionModel.updateMany(
            { sessionId: { $in: otherIds } },
            { isActive: false }
        );

        // Real-time notification
        try {
            const io = getIO();
            const userRoom = `user:${String(userId)}`;
            
            // Phát lệnh logout tập thể: Tất cả các thiết bị trong phòng (ngoại trừ cái hiện tại) phải logout
            io.to(userRoom).emit('session:terminated-others', { 
                exceptSessionId: currentSessionId,
                reason: 'Tất cả các phiên đăng nhập khác đã bị kết thúc từ thiết bị của bạn.' 
            });

            // Thông báo cập nhật danh sách
            io.to(userRoom).emit('session:update');
        } catch (e) {
            console.error('[SessionController] Socket emit error:', e.message);
        }

        return res.status(200).json({ message: `Đã đăng xuất ${otherIds.length} thiết bị khác` });
    } catch (error) {
        console.error('[SessionController] logoutAllOthers error:', error);
        return res.status(500).json({ message: 'Lỗi server', detail: error.message });
    }
};

/**
 * Cập nhật vị trí session bằng GPS coordinates (post-login async).
 * Frontend/Mobile gọi SAU KHI login thành công nếu đã có geolocation permission.
 */
const updateSessionLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const sessionId = req.sessionId;

        // Validation
        if (latitude == null || longitude == null || !sessionId) {
            return res.status(400).json({ message: 'Thiếu tọa độ hoặc session' });
        }

        // Range check
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({ message: 'Tọa độ không hợp lệ' });
        }

        // Reverse geocode → city name (fail-safe: trả fallback nếu API lỗi)
        const locationStr = await reverseGeocode(latitude, longitude);

        // Update session với GPS location
        await sessionModel.updateOne(
            { sessionId },
            {
                location: locationStr,
                locationSource: 'gps',
                coordinates: { lat: latitude, lng: longitude },
            }
        );

        return res.status(200).json({ location: locationStr, source: 'gps' });
    } catch (error) {
        console.error('[SessionController] updateSessionLocation error:', error.message);
        return res.status(500).json({ message: 'Cập nhật vị trí thất bại' });
    }
};

module.exports = {
    listSessions,
    logoutSession,
    logoutAllOthers,
    updateSessionLocation,
};
