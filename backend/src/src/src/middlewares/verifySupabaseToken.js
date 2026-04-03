const { supabase } = require('../config/supabase');
const userModel = require('../models/userModel');

// Middleware verify JWT token cho SUPABASE auth (Google/Facebook/Email)
const verifySupabaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không có token xác thực' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Supabase verify token — không cần biết secret
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (error || !supabaseUser) {
            return res.status(401).json({ message: 'Token Supabase không hợp lệ hoặc đã hết hạn' });
        }

        // Tìm user trong MongoDB theo supabaseId
        let dbUser = await userModel.findOne({ supabaseId: supabaseUser.id });

        if (!dbUser) {
            // Fallback: tìm theo email (phòng trường hợp đã đăng ký local)
            dbUser = await userModel.findOne({ email: supabaseUser.email });

            if (dbUser) {
                // Liên kết supabaseId vào tài khoản cũ
                dbUser.supabaseId = supabaseUser.id;
                if (!dbUser.avatar && supabaseUser.user_metadata?.avatar_url) {
                    dbUser.avatar = supabaseUser.user_metadata.avatar_url;
                }
                await dbUser.save();
            } else {
                return res.status(404).json({
                    message: 'User chưa được đồng bộ. Vui lòng gọi POST /auth/sync-oauth trước',
                    code: 'USER_NOT_SYNCED',
                });
            }
        }

        req.supabaseUser = supabaseUser; // raw Supabase user
        req.user = dbUser;               // MongoDB user
        next();

    } catch (error) {
        console.error('Lỗi verify Supabase token:', error.message);
        return res.status(500).json({ message: 'Lỗi xác thực token' });
    }
};

module.exports = verifySupabaseToken;