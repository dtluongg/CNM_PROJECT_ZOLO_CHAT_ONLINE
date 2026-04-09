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
            const isUser1 = f.userId1._id.toString() === userId;
            const friend = isUser1 ? f.userId2 : f.userId1;
            const nickname = isUser1 ? f.nickname2 : f.nickname1;

            return {
                friendshipId: f._id,
                friendId: friend._id,
                displayName: nickname || friend.displayName,
                originalName: friend.displayName,
                avatar: friend.avatar,
                email: friend.email,
                establishedAt: f.createdAt,
                isBlocked: f.isBlockedBy?.toString() === userId
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

// 5. Lấy danh sách Lời mời đã gửi đi (Outgoing)
exports.getOutgoingRequests = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const requests = await FriendRequest.find({
            fromUserId: userId,
            status: 'pending'
        }).populate('toUserId', 'displayName avatar email');

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// 6. Từ chối lời mời kết bạn (Reject)
exports.rejectFriendRequest = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const requestId = req.params.id;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Lời mời kết bạn không tồn tại." });
        }

        // Chắc chắn mình là người được nhận lời mời
        if (request.toUserId.toString() !== currentUserId) {
            return res.status(403).json({ success: false, message: "Không có quyền thực hiện." });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Lời mời này không ở trạng thái chờ." });
        }

        request.status = 'rejected';
        await request.save();

        res.status(200).json({
            success: true,
            message: "Đã từ chối lời mời kết bạn."
        });
    } catch (error) {
        next(error);
    }
};

// 7. Thu hồi lời mời kết bạn đã gửi (Cancel)
exports.cancelFriendRequest = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const requestId = req.params.id;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Lời mời kết bạn không tồn tại." });
        }

        // Chắc chắn mình là người GỬI lời mời
        if (request.fromUserId.toString() !== currentUserId) {
            return res.status(403).json({ success: false, message: "Không có quyền thực hiện." });
        }

        await request.deleteOne();

        res.status(200).json({
            success: true,
            message: "Đã thu hồi lời mời kết bạn."
        });
    } catch (error) {
        next(error);
    }
};

// 8. Hủy kết bạn (Unfriend)
exports.unfriend = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.userId;

        const u1 = currentUserId < targetUserId ? currentUserId : targetUserId;
        const u2 = currentUserId < targetUserId ? targetUserId : currentUserId;

        const friendship = await Friendship.findOneAndDelete({ userId1: u1, userId2: u2 });
        if (!friendship) {
             return res.status(404).json({ success: false, message: "Hai người chưa từng kết bạn." });
        }

        res.status(200).json({
            success: true,
            message: "Hủy kết bạn thành công."
        });
    } catch (error) {
        next(error);
    }
};

// 9. Cập nhật biệt danh
exports.updateNickname = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.userId;
        const { nickname } = req.body;

        const u1 = currentUserId < targetUserId ? currentUserId : targetUserId;
        const u2 = currentUserId < targetUserId ? targetUserId : currentUserId;

        const friendship = await Friendship.findOne({ userId1: u1, userId2: u2 });
        if (!friendship) {
             return res.status(404).json({ success: false, message: "Hai bạn chưa kết bạn." });
        }

        if (currentUserId === u1) {
            friendship.nickname2 = nickname; // Mình (1) đặt tên cho bạn (2)
        } else {
            friendship.nickname1 = nickname; // Mình (2) đặt tên cho bạn (1)
        }

        await friendship.save();

        res.status(200).json({
            success: true,
            message: "Đã đổi biệt danh.",
            data: friendship
        });
    } catch (error) {
        next(error);
    }
};

// 10. Chặn bạn bè (Block)
exports.blockFriend = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.userId;

        const u1 = currentUserId < targetUserId ? currentUserId : targetUserId;
        const u2 = currentUserId < targetUserId ? targetUserId : currentUserId;

        const friendship = await Friendship.findOne({ userId1: u1, userId2: u2 });
        if (!friendship) {
             return res.status(404).json({ success: false, message: "Hai bạn chưa kết bạn." });
        }

        let message = '';
        if (friendship.isBlockedBy && friendship.isBlockedBy.toString() === currentUserId) {
             friendship.isBlockedBy = null;
             message = 'Đã bỏ chặn người dùng.';
        } else {
             friendship.isBlockedBy = currentUserId;
             message = 'Đã chặn người dùng.';
        }
        await friendship.save();

        res.status(200).json({
            success: true,
            message: message,
            data: friendship
        });
    } catch (error) {
        next(error);
    }
};
