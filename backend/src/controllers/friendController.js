const FriendRequest = require('../models/friendRequestModel');
const Friendship = require('../models/friendshipModel');
const User = require('../models/userModel');

// 1. Gửi lời mời kết bạn
exports.sendFriendRequest = async (req, res, next) => {
    try {
        const fromUserId = req.user.id; // Lấy từ middleware verifyToken
        const { toUserId } = req.body;

        if (fromUserId === toUserId) {
            return res.status(400).json({ success: false, message: "Không thể tự kết bạn với chính mình." });
        }

        // Kiểm tra xem đã là bạn bè chưa
        const isFriend = await Friendship.findOne({
            $or: [
                { userId1: fromUserId, userId2: toUserId },
                { userId1: toUserId, userId2: fromUserId }
            ]
        });

        if (isFriend) {
            return res.status(400).json({ success: false, message: "Hai người đã là bạn bè." });
        }

        // Kiểm tra xem đã gửi request chờ chưa
        const existingRequest = await FriendRequest.findOne({
            fromUserId,
            toUserId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: "Bạn đã gửi lời mời rồi, vui lòng chờ." });
        }

        const newRequest = new FriendRequest({
            fromUserId,
            toUserId,
            status: 'pending'
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            message: "Gửi lời mời kết bạn thành công",
            data: newRequest
        });
    } catch (error) {
        next(error);
    }
};

// 2. Chấp nhận lời mời kết bạn
exports.acceptFriendRequest = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const requestId = req.params.id;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Lời mời kết bạn không tồn tại." });
        }

        // Đảm bảo chỉ người ĐƯỢC MỜI mới có quyền đồng ý
        if (request.toUserId.toString() !== currentUserId) {
            return res.status(403).json({ success: false, message: "Không có quyền thực hiện." });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Lời mời này không ở trạng thái chờ." });
        }

        request.status = 'accepted';
        await request.save();

        // Tạo bản ghi Friendship
        // Luôn nhét ID nhỏ hơn vào userId1
        const u1 = currentUserId < request.fromUserId.toString() ? currentUserId : request.fromUserId.toString();
        const u2 = currentUserId < request.fromUserId.toString() ? request.fromUserId.toString() : currentUserId;

        const newFriendship = new Friendship({
            userId1: u1,
            userId2: u2
        });

        await newFriendship.save();

        res.status(200).json({
            success: true,
            message: "Chấp nhận kết bạn thành công",
            data: newFriendship
        });
    } catch (error) {
        next(error);
    }
};

// 3. Lấy ra danh sách bạn bè của mình
exports.getFriendList = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Tìm tất cả record có chứa userId của mình
        const friendships = await Friendship.find({
            $or: [{ userId1: userId }, { userId2: userId }]
        })
        .populate('userId1', 'displayName avatar email')
        .populate('userId2', 'displayName avatar email');

        // Bóc tách dữ liệu để trả về đúng cấu trúc danh sách người
        const friendList = friendships.map(f => {
            // Xác định xem ai là bạn của mình trong dòng record này
            const friend = f.userId1._id.toString() === userId ? f.userId2 : f.userId1;
            return {
                friendshipId: f._id,
                friendId: friend._id,
                displayName: friend.displayName,
                avatar: friend.avatar,
                email: friend.email,
                establishedAt: f.createdAt
            };
        });

        res.status(200).json({
            success: true,
            data: friendList
        });
    } catch (error) {
        next(error);
    }
};

// 4. Lấy danh sách Lời mời đến mình (Incoming)
exports.getIncomingRequests = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const requests = await FriendRequest.find({
            toUserId: userId,
            status: 'pending'
        }).populate('fromUserId', 'displayName avatar email');

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};
