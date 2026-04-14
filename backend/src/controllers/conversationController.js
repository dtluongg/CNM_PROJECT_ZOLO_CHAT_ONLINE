const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const Friendship = require('../models/friendshipModel');
const User = require('../models/userModel');

// Chuyển id string sang ObjectId để dùng trong aggregate/query có kiểu chặt chẽ.
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Lấy userId hiện tại từ middleware auth (hỗ trợ cả _id và id).
const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

const normalizeFriendPair = (userA, userB) => {
    const a = userA.toString();
    const b = userB.toString();
    return a < b ? { u1: a, u2: b } : { u1: b, u2: a };
};

const getDmBlockStatus = async (currentUserId, targetUserId) => {
    const { u1, u2 } = normalizeFriendPair(currentUserId, targetUserId);
    const friendship = await Friendship.findOne({ userId1: u1, userId2: u2 })
        .select('isBlockedBy')
        .lean();

    if (!friendship?.isBlockedBy) {
        return { iBlocked: false, blockedByOther: false };
    }

    const blockerId = friendship.isBlockedBy.toString();
    return {
        iBlocked: blockerId === currentUserId,
        blockedByOther: blockerId !== currentUserId,
    };
};

const getUsersWhoBlockedMeSet = async (currentUserId) => {
    const friendships = await Friendship.find({
        isBlockedBy: { $ne: null },
        $or: [{ userId1: currentUserId }, { userId2: currentUserId }],
    })
        .select('userId1 userId2 isBlockedBy')
        .lean();

    const blockedByOthers = new Set();
    for (const friendship of friendships) {
        const blockerId = friendship.isBlockedBy?.toString();
        if (!blockerId || blockerId === currentUserId) continue;

        const id1 = friendship.userId1.toString();
        const id2 = friendship.userId2.toString();
        const otherUserId = id1 === currentUserId ? id2 : id1;
        blockedByOthers.add(otherUserId);
    }

    return blockedByOthers;
};

// Chuẩn hóa dữ liệu conversation trả về client, tránh lộ field không cần thiết.
const pickConversationFields = (conversation) => ({
    _id: conversation._id,
    type: conversation.type,
    name: conversation.name,
    avatar: conversation.avatar,
    createdBy: conversation.createdBy,
    lastMessageId: conversation.lastMessageId,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageTime: conversation.lastMessageTime,
    isLocked: conversation.isLocked,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
});

const getDmDisplayInfo = async (conversationIds, currentUserId) => {
    if (!conversationIds.length) return new Map();

    const members = await ConversationMember.find({
        conversationId: { $in: conversationIds },
        leftAt: null,
        isDeleted: { $ne: true },
    })
        .populate('userId', '_id displayName avatar status')
        .lean();

    const map = new Map();
    for (const conversationId of conversationIds) {
        const convoMembers = members.filter((member) => member.conversationId.toString() === conversationId.toString());
        const otherMember = convoMembers.find((member) => member.userId && member.userId._id.toString() !== currentUserId) || null;

        if (otherMember?.userId) {
            map.set(conversationId.toString(), {
                otherUserId: otherMember.userId._id.toString(),
                name: otherMember.userId.displayName || 'Đoạn chat trực tiếp',
                avatar: otherMember.userId.avatar || '',
                otherUser: {
                    _id: otherMember.userId._id,
                    displayName: otherMember.userId.displayName || 'Đoạn chat trực tiếp',
                    avatar: otherMember.userId.avatar || '',
                    status: otherMember.userId.status || 'online',
                },
            });
        }
    }

    return map;
};

// Gắn thông tin membership của chính user vào item conversation để frontend render nhanh.
const buildConversationItem = (conversation, myMember, dmDisplayInfo = null) => {
    const base = pickConversationFields(conversation);

    if (conversation.type === 'dm' && dmDisplayInfo) {
        base.name = dmDisplayInfo.name || base.name;
        base.avatar = dmDisplayInfo.avatar || base.avatar;
        base.otherUserId = dmDisplayInfo.otherUserId;
        base.otherUser = dmDisplayInfo.otherUser;
    }

    return {
        ...base,
        myMembership: {
            role: myMember.role,
            unreadCount: myMember.unreadCount,
            lastReadMessageId: myMember.lastReadMessageId ?? null,
            aiSummary: myMember.aiSummary?.summary
              ? {
                  summary:      myMember.aiSummary.summary,
                  summarizedAt: myMember.aiSummary.summarizedAt,
                  unreadCount:  myMember.aiSummary.unreadCount,
                }
              : null,
            canSendMessages: myMember.canSendMessages,
            canInviteMembers: myMember.canInviteMembers,
            canManageMembers: myMember.canManageMembers,
            isArchived: myMember.isArchived,
            joinedAt: myMember.joinedAt,
            leftAt: myMember.leftAt,
        },
    };
};

// Validate ObjectId đầu vào, ném lỗi chuẩn để middleware errorHandler xử lý.
const ensureValidObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        const err = new Error(`${fieldName} không hợp lệ`);
        err.statusCode = 400;
        throw err;
    }
};

// Đảm bảo user đang là member active của conversation trước khi thao tác.
const requireConversationMember = async (conversationId, userId) => {
    const member = await ConversationMember.findOne({
        conversationId,
        userId,
        leftAt: null,
        isDeleted: { $ne: true },
    });

    if (!member) {
        const err = new Error('Bạn không thuộc cuộc trò chuyện này');
        err.statusCode = 403;
        throw err;
    }

    return member;
};

// Tìm DM đã tồn tại giữa 2 user để tránh tạo conversation trùng.
// Dùng approach đơn giản: tìm DM conversation mà cả 2 user đều là member.
const findExistingDmConversation = async (userId, targetUserId) => {
    // Bước 1: Lấy tất cả conversationId của userId
    const myMemberships = await ConversationMember.find({
        userId: toObjectId(userId.toString()),
    }).select('conversationId').lean();

    if (!myMemberships.length) return null;

    const myConvObjectIds = myMemberships.map((m) => m.conversationId);

    // Bước 2: Trong các conversation trên, tìm conversation mà targetUser cũng là member
    const sharedMemberships = await ConversationMember.find({
        conversationId: { $in: myConvObjectIds },
        userId: toObjectId(targetUserId.toString()),
    }).select('conversationId').lean();

    if (!sharedMemberships.length) return null;

    const sharedConvIds = sharedMemberships.map((m) => m.conversationId);

    // Bước 3: Lấy conversation type='dm' đầu tiên trong danh sách chung
    const dmConversation = await Conversation.findOne({
        _id: { $in: sharedConvIds },
        type: 'dm',
    });

    return dmConversation || null;
};

// Tạo mới DM trong transaction: 1 conversation + 2 bản ghi member.
const createDmConversation = async (userId, targetUserId, initialMessage = '') => {
    const session = await mongoose.startSession();

    try {
        let createdConversation = null;
        const normalizedInitialMessage = (initialMessage || '').toString().trim();

        await session.withTransaction(async () => {
            const conversation = await Conversation.create(
                [
                    {
                        type: 'dm',
                        name: '',
                        avatar: '',
                        createdBy: toObjectId(userId),
                        lastMessagePreview: normalizedInitialMessage,
                        lastMessageTime: normalizedInitialMessage ? new Date() : null,
                    },
                ],
                { session }
            );

            createdConversation = conversation[0];

            await ConversationMember.create(
                [
                    {
                        conversationId: createdConversation._id,
                        userId: toObjectId(userId),
                        role: 'member',
                        canSendMessages: true,
                        canInviteMembers: false,
                        canManageMembers: false,
                    },
                    {
                        conversationId: createdConversation._id,
                        userId: toObjectId(targetUserId),
                        role: 'member',
                        canSendMessages: true,
                        canInviteMembers: false,
                        canManageMembers: false,
                    },
                ],
                { session, ordered: true }
            );
        });

        return createdConversation;
    } finally {
        session.endSession();
    }
};

// Tạo group trong transaction: tạo conversation + owner + danh sách member ban đầu.
const createGroupConversation = async (userId, payload) => {
    const { name, avatar, memberIds = [] } = payload;

    if (!name || !name.trim()) {
        const err = new Error('Tên nhóm là bắt buộc');
        err.statusCode = 400;
        throw err;
    }

    const normalizedMemberIds = [...new Set(memberIds.map((id) => id.toString()))]
        .filter((id) => id !== userId);

    const session = await mongoose.startSession();

    try {
        let createdConversation = null;

        await session.withTransaction(async () => {
            const conversation = await Conversation.create(
                [
                    {
                        type: 'group',
                        name: name.trim(),
                        avatar: avatar || '',
                        createdBy: toObjectId(userId),
                    },
                ],
                { session }
            );

            createdConversation = conversation[0];

            const members = [
                {
                    conversationId: createdConversation._id,
                    userId: toObjectId(userId),
                    role: 'owner',
                    canSendMessages: true,
                    canInviteMembers: true,
                    canManageMembers: true,
                },
                ...normalizedMemberIds.map((id) => ({
                    conversationId: createdConversation._id,
                    userId: toObjectId(id),
                    role: 'member',
                    canSendMessages: true,
                    canInviteMembers: true,
                    canManageMembers: false,
                })),
            ];

            await ConversationMember.create(members, { session, ordered: true });
        });

        return createdConversation;
    } finally {
        session.endSession();
    }
};

// API tạo conversation (dm/group).
// - dm: kiểm tra target hợp lệ, chống DM trùng.
// - group: validate memberIds, kiểm tra user tồn tại, tạo owner/member mặc định.
const createConversation = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { type, name, avatar, targetUserId, memberIds, initialMessage } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực người dùng' });
        }

        if (!type || !['dm', 'group'].includes(type)) {
            return res.status(400).json({ message: 'type phải là dm hoặc group' });
        }

        if (type === 'dm') {
            ensureValidObjectId(targetUserId, 'targetUserId');

            const normalizedInitialMessage = (initialMessage || '').toString().trim();
            if (!normalizedInitialMessage) {
                return res.status(400).json({
                    message: 'DM mới chỉ được tạo khi có tin nhắn đầu tiên (initialMessage)',
                });
            }

            if (targetUserId.toString() === userId) {
                return res.status(400).json({ message: 'Không thể tạo DM với chính mình' });
            }

            const blockStatus = await getDmBlockStatus(userId, targetUserId.toString());
            if (blockStatus.blockedByOther) {
                return res.status(403).json({
                    message: 'Bạn đã bị người dùng này chặn, không thể tạo hoặc tiếp tục cuộc trò chuyện',
                });
            }

            const targetUser = await User.findById(targetUserId).select('_id');
            if (!targetUser) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng đích' });
            }

            const existingDm = await findExistingDmConversation(userId, targetUserId);
            if (existingDm) {
                await ConversationMember.updateOne(
                    {
                        conversationId: existingDm._id,
                        userId: toObjectId(userId),
                        leftAt: null,
                    },
                    {
                        $set: {
                            isDeleted: false,
                            deletedAt: null,
                            isArchived: false,
                        },
                    }
                );

                existingDm.lastMessagePreview = normalizedInitialMessage;
                existingDm.lastMessageTime = new Date();
                await existingDm.save();

                return res.status(200).json({
                    message: 'Đã tồn tại cuộc trò chuyện DM',
                    data: pickConversationFields(existingDm),
                });
            }

            const newConversation = await createDmConversation(userId, targetUserId, normalizedInitialMessage);
            return res.status(201).json({
                message: 'Tạo cuộc trò chuyện DM thành công',
                data: pickConversationFields(newConversation),
            });
        }

        if (!Array.isArray(memberIds)) {
            return res.status(400).json({ message: 'memberIds phải là mảng' });
        }

        for (const memberId of memberIds) {
            ensureValidObjectId(memberId, 'memberIds');
        }

        const uniqueMemberIds = [...new Set(memberIds.map((id) => id.toString()))]
            .filter((id) => id !== userId);

        if (uniqueMemberIds.length < 2) {
            return res.status(400).json({
                message: 'Tạo nhóm cần chọn tối thiểu 2 người bạn',
            });
        }

        if (uniqueMemberIds.length > 0) {
            const foundUsers = await User.countDocuments({ _id: { $in: uniqueMemberIds } });
            if (foundUsers !== uniqueMemberIds.length) {
                return res.status(404).json({ message: 'Một hoặc nhiều member không tồn tại' });
            }

            const friendshipDocs = await Friendship.find({
                isBlockedBy: null,
                $or: [
                    { userId1: userId, userId2: { $in: uniqueMemberIds } },
                    { userId1: { $in: uniqueMemberIds }, userId2: userId },
                ],
            })
                .select('userId1 userId2')
                .lean();

            const friendSet = new Set();
            for (const item of friendshipDocs) {
                const id1 = item.userId1.toString();
                const id2 = item.userId2.toString();
                const friendId = id1 === userId ? id2 : id1;
                friendSet.add(friendId);
            }

            const hasNonFriendMember = uniqueMemberIds.some((id) => !friendSet.has(id));
            if (hasNonFriendMember) {
                return res.status(400).json({
                    message: 'Chỉ có thể tạo nhóm với người đã là bạn bè',
                });
            }
        }

        const newGroup = await createGroupConversation(userId, { name, avatar, memberIds: uniqueMemberIds });

        return res.status(201).json({
            message: 'Tạo nhóm thành công',
            data: pickConversationFields(newGroup),
        });
    } catch (error) {
        next(error);
    }
};

// API tạo DM theo chuẩn rõ ràng: POST /conversations/dm
// Body kỳ vọng: { targetUserId }
const createDmConversationEndpoint = async (req, res, next) => {
    req.body = { ...req.body, type: 'dm' };
    return createConversation(req, res, next);
};

// API tạo Group theo chuẩn rõ ràng: POST /conversations/group
// Body kỳ vọng: { name, avatar?, memberIds[] }
const createGroupConversationEndpoint = async (req, res, next) => {
    req.body = { ...req.body, type: 'group' };
    return createConversation(req, res, next);
};

// API lấy danh sách conversation của user hiện tại.
// Hỗ trợ lọc archive qua query: archive=exclude|only|all (mặc định: exclude).
// Trả kèm myMembership để client biết quyền và unreadCount của chính user.
const listMyConversations = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const archiveMode = (req.query.archive || 'exclude').toString().toLowerCase();

        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực người dùng' });
        }

        if (!['exclude', 'only', 'all'].includes(archiveMode)) {
            return res.status(400).json({
                message: 'archive chỉ nhận: exclude | only | all',
            });
        }

        const memberFilter = {
            userId,
            leftAt: null,
            isDeleted: { $ne: true },
        };

        if (archiveMode === 'exclude') {
            memberFilter.isArchived = false;
        } else if (archiveMode === 'only') {
            memberFilter.isArchived = true;
        }

        const members = await ConversationMember.find({
            ...memberFilter,
        }).lean();

        if (!members.length) {
            return res.status(200).json({
                data: [],
                meta: { archive: archiveMode },
            });
        }

        const memberMap = new Map(
            members.map((m) => [m.conversationId.toString(), m])
        );

        const conversations = await Conversation.find({
            _id: { $in: members.map((m) => m.conversationId) },
        })
            .sort({ lastMessageTime: -1, updatedAt: -1 })
            .populate('createdBy', '_id displayName avatar')
            .populate('lastMessageId', '_id senderId content type createdAt')
            .lean();

        const dmDisplayMap = await getDmDisplayInfo(
            conversations.filter((conversation) => conversation.type === 'dm').map((conversation) => conversation._id),
            userId
        );
        const blockedByOthersSet = await getUsersWhoBlockedMeSet(userId);

        const memberCounts = await ConversationMember.aggregate([
            {
                $match: {
                    conversationId: { $in: members.map((m) => toObjectId(m.conversationId.toString())) },
                    leftAt: null,
                },
            },
            {
                $group: {
                    _id: '$conversationId',
                    totalMembers: { $sum: 1 },
                },
            },
        ]);

        const memberCountMap = new Map(
            memberCounts.map((item) => [item._id.toString(), item.totalMembers])
        );

        const data = conversations
            .filter((conversation) => {
                if (conversation.type !== 'dm') return true;
                const dmDisplayInfo = dmDisplayMap.get(conversation._id.toString());
                if (!dmDisplayInfo?.otherUserId) return true;
                return !blockedByOthersSet.has(dmDisplayInfo.otherUserId);
            })
            .map((conversation) => {
            const myMember = memberMap.get(conversation._id.toString());
            const dmDisplayInfo = dmDisplayMap.get(conversation._id.toString()) || null;
            return {
                ...buildConversationItem(conversation, myMember, dmDisplayInfo),
                totalMembers: memberCountMap.get(conversation._id.toString()) || 0,
            };
            });

        return res.status(200).json({
            data,
            meta: { archive: archiveMode },
        });
    } catch (error) {
        next(error);
    }
};

// API lấy chi tiết 1 conversation theo id.
// Chỉ cho phép member active xem và trả thêm tổng số thành viên hiện tại.
const getConversationById = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;

        ensureValidObjectId(conversationId, 'conversationId');

        const myMember = await requireConversationMember(conversationId, userId);

        const conversation = await Conversation.findById(conversationId)
            .populate('createdBy', '_id displayName avatar')
            .populate('lastMessageId', '_id senderId content type createdAt')
            .lean();

        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        const totalMembers = await ConversationMember.countDocuments({
            conversationId,
            leftAt: null,
        });

        const dmDisplayMap = conversation.type === 'dm'
            ? await getDmDisplayInfo([conversation._id], userId)
            : new Map();

        if (conversation.type === 'dm') {
            const dmDisplayInfo = dmDisplayMap.get(conversation._id.toString());
            if (dmDisplayInfo?.otherUserId) {
                const blockedByOthersSet = await getUsersWhoBlockedMeSet(userId);
                if (blockedByOthersSet.has(dmDisplayInfo.otherUserId)) {
                    return res.status(403).json({ message: 'Bạn không thể xem cuộc trò chuyện này' });
                }
            }
        }

        return res.status(200).json({
            data: {
                ...buildConversationItem(conversation, myMember, dmDisplayMap.get(conversation._id.toString()) || null),
                totalMembers,
            },
        });
    } catch (error) {
        next(error);
    }
};

// API cập nhật thông tin group (name/avatar).
// Chỉ owner/admin hoặc user có canManageMembers mới được sửa.
const updateConversationInfo = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const { name, avatar } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'group') {
            return res.status(400).json({ message: 'Chỉ nhóm mới được cập nhật thông tin' });
        }

        if (conversation.isLocked) {
            return res.status(400).json({ message: 'Nhóm đang bị khóa' });
        }

        const myMember = await requireConversationMember(conversationId, userId);

        if (!(myMember.role === 'owner' || myMember.role === 'admin' || myMember.canManageMembers)) {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật thông tin nhóm' });
        }

        const updates = {};
        if (name !== undefined) {
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Tên nhóm không được để trống' });
            }
            updates.name = name.trim();
        }

        if (avatar !== undefined) {
            updates.avatar = avatar || '';
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
        }

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            updates,
            { new: true }
        )
            .populate('createdBy', '_id displayName avatar')
            .populate('lastMessageId', '_id senderId content type createdAt')
            .lean();

        return res.status(200).json({
            message: 'Cập nhật thông tin nhóm thành công',
            data: buildConversationItem(updated, myMember),
        });
    } catch (error) {
        next(error);
    }
};

// API khóa/mở khóa group conversation.
// Policy: chỉ owner được khóa/mở khóa nhóm.
const setConversationLock = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const { isLocked } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');

        if (typeof isLocked !== 'boolean') {
            return res.status(400).json({ message: 'isLocked phải là boolean' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'group') {
            return res.status(400).json({ message: 'Chỉ group mới hỗ trợ khóa/mở khóa' });
        }

        const myMember = await requireConversationMember(conversationId, userId);

        if (myMember.role !== 'owner') {
            return res.status(403).json({ message: 'Bạn không có quyền khóa nhóm' });
        }

        conversation.isLocked = isLocked;
        await conversation.save();

        return res.status(200).json({
            message: isLocked ? 'Đã khóa cuộc trò chuyện' : 'Đã mở khóa cuộc trò chuyện',
            data: pickConversationFields(conversation),
        });
    } catch (error) {
        next(error);
    }
};

// API archive/unarchive conversation theo từng user.
// Trạng thái lưu tại ConversationMember.isArchived (không ảnh hưởng member khác).
const setConversationArchived = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const { isArchived } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');

        if (typeof isArchived !== 'boolean') {
            return res.status(400).json({ message: 'isArchived phải là boolean' });
        }

        const myMember = await requireConversationMember(conversationId, userId);

        myMember.isArchived = isArchived;
        await myMember.save();

        return res.status(200).json({
            message: isArchived ? 'Đã lưu trữ cuộc trò chuyện' : 'Đã bỏ lưu trữ cuộc trò chuyện',
        });
    } catch (error) {
        next(error);
    }
};

// API xóa cuộc trò chuyện phía tôi.
// Chỉ ảnh hưởng membership của người thao tác, không ảnh hưởng phía còn lại.
const deleteConversationForMe = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;

        ensureValidObjectId(conversationId, 'conversationId');

        const conversation = await Conversation.findById(conversationId).select('_id type');
        if (!conversation) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        if (conversation.type !== 'dm') {
            return res.status(400).json({
                message: 'Chỉ hỗ trợ xóa phía tôi cho cuộc trò chuyện trực tiếp (DM)',
            });
        }

        const member = await ConversationMember.findOne({
            conversationId,
            userId,
            leftAt: null,
        });

        if (!member) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện để xóa' });
        }

        member.isDeleted = true;
        member.deletedAt = new Date();
        member.isArchived = false;
        member.unreadCount = 0;
        await member.save();

        return res.status(200).json({
            message: 'Đã xóa cuộc trò chuyện khỏi danh sách của bạn',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createDmConversationEndpoint,
    createGroupConversationEndpoint,
    createConversation,
    listMyConversations,
    getConversationById,
    updateConversationInfo,
    setConversationLock,
    setConversationArchived,
    deleteConversationForMe,
};
