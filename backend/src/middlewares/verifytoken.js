const { supabase } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const { parseUserAgent, getLocationFromIP } = require('../untils/sessionHelper');
const { getIO } = require('../socket/socketManager');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const isSignout = req.originalUrl && req.originalUrl.includes('/signout');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (isSignout) return next();
        return res.status(401).json({ message: 'Không có token xác thực' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.decode(token, { complete: true });

    if (!decodedToken) {
        if (isSignout) return next();
        return res.status(401).json({ message: 'Token không đúng định dạng' });
    }

    const alg = decodedToken.header?.alg;
    const isSupabase = alg === 'RS256' || alg === 'ES256';

    // ── 1. TRƯỜNG HỢP: SUPABASE TOKEN (RS256/ES256) ───────────────────
    if (isSupabase) {
        try {
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

            if (!error && supabaseUser) {
                // Tìm theo supabaseId chính → linkedProviders → email (fallback)
                let dbUser = await userModel.findOne({ supabaseId: supabaseUser.id })
                    || await userModel.findOne({ 'linkedProviders.supabaseId': supabaseUser.id })
                    || await userModel.findOne({ email: supabaseUser.email });

                if (!dbUser) {
                    return res.status(401).json({
                        message: 'User chưa được đồng bộ',
                        code: 'USER_NOT_SYNCED',
                    });
                }

                req.supabaseUser = supabaseUser;
                req.user = dbUser;
                req.authType = 'supabase';

                // ── Quản lý Session cho Supabase User ─────────────────────
                const ua = req.headers['user-agent'];
                const clientSessionId = req.headers['x-zolo-session-id'];
                
                let ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
                if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

                const findQuery = { userId: dbUser._id };
                if (clientSessionId) {
                    findQuery.sessionId = clientSessionId;
                } else {
                    findQuery.userAgent = ua;
                    findQuery.isActive = true;
                }

                let session = await sessionModel.findOne(findQuery).sort({ lastActiveAt: -1 });

                if (clientSessionId && (!session || !session.isActive)) {
                    // Client gửi sessionId cụ thể (từ app/web) nhưng session đã bị kick hoặc không tồn tại -> force logout
                    return res.status(401).json({ message: 'Phiên đăng nhập đã bị kết thúc.', code: 'SESSION_TERMINATED' });
                }

                if (session) {
                    session.lastActiveAt = new Date();
                    
                    // CẬP NHẬT VỊ TRÍ ĐỘNG: Nếu IP thay đổi, cập nhật lại vị trí
                    if (ip !== session.ipAddress || !session.location || session.location === 'Localhost (Phát triển)' || session.location === 'Không rõ vị trí') {
                        const newLocation = await getLocationFromIP(ip);
                        if (newLocation && newLocation !== 'Không rõ vị trí') {
                            session.location = newLocation;
                            session.ipAddress = ip;
                        }
                    }
                    await session.save().catch(() => {});
                }

                req.sessionId = session?.sessionId || null;
                return next();
            }

            if (error) {
                if (isSignout) return next();
                if (error.message.includes('expired') || error.status === 401) {
                    return res.status(401).json({ message: 'Token Supabase đã hết hạn', code: 'TOKEN_EXPIRED' });
                }
                return res.status(401).json({ message: `Lỗi xác thực Supabase: ${error.message}` });
            }

            // Nếu đến đây mà chưa return (nghĩa là !supabaseUser && !error)
            if (isSignout) return next();
            return res.status(401).json({ message: 'Token Supabase không hợp lệ hoặc đã bị vô hiệu hóa' });

        } catch (supabaseError) {
            console.error('[VerifyToken] Supabase block error:', supabaseError.message);
            return res.status(500).json({ message: 'Lỗi hệ thống khi xác thực Supabase' });
        }
    }

    // ── 2. TRƯỜNG HỢP: LOCAL JWT (HS256) ─────────────────────────────────────
    try {
        const decoded = jwt.verify(token, process.env.acc_secret);
        
        const session = await sessionModel.findOne({ 
            sessionId: decoded.session_id
        });

        if (!session) {
            return res.status(401).json({ 
                message: 'Phiên đăng nhập không tồn tại', 
                code: 'SESSION_NOT_FOUND' 
            });
        }

        if (!session.isActive) {
            // Session đã bị kick chủ ý → trả 401, KHÔNG hồi sinh
            return res.status(401).json({ 
                message: 'Phiên đăng nhập đã bị kết thúc.', 
                code: 'SESSION_TERMINATED' 
            });
        }

        const user = await userModel.findById(decoded.user_id).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ message: 'User không tồn tại' });
        }

        // Cập nhật background
        (async () => {
            let currentIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
            if (currentIp && typeof currentIp === 'string' && currentIp.includes(',')) currentIp = currentIp.split(',')[0].trim();

            const updates = { lastActiveAt: new Date() };
            
            // CẬP NHẬT VỊ TRÍ ĐỘNG: Nếu IP thay đổi, cập nhật lại vị trí
            if (currentIp !== session.ipAddress || !session.location || session.location === 'Localhost (Phát triển)' || session.location === 'Không rõ vị trí') {
                const newLoc = await getLocationFromIP(currentIp);
                if (newLoc && newLoc !== 'Không rõ vị trí') {
                    updates.location = newLoc;
                    updates.ipAddress = currentIp;
                }
            }
            await sessionModel.updateOne({ sessionId: decoded.session_id }, updates).catch(() => {});
        })();

        req.user = user;
        req.sessionId = decoded.session_id;
        req.authType = 'local';
        return next();

    } catch (error) {
        if (isSignout) return next();
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
        }
        console.error('[VerifyToken] JWT Error:', error.message);
        return res.status(401).json({ message: 'Token không hợp lệ' });
    }
};

module.exports = verifyToken;