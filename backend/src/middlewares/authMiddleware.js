const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
    try {
<<<<<<< HEAD
        const token = req.headers.authorization?.split(' ')[1]; // Lấy token từ header Authorization;
    if(!token){
        return res.status(401).json({message: 'Unauthorized, token khong duoc cung cap'});
    }

    jwt.verify(token, process.env.acc_secret, async (err, decodedUserPayload) => {
        if(err){
            return res.status(401).json({message: 'Unauthorized, token khong hop le'});
        };

        // tim user tu trong payload:
        const userFind = await userModel.findById(decodedUserPayload.user_id).select('-hashedPassword'); // tìm user trong database bằng userId từ payload, loại bỏ trường hashedPassword khỏi kết quả trả về
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


=======
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

>>>>>>> af885422774871fd3da64395c6756203dad83779
module.exports = authMiddleware;