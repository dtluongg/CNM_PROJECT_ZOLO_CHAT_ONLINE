const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if(!token){
            return res.status(401).json({message: 'Unauthorized, token khong duoc cung cap'});
        }

        jwt.verify(token, process.env.acc_secret, async (err, decodedUserPayload) => {
            if(err){
                return res.status(401).json({message: 'Unauthorized, token khong hop le'});
            }

            // ✅ Sửa tên field: passwordHash thay vì hashedPassword
            const userFind = await userModel.findById(decodedUserPayload.user_id)
                .select('-passwordHash'); // hoặc bỏ .select() nếu muốn lấy tất cả trừ password

            if(!userFind){
                return res.status(401).json({message: 'Unauthorized, user khong ton tai'});
            }

            req.user = userFind;
            next();
        });
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', detail: error.message});
    }
};

module.exports = authMiddleware;