const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');

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

            // loại bỏ passwordHash
            const userFind = await userModel.findById(decodedUserPayload.user_id)
                .select('-passwordHash'); // hoặc bỏ .select() nếu muốn lấy tất cả trừ password

            if(!userFind){
                return res.status(401).json({message: 'Unauthorized, user khong ton tai'});
            }

            req.user = userFind;
            
            let sessionId = decodedUserPayload.session_id;

            // Fallback nếu login cũ thiếu session_id
            if (!sessionId) {
                const ua = req.headers['user-agent'];
                const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

                let session = await sessionModel.findOne({ 
                    userId: userFind._id, 
                    userAgent: ua,
                    isActive: true
                }).sort({ lastActiveAt: -1 });

                sessionId = session?.sessionId || null;
            }

            req.sessionId = sessionId;
            next();
        });
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', detail: error.message});
    }
};

module.exports = authMiddleware;