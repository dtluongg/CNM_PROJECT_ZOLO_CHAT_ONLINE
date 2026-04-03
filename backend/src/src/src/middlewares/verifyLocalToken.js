const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Middleware verify JWT token cho LOCAL auth (username/password)
const verifyLocalToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không có token xác thực' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.acc_secret);

        const user = await userModel.findById(decoded.user_id).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ message: 'User không tồn tại' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token không hợp lệ' });
        }
        return res.status(500).json({ message: 'Lỗi xác thực token' });
    }
};

module.exports = verifyLocalToken;