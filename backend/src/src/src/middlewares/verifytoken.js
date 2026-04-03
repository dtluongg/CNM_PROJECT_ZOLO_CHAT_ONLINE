const { supabase } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không có token xác thực' });
    }

    const token = authHeader.split(' ')[1];

    // ── Thử verify Supabase token trước ─────────────────────────
    try {
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (!error && supabaseUser) {
            // Tìm theo supabaseId chính → linkedProviders → email (fallback)
            let dbUser = await userModel.findOne({ supabaseId: supabaseUser.id })
                || await userModel.findOne({ 'linkedProviders.supabaseId': supabaseUser.id })
                || await userModel.findOne({ email: supabaseUser.email });

            if (!dbUser) {
                return res.status(404).json({
                    message: 'User chưa được đồng bộ',
                    code: 'USER_NOT_SYNCED',
                });
            }

            req.supabaseUser = supabaseUser;
            req.user = dbUser;
            req.authType = 'supabase';
            return next();
        }

        // Có error từ Supabase nhưng không throw (ví dụ token hết hạn)
        if (error) {
            // Nếu lỗi là expired, trả về ngay
            if (error.message?.includes('expired') || error.status === 401) {
                return res.status(401).json({
                    message: 'Token Supabase đã hết hạn',
                    code: 'TOKEN_EXPIRED'
                });
            }
        }
    } catch (supabaseError) {
        // Supabase throw error, tiếp tục thử local JWT
        console.log('Supabase verify failed, trying local JWT...');
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