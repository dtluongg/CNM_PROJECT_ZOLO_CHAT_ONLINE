const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const User = require('../models/userModel');

// Lấy userId hiện tại từ middleware auth (hỗ trợ cả _id và id).
const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

// Validate ObjectId để tránh query sai định dạng.
const ensureValidObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        const err = new Error(`${fieldName} không hợp lệ`);
        err.statusCode = 400;
        throw err;
    }
};

// Lấy conversation theo id và đảm bảo tồn tại.
const requireConversation = async (conversationId) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        const err = new Error('Không tìm thấy cuộc trò chuyện');
        err.statusCode = 404;
        throw err;
    }
    return conversation;
};

// Đảm bảo conversation là group (không áp dụng member-management cho DM).
const ensureGroupConversation = (conversation) => {
    if (conversation.type !== 'group') {
        const err = new Error('Chức năng này chỉ áp dụng cho nhóm chat');
        err.statusCode = 400;
        throw err;
    }
};

// Lấy membership active của user hiện tại trong group.
const requireActiveMembership = async (conversationId, userId) => {
    const myMember = await ConversationMember.findOne({
        conversationId,
        userId,
        leftAt: null,
    });

    if (!myMember) {
        const err = new Error('Bạn không thuộc nhóm này');
        err.statusCode = 403;
        throw err;
    }

    return myMember;
};

// Kiểm tra vai trò owner/admin để áp dụng policy quyền rõ ràng.
const isOwner = (member) => member.role === 'owner';
const isAdmin = (member) => member.role === 'admin';

// API thêm thành viên vào nhóm (hỗ trợ thêm 1 hoặc nhiều user).
// Body hỗ trợ:
// - memberUserId: string (thêm 1 người)
// - memberUserIds: string[] (thêm nhiều người)
// Policy: owner luôn thêm được; admin/member thêm được khi có canInviteMembers = true.
const addConversationMembers = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const { memberUserId, memberUserIds } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');

        const rawIds = [];
        if (memberUserId !== undefined) rawIds.push(memberUserId);
        if (Array.isArray(memberUserIds)) rawIds.push(...memberUserIds);

        const normalizedIds = [...new Set(rawIds.map((id) => id?.toString()).filter(Boolean))]
            .filter((id) => id !== userId);

        if (!normalizedIds.length) {
            return res.status(400).json({
                message: 'Cần truyền memberUserId hoặc memberUserIds (khác user hiện tại)',
            });
        }

        for (const id of normalizedIds) {
            ensureValidObjectId(id, 'memberUserIds');
        }

        await session.withTransaction(async () => {
            const conversation = await Conversation.findById(conversationId).session(session);
            if (!conversation) {
                const err = new Error('Không tìm thấy cuộc trò chuyện');
                err.statusCode = 404;
                throw err;
            }

            ensureGroupConversation(conversation);

            if (conversation.isLocked) {
                const err = new Error('Nhóm đang bị khóa, không thể thêm thành viên');
                err.statusCode = 400;
                throw err;
            }

            const myMember = await ConversationMember.findOne({
                conversationId,
                userId,
                leftAt: null,
            }).session(session);

            if (!myMember) {
                const err = new Error('Bạn không thuộc nhóm này');
                err.statusCode = 403;
                throw err;
            }

            if (!isOwner(myMember) && !myMember.canInviteMembers) {
                const err = new Error('Bạn không có quyền thêm thành viên vào nhóm');
                err.statusCode = 403;
                throw err;
            }

            const existingUsers = await User.countDocuments({ _id: { $in: normalizedIds } }).session(session);
            if (existingUsers !== normalizedIds.length) {
                const err = new Error('Một hoặc nhiều user cần thêm không tồn tại');
                err.statusCode = 404;
                throw err;
            }

            const existingMembers = await ConversationMember.find({
                conversationId,
                userId: { $in: normalizedIds },
            }).session(session);

            const existingMemberMap = new Map(
                existingMembers.map((member) => [member.userId.toString(), member])
            );

            const toInsert = [];
            const toRejoin = [];
            const skipped = [];
            const now = new Date();

            for (const targetId of normalizedIds) {
                const existed = existingMemberMap.get(targetId);

                if (!existed) {
                    toInsert.push({
                        conversationId,
                        userId: targetId,
                        role: 'member',
                        joinedAt: now,
                        leftAt: null,
                        canSendMessages: true,
                        canInviteMembers: true,
                        canManageMembers: false,
                        isArchived: false,
                    });
                    continue;
                }

                if (existed.leftAt === null) {
                    skipped.push(targetId);
                    continue;
                }

                existed.leftAt = null;
                existed.role = 'member';
                existed.joinedAt = now;
                existed.canSendMessages = true;
                existed.canInviteMembers = true;
                existed.canManageMembers = false;
                existed.isArchived = false;
                toRejoin.push(existed);
            }

            for (const memberDoc of toRejoin) {
                await memberDoc.save({ session });
            }

            if (toInsert.length) {
                await ConversationMember.insertMany(toInsert, { session, ordered: true });
            }

            res.status(200).json({
                message: 'Thêm thành viên vào nhóm thành công',
                data: {
                    addedUserIds: toInsert.map((item) => item.userId),
                    rejoinedUserIds: toRejoin.map((item) => item.userId.toString()),
                    skippedUserIds: skipped,
                },
            });
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// API lấy danh sách tất cả thành viên trong nhóm.
// Mặc định chỉ trả member đang active; hỗ trợ includeLeft=true để lấy cả member đã rời.
const listConversationMembers = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const includeLeft = (req.query.includeLeft || 'false').toString().toLowerCase() === 'true';

        ensureValidObjectId(conversationId, 'conversationId');

        const conversation = await requireConversation(conversationId);
        ensureGroupConversation(conversation);

        await requireActiveMembership(conversationId, userId);

        const filter = { conversationId };
        if (!includeLeft) {
            filter.leftAt = null;
        }

        const members = await ConversationMember.find(filter)
            .populate('userId', '_id displayName username email avatar status statusText')
            .sort({ role: 1, joinedAt: 1 })
            .lean();

        const data = members.map((member) => ({
            _id: member._id,
            conversationId: member.conversationId,
            role: member.role,
            joinedAt: member.joinedAt,
            leftAt: member.leftAt,
            unreadCount: member.unreadCount,
            canSendMessages: member.canSendMessages,
            canInviteMembers: member.canInviteMembers,
            canManageMembers: member.canManageMembers,
            isArchived: member.isArchived,
            user: member.userId,
        }));

        return res.status(200).json({
            data,
            meta: { includeLeft },
        });
    } catch (error) {
        next(error);
    }
};

// API giải tán nhóm.
// Theo yêu cầu: owner có thể giải tán -> khóa nhóm và cho toàn bộ thành viên rời nhóm (leftAt != null).
const disbandConversation = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;

        ensureValidObjectId(conversationId, 'conversationId');

        await session.withTransaction(async () => {
            const conversation = await Conversation.findById(conversationId).session(session);
            if (!conversation) {
                const err = new Error('Không tìm thấy cuộc trò chuyện');
                err.statusCode = 404;
                throw err;
            }

            ensureGroupConversation(conversation);

            const myMember = await ConversationMember.findOne({
                conversationId,
                userId,
                leftAt: null,
            }).session(session);

            if (!myMember) {
                const err = new Error('Bạn không thuộc nhóm này');
                err.statusCode = 403;
                throw err;
            }

            if (!isOwner(myMember)) {
                const err = new Error('Bạn không có quyền giải tán nhóm');
                err.statusCode = 403;
                throw err;
            }

            const now = new Date();
            conversation.isLocked = true;
            await conversation.save({ session });

            await ConversationMember.updateMany(
                { conversationId, leftAt: null },
                {
                    $set: {
                        leftAt: now,
                        canSendMessages: false,
                    },
                },
                { session }
            );
        });

        return res.status(200).json({
            message: 'Giải tán nhóm thành công',
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// API thành viên tự rời nhóm.
// Nếu owner là người cuối cùng thì cho rời và khóa nhóm; nếu còn người khác thì yêu cầu chuyển quyền hoặc giải tán.
const leaveConversation = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;

        ensureValidObjectId(conversationId, 'conversationId');

        await session.withTransaction(async () => {
            const conversation = await Conversation.findById(conversationId).session(session);
            if (!conversation) {
                const err = new Error('Không tìm thấy cuộc trò chuyện');
                err.statusCode = 404;
                throw err;
            }

            ensureGroupConversation(conversation);

            const myMember = await ConversationMember.findOne({
                conversationId,
                userId,
                leftAt: null,
            }).session(session);

            if (!myMember) {
                const err = new Error('Bạn không thuộc nhóm này');
                err.statusCode = 403;
                throw err;
            }

            const activeCount = await ConversationMember.countDocuments({
                conversationId,
                leftAt: null,
            }).session(session);

            if (myMember.role === 'owner' && activeCount > 1) {
                const err = new Error('Owner không thể rời nhóm khi còn thành viên. Hãy chuyển quyền hoặc giải tán nhóm');
                err.statusCode = 400;
                throw err;
            }

            myMember.leftAt = new Date();
            myMember.canSendMessages = false;
            await myMember.save({ session });

            if (myMember.role === 'owner' && activeCount === 1) {
                conversation.isLocked = true;
                await conversation.save({ session });
            }
        });

        return res.status(200).json({
            message: 'Rời nhóm thành công',
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// API đuổi một thành viên khỏi nhóm.
// Policy:
// - owner: được đuổi admin và member (không đuổi owner).
// - admin: chỉ được đuổi member thường.
const kickConversationMember = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id, userId: memberUserId } = req.params;
        const conversationId = id;

        ensureValidObjectId(conversationId, 'conversationId');
        ensureValidObjectId(memberUserId, 'memberUserId');

        if (userId === memberUserId) {
            return res.status(400).json({ message: 'Không thể tự đuổi chính mình. Hãy dùng chức năng rời nhóm' });
        }

        const conversation = await requireConversation(conversationId);
        ensureGroupConversation(conversation);

        const myMember = await requireActiveMembership(conversationId, userId);
        if (!isOwner(myMember) && !isAdmin(myMember)) {
            return res.status(403).json({ message: 'Bạn không có quyền đuổi thành viên' });
        }

        const targetMember = await ConversationMember.findOne({
            conversationId,
            userId: memberUserId,
            leftAt: null,
        });

        if (!targetMember) {
            return res.status(404).json({ message: 'Không tìm thấy thành viên cần đuổi trong nhóm' });
        }

        if (targetMember.role === 'owner') {
            return res.status(403).json({ message: 'Không thể đuổi owner khỏi nhóm' });
        }

        if (isAdmin(myMember) && targetMember.role !== 'member') {
            return res.status(403).json({ message: 'Admin chỉ được đuổi member thường' });
        }

        targetMember.leftAt = new Date();
        targetMember.canSendMessages = false;
        await targetMember.save();

        return res.status(200).json({
            message: 'Đuổi thành viên khỏi nhóm thành công',
        });
    } catch (error) {
        next(error);
    }
};

// API cập nhật thông tin quản trị của 1 thành viên trong nhóm.
// Hỗ trợ cập nhật role và/hoặc các quyền đặc biệt trong cùng 1 lần gọi.
// Body hỗ trợ: role, canSendMessages, canInviteMembers, canManageMembers.
// Policy:
// - owner: full quyền (đổi role admin/member + chỉnh mọi quyền đặc biệt).
// - admin: chỉ chỉnh quyền đặc biệt của member thường, không đổi role.
const updateMember = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id, userId: memberUserId } = req.params;
        const conversationId = id;
        const {
            role,
            canSendMessages,
            canInviteMembers,
            canManageMembers,
        } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');
        ensureValidObjectId(memberUserId, 'memberUserId');

        const hasRoleUpdate = role !== undefined;
        const hasPermissionUpdate = [canSendMessages, canInviteMembers, canManageMembers]
            .some((value) => value !== undefined);

        if (!hasRoleUpdate && !hasPermissionUpdate) {
            return res.status(400).json({
                message: 'Cần truyền ít nhất 1 trường để cập nhật: role, canSendMessages, canInviteMembers, canManageMembers',
            });
        }

        if (hasRoleUpdate && !['admin', 'member'].includes(role)) {
            return res.status(400).json({ message: 'role chỉ nhận admin hoặc member' });
        }

        if (canSendMessages !== undefined && typeof canSendMessages !== 'boolean') {
            return res.status(400).json({ message: 'canSendMessages phải là boolean' });
        }
        if (canInviteMembers !== undefined && typeof canInviteMembers !== 'boolean') {
            return res.status(400).json({ message: 'canInviteMembers phải là boolean' });
        }
        if (canManageMembers !== undefined && typeof canManageMembers !== 'boolean') {
            return res.status(400).json({ message: 'canManageMembers phải là boolean' });
        }

        const conversation = await requireConversation(conversationId);
        ensureGroupConversation(conversation);

        const myMember = await requireActiveMembership(conversationId, userId);
        if (!isOwner(myMember) && !isAdmin(myMember)) {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật chức vụ' });
        }

        const targetMember = await ConversationMember.findOne({
            conversationId,
            userId: memberUserId,
            leftAt: null,
        });

        if (!targetMember) {
            return res.status(404).json({ message: 'Không tìm thấy thành viên trong nhóm' });
        }

        if (targetMember.role === 'owner') {
            return res.status(403).json({ message: 'Không thể thay đổi chức vụ của owner' });
        }

        // Admin không được đổi role, chỉ owner mới có quyền này.
        if (hasRoleUpdate && !isOwner(myMember)) {
            return res.status(403).json({ message: 'Chỉ owner mới có quyền thay đổi role admin/member' });
        }

        // Admin chỉ được chỉnh quyền đặc biệt của member thường.
        if (isAdmin(myMember)) {
            if (targetMember.role !== 'member') {
                return res.status(403).json({ message: 'Admin chỉ được chỉnh quyền của member thường' });
            }

            if (canManageMembers !== undefined) {
                return res.status(403).json({ message: 'Admin không được cấp quyền quản lý thành viên' });
            }
        }

        if (hasRoleUpdate) {
            targetMember.role = role;

            // Đồng bộ mặc định theo role nếu client không truyền quyền cụ thể.
            if (role === 'admin') {
                if (canManageMembers === undefined) targetMember.canManageMembers = true;
                if (canInviteMembers === undefined) targetMember.canInviteMembers = true;
            }

            if (role === 'member') {
                if (canManageMembers === undefined) targetMember.canManageMembers = false;
            }
        }

        if (canSendMessages !== undefined) targetMember.canSendMessages = canSendMessages;
        if (canInviteMembers !== undefined) targetMember.canInviteMembers = canInviteMembers;
        if (canManageMembers !== undefined) targetMember.canManageMembers = canManageMembers;

        await targetMember.save();

        return res.status(200).json({
            message: 'Cập nhật thành viên thành công',
            data: {
                conversationId: targetMember.conversationId,
                userId: targetMember.userId,
                role: targetMember.role,
                canSendMessages: targetMember.canSendMessages,
                canManageMembers: targetMember.canManageMembers,
                canInviteMembers: targetMember.canInviteMembers,
            },
        });
    } catch (error) {
        next(error);
    }
};

// API chuyển quyền owner cho thành viên khác.
// Policy: chỉ owner hiện tại được chuyển; người nhận phải là member active trong cùng nhóm.
// Sau khi chuyển: owner cũ trở thành admin để có thể tiếp tục quản trị hoặc rời nhóm.
const transferOwner = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const { newOwnerUserId } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');
        ensureValidObjectId(newOwnerUserId, 'newOwnerUserId');

        await session.withTransaction(async () => {
            const conversation = await Conversation.findById(conversationId).session(session);
            if (!conversation) {
                const err = new Error('Không tìm thấy cuộc trò chuyện');
                err.statusCode = 404;
                throw err;
            }

            ensureGroupConversation(conversation);

            const currentOwner = await ConversationMember.findOne({
                conversationId,
                userId,
                leftAt: null,
                role: 'owner',
            }).session(session);

            if (!currentOwner) {
                const err = new Error('Chỉ owner hiện tại mới có quyền chuyển quyền owner');
                err.statusCode = 403;
                throw err;
            }

            if (userId === newOwnerUserId) {
                const err = new Error('newOwnerUserId phải là thành viên khác owner hiện tại');
                err.statusCode = 400;
                throw err;
            }

            const newOwnerMember = await ConversationMember.findOne({
                conversationId,
                userId: newOwnerUserId,
                leftAt: null,
            }).session(session);

            if (!newOwnerMember) {
                const err = new Error('Thành viên được chỉ định không thuộc nhóm hoặc đã rời nhóm');
                err.statusCode = 404;
                throw err;
            }

            // Chuyển quyền owner.
            currentOwner.role = 'admin';
            currentOwner.canManageMembers = true;
            currentOwner.canInviteMembers = true;

            newOwnerMember.role = 'owner';
            newOwnerMember.canManageMembers = true;
            newOwnerMember.canInviteMembers = true;

            await currentOwner.save({ session });
            await newOwnerMember.save({ session });
        });

        return res.status(200).json({
            message: 'Chuyển quyền owner thành công',
            data: {
                previousOwnerUserId: userId,
                newOwnerUserId,
            },
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

module.exports = {
    addConversationMembers,
    listConversationMembers,
    disbandConversation,
    leaveConversation,
    kickConversationMember,
    updateMember,
    transferOwner,
};
