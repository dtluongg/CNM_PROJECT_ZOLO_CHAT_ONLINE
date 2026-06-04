const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
const ConversationMember = require('../models/conversationMemberModel');
const ConversationTopic = require('../models/conversationTopicModel');
const GroupRole = require('../models/groupRoleModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const MessageReaction = require('../models/messageReactionModel');
const MessageRead = require('../models/messageReadModel');
const Attachment = require('../models/attachmentModel');
const JoinRequest = require('../models/joinRequestModel');
const VoiceRoom = require('../models/voiceRoomModel');
const Call = require('../models/callModel');
const Notification = require('../models/notificationModel');
const NotificationSetting = require('../models/notificationSettingModel');
const { getIO } = require('../socket/socketManager');

// Tạo system message và phát socket khi có thay đổi thành viên.
// event: 'member_join' | 'member_leave' | 'member_kick' | 'member_role_updated' | 'member_owner_transferred'
async function emitMemberSystemMessage(conversationId, actorId, targetId, event, extra = null) {
    try {
        const io = getIO();
        const [actor, target, members, systemTopic] = await Promise.all([
            User.findById(actorId).select('displayName avatar').lean(),
            targetId ? User.findById(targetId).select('displayName avatar').lean() : null,
            ConversationMember.find({ conversationId, leftAt: null }).select('userId').lean(),
            ConversationTopic.findOne({ conversationId, channelType: 'system' }).select('_id').lean(),
        ]);

        const actorName  = actor?.displayName  || '?';
        const targetName = target?.displayName || '?';

        let content;
        let extraPayload = {};
        if (event === 'member_join') {
            content = `${targetName} đã được thêm vào nhóm bởi ${actorName}`;
        } else if (event === 'member_leave') {
            content = `${actorName} đã rời khỏi nhóm`;
        } else if (event === 'member_kick') {
            content = `${targetName} đã bị xóa khỏi nhóm`;
            extraPayload.reason = extra || null;
        } else if (event === 'member_role_updated') {
            const roleLabel = extra === 'admin' ? 'Quản trị viên' : 'Thành viên';
            content = `${actorName} đã đặt ${targetName} làm ${roleLabel}`;
            extraPayload.newRole = extra || null;
        } else if (event === 'member_owner_transferred') {
            content = `${actorName} đã chuyển quyền chủ nhóm cho ${targetName}`;
        } else {
            content = `${actorName} đã thực hiện thay đổi`;
        }

        let topicId = systemTopic?._id || null;
        if (!topicId) {
            const newTopic = await ConversationTopic.create({
                conversationId,
                name: 'nhật-ký-nhóm',
                emoji: '📋',
                categoryName: '🔔 Hệ thống',
                channelType: 'system',
                position: 99,
                createdBy: actorId,
            });
            topicId = newTopic._id;
        }

        const msg = await Message.create({
            conversationId,
            senderId: actorId,
            type: 'system',
            content,
            ...(topicId ? { topicId } : {}),
            payload: {
                event,
                actorId:     actorId.toString(),
                actorName,
                actorAvatar: actor?.avatar  || null,
                targetId:    targetId?.toString() || null,
                targetName:  target?.displayName  || null,
                targetAvatar: target?.avatar || null,
                ...extraPayload,
            },
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageId: msg._id,
            lastMessagePreview: content,
            lastMessageTime: msg.createdAt,
        });

        const formatted = {
            _id: msg._id,
            conversationId: conversationId.toString(),
            senderId: actorId.toString(),
            type: 'system',
            content,
            topicId: topicId?.toString() || null,
            payload: msg.payload,
            createdAt: msg.createdAt,
            time: new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        const recipientIds = new Set(members.map(m => m.userId.toString()));
        if (targetId) recipientIds.add(targetId.toString());

        recipientIds.forEach(uid => {
            io.to(`user:${uid}`).emit('chat:new-message', { conversationId: conversationId.toString(), message: formatted });
        });
    } catch (err) {
        console.error('emitMemberSystemMessage error:', err);
    }
}

const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

const ensureValidObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        const err = new Error(`${fieldName} không hợp lệ`);
        err.statusCode = 400;
        throw err;
    }
};

const requireConversation = async (conversationId) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        const err = new Error('Không tìm thấy cuộc trò chuyện');
        err.statusCode = 404;
        throw err;
    }
    return conversation;
};

const ensureGroupConversation = (conversation) => {
    if (conversation.type !== 'group') {
        const err = new Error('Chức năng này chỉ áp dụng cho nhóm chat');
        err.statusCode = 400;
        throw err;
    }
};

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

const isOwner = (member) => member.role === 'owner';
const isAdmin = (member) => member.role === 'admin';

const canInviteMembersInGroup = async (member) => {
    if (!member) return false;
    if (isOwner(member) || isAdmin(member)) return true;
    if (member.canInviteMembers === true) return true;

    if (member.customRoleId) {
        const role = await GroupRole.findById(member.customRoleId).select('permissions.canInviteMembers').lean();
        if (role?.permissions?.canInviteMembers === true) return true;
    }

    return false;
};

const emitJoinRequestToAdmins = async (conversationId, requesterId, targetUserIds, createdRequests, message = '') => {
    try {
        if (!createdRequests.length) return;

        const io = getIO();
        const admins = await ConversationMember.find({
            conversationId,
            leftAt: null,
            $or: [{ role: 'owner' }, { role: 'admin' }],
        }).select('userId').lean();

        const requester = await User.findById(requesterId).select('displayName avatar').lean();
        const targets = await User.find({ _id: { $in: targetUserIds } }).select('_id displayName avatar').lean();
        const targetMap = new Map(targets.map((u) => [u._id.toString(), u]));

        for (const request of createdRequests) {
            const target = targetMap.get(request.userId.toString());
            admins.forEach(({ userId: adminId }) => {
                io.to(`user:${adminId.toString()}`).emit('join-request:new', {
                    conversationId: conversationId.toString(),
                    request: {
                        _id: request._id,
                        userId: request.userId,
                        requestedBy: requesterId,
                        requesterName: requester?.displayName,
                        targetName: target?.displayName,
                        message,
                        createdAt: request.createdAt,
                    },
                });
            });
        }
    } catch (err) {
        console.error('emitJoinRequestToAdmins error:', err);
    }
};

// API thêm thành viên vào nhóm
const addConversationMembers = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        const { memberUserId, memberUserIds, message = '' } = req.body;

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

        let addedUserIds = [];
        let rejoinedUserIds = [];
        let createdJoinRequests = [];

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
                conversationId, userId, leftAt: null,
            }).session(session);

            if (!myMember) {
                const err = new Error('Bạn không thuộc nhóm này');
                err.statusCode = 403;
                throw err;
            }

            const canInvite = await canInviteMembersInGroup(myMember);
            if (!canInvite) {
                const err = new Error('Bạn không có quyền thêm thành viên vào nhóm');
                err.statusCode = 403;
                throw err;
            }

            const inviteMode = conversation.inviteMode || 'open_invite';
            if (inviteMode === 'admin_only' && !isOwner(myMember) && !isAdmin(myMember)) {
                const err = new Error('Nhóm đang ở chế độ Admin Only, chỉ owner/admin mới được mời trực tiếp');
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

            // approval_required: member thường chỉ tạo yêu cầu chờ duyệt, không thêm trực tiếp
            if (inviteMode === 'approval_required' && !isOwner(myMember) && !isAdmin(myMember)) {
                const pendingRequests = await JoinRequest.find({
                    conversationId,
                    userId: { $in: normalizedIds },
                    status: 'pending',
                }).session(session).lean();

                const pendingSet = new Set(pendingRequests.map((r) => r.userId.toString()));
                const toRequestIds = [];
                const skippedActive = [];
                const skippedPending = [];

                for (const targetId of normalizedIds) {
                    const existed = existingMemberMap.get(targetId);
                    if (existed && existed.leftAt === null) {
                        skippedActive.push(targetId);
                        continue;
                    }
                    if (pendingSet.has(targetId)) {
                        skippedPending.push(targetId);
                        continue;
                    }
                    toRequestIds.push(targetId);
                }

                if (toRequestIds.length) {
                    createdJoinRequests = await JoinRequest.insertMany(
                        toRequestIds.map((targetId) => ({
                            conversationId,
                            userId: targetId,
                            requestedBy: userId,
                            message,
                        })),
                        { session, ordered: true }
                    );
                }

                return res.status(200).json({
                    message: 'Đã gửi yêu cầu thêm thành viên, chờ admin/owner duyệt',
                    data: {
                        requestedUserIds: toRequestIds,
                        skippedActiveUserIds: skippedActive,
                        skippedPendingUserIds: skippedPending,
                    },
                });
            }

            const toInsert = [];
            const toRejoin = [];
            const skipped  = [];
            const now = new Date();

            for (const targetId of normalizedIds) {
                const existed = existingMemberMap.get(targetId);
                if (!existed) {
                    toInsert.push({
                        conversationId, userId: targetId, role: 'member',
                        joinedAt: now, leftAt: null,
                        canSendMessages: true, canInviteMembers: true,
                        canManageMembers: false, isArchived: false,
                    });
                    continue;
                }
                if (existed.leftAt === null) { skipped.push(targetId); continue; }
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

            addedUserIds    = toInsert.map((item) => item.userId.toString());
            rejoinedUserIds = toRejoin.map((item) => item.userId.toString());

            res.status(200).json({
                message: 'Thêm thành viên vào nhóm thành công',
                data: { addedUserIds, rejoinedUserIds, skippedUserIds: skipped },
            });
        });

        if (createdJoinRequests.length) {
            await emitJoinRequestToAdmins(
                conversationId,
                userId,
                createdJoinRequests.map((r) => r.userId.toString()),
                createdJoinRequests,
                message
            );
        }

        for (const targetId of [...addedUserIds, ...rejoinedUserIds]) {
            await emitMemberSystemMessage(conversationId, userId, targetId, 'member_join');
        }
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// ─── FIX CHÍNH: populate customRoleId để frontend biết member đang dùng role nào ───
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
        if (!includeLeft) filter.leftAt = null;

        const members = await ConversationMember.find(filter)
            .populate('userId', '_id displayName username email avatar status statusText')
            // FIX KEY: populate customRoleId để frontend render đúng badge role
            .populate('customRoleId', '_id name color permissions')
            .sort({ role: 1, joinedAt: 1 })
            .lean();

        const data = members.map((member) => ({
            _id:              member._id,
            conversationId:   member.conversationId,
            role:             member.role,
            // FIX KEY: trả về object customRoleId đã populate (hoặc null)
            customRoleId:     member.customRoleId || null,
            joinedAt:         member.joinedAt,
            leftAt:           member.leftAt,
            unreadCount:      member.unreadCount,
            canSendMessages:  member.canSendMessages,
            canInviteMembers: member.canInviteMembers,
            canManageMembers: member.canManageMembers,
            isArchived:       member.isArchived,
            user:             member.userId,
        }));

        return res.status(200).json({
            data,
            meta: { includeLeft },
        });
    } catch (error) {
        next(error);
    }
};

// API giải tán nhóm
const disbandConversation = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        const userId = getCurrentUserId(req);
        const { id } = req.params;
        const conversationId = id;
        let affectedUserIds = [];

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
                conversationId, userId, leftAt: null,
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

            const members = await ConversationMember.find({ conversationId, leftAt: null })
                .select('userId')
                .session(session)
                .lean();
            affectedUserIds = [...new Set(members.map((m) => m.userId?.toString()).filter(Boolean))];

            // Soft-delete: giữ lại tin nhắn & nhóm để thành viên đọc lại trong kho lưu trữ.
            const now = new Date();
            conversation.disbandedAt = now;
            conversation.isLocked = true;
            await conversation.save({ session });

            // Đánh dấu mọi thành viên đang hoạt động là đã rời (do giải tán) tại thời điểm này.
            await ConversationMember.updateMany(
                { conversationId, leftAt: null },
                { $set: { leftAt: now, leaveType: 'disbanded', canSendMessages: false } },
                { session }
            );

            // Dọn các tài nguyên realtime không cần lưu (phòng voice, lời mời chờ).
            await VoiceRoom.deleteMany({ conversationId }, { session });
            await JoinRequest.deleteMany({ conversationId }, { session });
            await NotificationSetting.deleteMany({ conversationId }, { session });
        });

        const io = getIO();
        if (io) {
            for (const targetUserId of affectedUserIds) {
                io.to(`user:${targetUserId}`).emit('chat:conversation-disbanded', { conversationId });
            }
        }

        return res.status(200).json({ message: 'Giải tán nhóm thành công. Lịch sử hội thoại được lưu trong kho lưu trữ.' });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// API thành viên tự rời nhóm
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
                conversationId, userId, leftAt: null,
            }).session(session);

            if (!myMember) {
                const err = new Error('Bạn không thuộc nhóm này');
                err.statusCode = 403;
                throw err;
            }

            const activeCount = await ConversationMember.countDocuments({
                conversationId, leftAt: null,
            }).session(session);

            if (myMember.role === 'owner' && activeCount > 1) {
                const err = new Error('Owner không thể rời nhóm khi còn thành viên. Hãy chuyển quyền hoặc giải tán nhóm');
                err.statusCode = 400;
                throw err;
            }

            myMember.leftAt = new Date();
            myMember.leaveType = 'left';
            myMember.canSendMessages = false;
            await myMember.save({ session });

            if (myMember.role === 'owner' && activeCount === 1) {
                conversation.isLocked = true;
                await conversation.save({ session });
            }
        });

        emitMemberSystemMessage(conversationId, userId, null, 'member_leave');

        return res.status(200).json({ message: 'Rời nhóm thành công' });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// API đuổi thành viên
const kickConversationMember = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id, userId: memberUserId } = req.params;
        const { reason } = req.body;
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
            conversationId, userId: memberUserId, leftAt: null,
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
        targetMember.leaveType = 'kicked';
        targetMember.canSendMessages = false;
        await targetMember.save();

        emitMemberSystemMessage(conversationId, userId, memberUserId, 'member_kick', reason || null);

        return res.status(200).json({ message: 'Đuổi thành viên khỏi nhóm thành công' });
    } catch (error) {
        next(error);
    }
};

// API cập nhật thông tin thành viên
const updateMember = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id, userId: memberUserId } = req.params;
        const conversationId = id;
        const { role, canSendMessages, canInviteMembers, canManageMembers } = req.body;

        ensureValidObjectId(conversationId, 'conversationId');
        ensureValidObjectId(memberUserId, 'memberUserId');

        const hasRoleUpdate       = role !== undefined;
        const hasPermissionUpdate = [canSendMessages, canInviteMembers, canManageMembers].some(v => v !== undefined);

        if (!hasRoleUpdate && !hasPermissionUpdate) {
            return res.status(400).json({
                message: 'Cần truyền ít nhất 1 trường để cập nhật: role, canSendMessages, canInviteMembers, canManageMembers',
            });
        }

        if (hasRoleUpdate && !['admin', 'member'].includes(role)) {
            return res.status(400).json({ message: 'role chỉ nhận admin hoặc member' });
        }

        if (canSendMessages !== undefined && typeof canSendMessages !== 'boolean')
            return res.status(400).json({ message: 'canSendMessages phải là boolean' });
        if (canInviteMembers !== undefined && typeof canInviteMembers !== 'boolean')
            return res.status(400).json({ message: 'canInviteMembers phải là boolean' });
        if (canManageMembers !== undefined && typeof canManageMembers !== 'boolean')
            return res.status(400).json({ message: 'canManageMembers phải là boolean' });

        const conversation = await requireConversation(conversationId);
        ensureGroupConversation(conversation);

        const myMember = await requireActiveMembership(conversationId, userId);
        if (!isOwner(myMember) && !isAdmin(myMember)) {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật chức vụ' });
        }

        const targetMember = await ConversationMember.findOne({
            conversationId, userId: memberUserId, leftAt: null,
        });

        if (!targetMember) return res.status(404).json({ message: 'Không tìm thấy thành viên trong nhóm' });
        if (targetMember.role === 'owner') return res.status(403).json({ message: 'Không thể thay đổi chức vụ của owner' });

        if (hasRoleUpdate && !isOwner(myMember)) {
            return res.status(403).json({ message: 'Chỉ owner mới có quyền thay đổi role admin/member' });
        }

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
            if (role === 'admin') {
                targetMember.customRoleId = null;
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

        if (hasRoleUpdate) {
            emitMemberSystemMessage(conversationId, userId, memberUserId, 'member_role_updated', role);
        }

        return res.status(200).json({
            message: 'Cập nhật thành viên thành công',
            data: {
                conversationId: targetMember.conversationId,
                userId:         targetMember.userId,
                role:           targetMember.role,
                canSendMessages:  targetMember.canSendMessages,
                canManageMembers: targetMember.canManageMembers,
                canInviteMembers: targetMember.canInviteMembers,
            },
        });
    } catch (error) {
        next(error);
    }
};

// API chuyển quyền owner
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
                conversationId, userId, leftAt: null, role: 'owner',
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
                conversationId, userId: newOwnerUserId, leftAt: null,
            }).session(session);

            if (!newOwnerMember) {
                const err = new Error('Thành viên được chỉ định không thuộc nhóm hoặc đã rời nhóm');
                err.statusCode = 404;
                throw err;
            }

            currentOwner.role = 'admin';
            currentOwner.canManageMembers = true;
            currentOwner.canInviteMembers = true;

            newOwnerMember.role = 'owner';
            newOwnerMember.canManageMembers = true;
            newOwnerMember.canInviteMembers = true;

            await currentOwner.save({ session });
            await newOwnerMember.save({ session });
        });

        emitMemberSystemMessage(conversationId, userId, newOwnerUserId, 'member_owner_transferred');

        return res.status(200).json({
            message: 'Chuyển quyền owner thành công',
            data: { previousOwnerUserId: userId, newOwnerUserId },
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

// API liệt kê các nhóm đã lưu trữ (đã rời / bị kích / bị giải tán) của người dùng.
// Người dùng vẫn đọc lại được lịch sử (chỉ đọc) tới thời điểm họ rời nhóm.
const listArchivedConversations = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);

        const memberships = await ConversationMember.find({
            userId,
            leftAt: { $ne: null },
        })
            .sort({ leftAt: -1 })
            .lean();

        const convIds = memberships.map((m) => m.conversationId);
        const conversations = await Conversation.find({ _id: { $in: convIds }, type: 'group' })
            .select('_id name avatar groupType disbandedAt lastMessagePreview lastMessageTime')
            .lean();
        const convMap = new Map(conversations.map((c) => [c._id.toString(), c]));

        const data = memberships
            .map((m) => {
                const conv = convMap.get(m.conversationId.toString());
                if (!conv) return null;
                return {
                    id: conv._id,
                    name: conv.name,
                    avatar: conv.avatar,
                    groupType: conv.groupType,
                    leaveType: m.leaveType || (conv.disbandedAt ? 'disbanded' : 'left'),
                    leftAt: m.leftAt,
                    isDisbanded: !!conv.disbandedAt,
                    lastMessagePreview: conv.lastMessagePreview || '',
                };
            })
            .filter(Boolean);

        return res.status(200).json({ data });
    } catch (error) {
        next(error);
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
    listArchivedConversations,
};