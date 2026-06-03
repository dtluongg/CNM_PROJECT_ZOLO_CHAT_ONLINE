const { supabase } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không có token xác thực' });
    }

    const token = authHeader.split(' ')[1];

    // ── Thử verify Supabase token trước (retry 3 lần nếu socket drop) ──
    let supabaseUser = null;
    let supabaseNetworkFailed = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) {
                supabaseUser = user;
            }
            // Không retry nếu Supabase trả lời rõ ràng (kể cả lỗi token)
            break;
        } catch (e) {
            // Socket drop — retry
            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 300));
            else supabaseNetworkFailed = true;
        }
    }

    if (supabaseUser) {
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
        return next();
    }

    // Nếu Supabase bị lỗi mạng hoàn toàn (không phải token sai), báo lỗi rõ
    if (supabaseNetworkFailed) {
        console.error('[verifyToken] Supabase unreachable after 3 attempts');
        return res.status(503).json({ message: 'Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại.' });
    }

    // ── Thử verify local JWT ─────────────────────────────────────
    try {
        const decoded = jwt.verify(token, process.env.acc_secret);
        const user = await userModel.findById(decoded.user_id).select('-passwordHash');

        if (!user) {
            return res.status(401).json({ message: 'User không tồn tại' });
        }

        req.user = user;
        req.authType = 'local';
        return next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token không hợp lệ' });
        }
        console.error('Token verification error:', error);
        return res.status(500).json({ message: 'Lỗi xác thực token' });
    }
};

module.exports = verifyToken;