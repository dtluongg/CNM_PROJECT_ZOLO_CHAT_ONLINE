const FriendRequest = require('../models/friendRequestModel');
const Friendship = require('../models/friendshipModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { createAndEmitNotification } = require('../services/notificationService');

const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

const ensureValidObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        const error = new Error(`${fieldName} không hợp lệ`);
        error.statusCode = 400;
        throw error;
    }
};

const normalizeFriendPair = (userA, userB) => {
    const a = userA.toString();
    const b = userB.toString();
    return a < b ? { u1: a, u2: b } : { u1: b, u2: a };
};

// Tính thời gian cooldown theo số lần từ chối: 5p -> 10p -> 1 ngày
const calculateRejectCooldown = (rejectCount) => {
    if (rejectCount === 1) return 5 * 60 * 1000; // 5 phút
    if (rejectCount === 2) return 10 * 60 * 1000; // 10 phút
    return 24 * 60 * 60 * 1000; // 1 ngày cho 3+ lần
};

// Kiểm tra xem có thể gửi lời mời sau reject chưa (dựa trên cooldown)
const canSendAfterReject = async (fromUserId, toUserId) => {
    const rejectedRequests = await FriendRequest.find({
        fromUserId,
        toUserId,
        status: 'rejected',
    }).sort({ updatedAt: -1 }).limit(1).lean();

    if (rejectedRequests.length === 0) return true;

    const lastRejected = rejectedRequests[0];
    const rejectCount = await FriendRequest.countDocuments({
        fromUserId,
        toUserId,
        status: 'rejected',
    });

    const cooldownMs = calculateRejectCooldown(rejectCount);
    const timeSinceReject = Date.now() - new Date(lastRejected.updatedAt).getTime();

    return timeSinceReject >= cooldownMs;
};

// Kiểm tra xem A có bị B chặn hay B bị A chặn (2 chiều)
const getBlockStatus = async (userA, userB) => {
    const { u1, u2 } = normalizeFriendPair(userA, userB);
    const friendship = await Friendship.findOne({ userId1: u1, userId2: u2 }).lean();

    if (!friendship) return { iBlocked: false, heBlockedMe: false };

    const aIsU1 = userA.toString() === u1;
    const blockerIsA = friendship.isBlockedBy?.toString() === userA.toString();
    const blockerIsB = friendship.isBlockedBy?.toString() === userB.toString();

    return {
        iBlocked: blockerIsA, // Tôi chặn họ
        heBlockedMe: blockerIsB, // Họ chặn tôi
    };
};

// 1. Gửi lời mời kết bạn
const sendFriendRequest = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const fromUserId = getCurrentUserId(req); // Lấy từ middleware verifyToken
        const { toUserId } = req.body;

        ensureValidObjectId(fromUserId, 'fromUserId');
        ensureValidObjectId(toUserId, 'toUserId');

        if (fromUserId === toUserId) {
            return res.status(400).json({ success: false, message: "Không thể tự kết bạn với chính mình." });
        }

        const targetUser = await User.findById(toUserId).select('_id').lean();
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Người dùng đích không tồn tại.' });
        }

        const { u1, u2 } = normalizeFriendPair(fromUserId, toUserId);

        // Kiểm tra xem đã là bạn bè chưa
        const isFriend = await Friendship.findOne({ userId1: u1, userId2: u2 }).lean();

        if (isFriend) {
            return res.status(400).json({ success: false, message: "Hai người đã là bạn bè." });
        }

        // Kiểm tra xem có bị chặn hay chặn đối phương không (2 chiều)
        const blockStatus = await getBlockStatus(fromUserId, toUserId);
        if (blockStatus.heBlockedMe) {
            return res.status(403).json({ success: false, message: "Không thể kết bạn tới người này" });
        }
        if (blockStatus.iBlocked) {
            return res.status(403).json({ success: false, message: "Bạn đã chặn người dùng này, không thể gửi lời mời." });
        }

        // Kiểm tra cooldown sau reject
        const canSend = await canSendAfterReject(fromUserId, toUserId);
        if (!canSend) {
            const rejectCount = await FriendRequest.countDocuments({
                fromUserId,
                toUserId,
                status: 'rejected',
            });
            const cooldownMs = calculateRejectCooldown(rejectCount);
            const cooldownMinutes = rejectCount < 3 ? (cooldownMs / 60000) : 1440;
            return res.status(429).json({
                success: false,
                message: `Người dùng từ chối lời mời của bạn ${rejectCount} lần. Vui lòng chờ ${cooldownMinutes} phút.`,
                cooldownMinutes,
            });
        }

        // Nếu đã có lời mời ngược chiều đang pending thì auto-accept an toàn bằng transaction.
        const reversePendingRequest = await FriendRequest.findOne({
            fromUserId: toUserId,
            toUserId: fromUserId,
            status: 'pending',
        }).lean();

        if (reversePendingRequest) {
            let friendship = null;

            await session.withTransaction(async () => {
                const requestDoc = await FriendRequest.findById(reversePendingRequest._id).session(session);
                if (!requestDoc || requestDoc.status !== 'pending') {
                    return;
                }

                requestDoc.status = 'accepted';
                await requestDoc.save({ session });

                friendship = await Friendship.findOneAndUpdate(
                    { userId1: u1, userId2: u2 },
                    { $setOnInsert: { userId1: u1, userId2: u2 } },
                    { upsert: true, new: true, session }
                );
            });

            return res.status(200).json({
                success: true,
                message: 'Đã tự động chấp nhận lời mời kết bạn đang chờ từ đối phương.',
                data: friendship,
            });
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

        try {
            await createAndEmitNotification({
                userId: toUserId,
                actorId: fromUserId,
                type: 'friend_request',
                title: 'Bạn có lời mời kết bạn mới',
                body: `${req.user?.displayName || 'Ai đó'} đã gửi lời mời kết bạn cho bạn`,
                friendRequestId: newRequest._id,
            });
        } catch (notifyErr) {
            console.error('friend request notification error:', notifyErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Gửi lời mời kết bạn thành công",
            data: newRequest
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// 2. Chấp nhận lời mời kết bạn
const acceptFriendRequest = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const currentUserId = getCurrentUserId(req);
        const requestId = req.params.id;
        ensureValidObjectId(currentUserId, 'currentUserId');
        ensureValidObjectId(requestId, 'requestId');

        let friendship = null;

        await session.withTransaction(async () => {
            const request = await FriendRequest.findById(requestId).session(session);
            if (!request) {
                const err = new Error('Lời mời kết bạn không tồn tại.');
                err.statusCode = 404;
                throw err;
            }

            // Đảm bảo chỉ người ĐƯỢC MỜI mới có quyền đồng ý
            if (request.toUserId.toString() !== currentUserId) {
                const err = new Error('Không có quyền thực hiện.');
                err.statusCode = 403;
                throw err;
            }

            if (request.status !== 'pending') {
                const err = new Error('Lời mời này không ở trạng thái chờ.');
                err.statusCode = 400;
                throw err;
            }

            request.status = 'accepted';
            await request.save({ session });

            const { u1, u2 } = normalizeFriendPair(currentUserId, request.fromUserId.toString());

            friendship = await Friendship.findOneAndUpdate(
                { userId1: u1, userId2: u2 },
                { $setOnInsert: { userId1: u1, userId2: u2 } },
                { upsert: true, new: true, session }
            );

            // Đồng bộ trạng thái lời mời ngược chiều (nếu có) để tránh pending mâu thuẫn.
            await FriendRequest.updateMany(
                {
                    fromUserId: currentUserId,
                    toUserId: request.fromUserId,
                    status: 'pending',
                },
                { $set: { status: 'canceled' } },
                { session }
            );
        });

        res.status(200).json({
            success: true,
            message: "Chấp nhận kết bạn thành công",
            data: friendship
        });

        try {
            const requesterId = friendship.userId1.toString() === currentUserId
                ? friendship.userId2
                : friendship.userId1;

            await createAndEmitNotification({
                userId: requesterId,
                actorId: currentUserId,
                type: 'friend_accepted',
                title: 'Lời mời kết bạn đã được chấp nhận',
                body: `${req.user?.displayName || 'Ai đó'} đã chấp nhận lời mời kết bạn của bạn`,
            });
        } catch (notifyErr) {
            console.error('friend accepted notification error:', notifyErr.message);
        }
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// 3. Lấy ra danh sách bạn bè của mình
const getFriendList = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const includeBlocked = (req.query.includeBlocked || 'false').toString().toLowerCase() === 'true';

        // Tìm tất cả record có chứa userId của mình
        const friendships = await Friendship.find({
            $or: [{ userId1: userId }, { userId2: userId }]
        })
            .populate('userId1', 'displayName avatar email')
            .populate('userId2', 'displayName avatar email')
            .sort({ updatedAt: -1 });

        // Bóc tách dữ liệu để trả về đúng cấu trúc danh sách người
        let friendList = friendships.map(f => {
            const isUser1 = f.userId1._id.toString() === userId;
            const friend = isUser1 ? f.userId2 : f.userId1;
            const nickname = isUser1 ? f.nickname2 : f.nickname1;
            const iBlockedThem = f.isBlockedBy?.toString() === userId;
            const theyBlockedMe = f.isBlockedBy && f.isBlockedBy.toString() !== userId;

            return {
                friendshipId: f._id,
                friendId: friend._id,
                displayName: nickname || friend.displayName,
                originalName: friend.displayName,
                avatar: friend.avatar,
                email: friend.email,
                establishedAt: f.createdAt,
                iBlocked: iBlockedThem, // Tôi chặn họ
                theyBlockedMe: theyBlockedMe, // Họ chặn tôi
            };
        });

        // Lọc bạn bè bị chặn nếu không request includeBlocked
        if (!includeBlocked) {
            friendList = friendList.filter(f => !f.iBlocked && !f.theyBlockedMe);
        }

        res.status(200).json({
            success: true,
            data: friendList,
            meta: { includeBlocked },
        });
    } catch (error) {
        next(error);
    }
};

// 4. Lấy danh sách Lời mời đến mình (Incoming)
const getIncomingRequests = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const requests = await FriendRequest.find({
            toUserId: userId,
            status: 'pending'
        }).populate('fromUserId', 'displayName avatar email').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// 5. Lấy danh sách Lời mời đã gửi đi (Outgoing)
const getOutgoingRequests = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const requests = await FriendRequest.find({
            fromUserId: userId,
            status: 'pending'
        }).populate('toUserId', 'displayName avatar email').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// 6. Từ chối lời mời kết bạn (Reject)
const rejectFriendRequest = async (req, res, next) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const requestId = req.params.id;
        ensureValidObjectId(currentUserId, 'currentUserId');
        ensureValidObjectId(requestId, 'requestId');

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
const cancelFriendRequest = async (req, res, next) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const requestId = req.params.id;
        ensureValidObjectId(currentUserId, 'currentUserId');
        ensureValidObjectId(requestId, 'requestId');

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Lời mời kết bạn không tồn tại." });
        }

        // Chắc chắn mình là người GỬI lời mời
        if (request.fromUserId.toString() !== currentUserId) {
            return res.status(403).json({ success: false, message: "Không có quyền thực hiện." });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể thu hồi lời mời đang chờ.' });
        }

        request.status = 'canceled';
        await request.save();

        res.status(200).json({
            success: true,
            message: "Đã thu hồi lời mời kết bạn."
        });
    } catch (error) {
        next(error);
    }
};

// 8. Hủy kết bạn (Unfriend)
const unfriend = async (req, res, next) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const targetUserId = req.params.userId;
        ensureValidObjectId(currentUserId, 'currentUserId');
        ensureValidObjectId(targetUserId, 'targetUserId');

        const { u1, u2 } = normalizeFriendPair(currentUserId, targetUserId);

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
const updateNickname = async (req, res, next) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const targetUserId = req.params.userId;
        const { nickname } = req.body;
        ensureValidObjectId(currentUserId, 'currentUserId');
        ensureValidObjectId(targetUserId, 'targetUserId');

        const { u1, u2 } = normalizeFriendPair(currentUserId, targetUserId);

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
const blockFriend = async (req, res, next) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const targetUserId = req.params.userId;
        ensureValidObjectId(currentUserId, 'currentUserId');
        ensureValidObjectId(targetUserId, 'targetUserId');

        const { u1, u2 } = normalizeFriendPair(currentUserId, targetUserId);

        const friendship = await Friendship.findOne({ userId1: u1, userId2: u2 });
        if (!friendship) {
            return res.status(404).json({ success: false, message: "Hai bạn chưa kết bạn." });
        }

        // Logic 1 chiều: nếu người kia đã chặn mình thì mình không được ghi đè trạng thái block.
        let message = '';
        if (friendship.isBlockedBy && friendship.isBlockedBy.toString() === currentUserId) {
            // Tôi đã chặn, bây giờ bỏ chặn
            friendship.isBlockedBy = null;
            message = 'Đã bỏ chặn người dùng.';
        } else if (friendship.isBlockedBy && friendship.isBlockedBy.toString() !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn đang bị người dùng này chặn và không thể thay đổi trạng thái chặn.',
            });
        } else {
            // Tôi chặn người kia.
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

// 11. Lấy danh sách người bị chặn (Blocked List)
const getBlockedList = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);

        // Tìm tất cả friendship record có blockedBy là current user (chỉ những người tôi chặn)
        const friendships = await Friendship.find({
            $or: [{ userId1: userId }, { userId2: userId }],
            isBlockedBy: userId  // Chỉ trả về những người tôi chặn
        })
            .populate('userId1', 'displayName avatar email')
            .populate('userId2', 'displayName avatar email')
            .sort({ updatedAt: -1 });

        // Bóc tách dữ liệu để trả về danh sách những người tôi chặn
        const blockedList = friendships.map(f => {
            const isUser1 = f.userId1._id.toString() === userId;
            const blockedUser = isUser1 ? f.userId2 : f.userId1;

            return {
                friendshipId: f._id,
                userId: blockedUser._id,
                displayName: blockedUser.displayName,
                avatar: blockedUser.avatar,
                email: blockedUser.email,
                blockedAt: f.updatedAt
            };
        });

        res.status(200).json({
            success: true,
            data: blockedList,
            meta: { total: blockedList.length },
        });
    } catch (error) {
        next(error);
    }
};

const getFriendStatus = async (req, res, next) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const { userId } = req.params;

        ensureValidObjectId(userId, 'userId');

        const { u1, u2 } = normalizeFriendPair(currentUserId, userId);

        const [friendship, sentReq, receivedReq] = await Promise.all([
            Friendship.findOne({ userId1: u1, userId2: u2 }).lean(),
            FriendRequest.findOne({ fromUserId: currentUserId, toUserId: userId, status: 'pending' }).lean(),
            FriendRequest.findOne({ fromUserId: userId, toUserId: currentUserId, status: 'pending' }).lean(),
        ]);

        if (friendship) {
            const iBlockedThem = friendship.isBlockedBy?.toString() === currentUserId;
            const theyBlockedMe = !!(friendship.isBlockedBy && friendship.isBlockedBy.toString() !== currentUserId);
            return res.json({
                success: true,
                data: { status: 'friends', isFriend: true, iBlocked: iBlockedThem, theyBlockedMe },
            });
        }

        if (sentReq) {
            return res.json({ success: true, data: { status: 'sent', requestId: sentReq._id, isFriend: false } });
        }

        if (receivedReq) {
            return res.json({ success: true, data: { status: 'received', requestId: receivedReq._id, isFriend: false } });
        }

        res.json({ success: true, data: { status: 'none', isFriend: false, iBlocked: false, theyBlockedMe: false } });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    getFriendList,
    getIncomingRequests,
    getOutgoingRequests,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    updateNickname,
    blockFriend,
    getBlockedList,
    getFriendStatus,
}