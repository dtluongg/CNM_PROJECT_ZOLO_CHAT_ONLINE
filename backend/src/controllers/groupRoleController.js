const mongoose = require('mongoose');
const GroupRole          = require('../models/groupRoleModel');
const ConversationMember = require('../models/conversationMemberModel');
const ConversationTopic  = require('../models/conversationTopicModel');
const Conversation       = require('../models/conversationModel');

const MAX_ROLES_PER_GROUP = 10;

const getCurrentUserId = (req) => (req.user?._id || req.user?.id || '').toString();

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

// Kiểm tra caller có quyền quản lý role không (owner hoặc admin).
const requireOwnerOrAdmin = async (conversationId, userId) => {
    const member = await ConversationMember.findOne({
        conversationId, userId, leftAt: null, isDeleted: { $ne: true },
    });
    if (!member) {
        const err = new Error('Bạn không thuộc nhóm này');
        err.statusCode = 403;
        throw err;
    }
    if (member.role !== 'owner' && member.role !== 'admin') {
        const err = new Error('Chỉ Owner/Admin mới được quản lý role');
        err.statusCode = 403;
        throw err;
    }
    return member;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /conversations/:id/roles
// Lấy toàn bộ custom role của nhóm kèm số member đang dùng mỗi role.
// ─────────────────────────────────────────────────────────────────────────────
const listRoles = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId } = req.params;

        if (!isValidId(conversationId)) return res.status(400).json({ message: 'conversationId không hợp lệ' });

        const conversation = await Conversation.findById(conversationId).select('type');
        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (conversation.type !== 'group') return res.status(400).json({ message: 'Chỉ nhóm mới có custom role' });

        // Mọi member đều xem được danh sách role
        const membership = await ConversationMember.findOne({ conversationId, userId, leftAt: null });
        if (!membership) return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });

        const roles = await GroupRole.find({ conversationId })
            .populate('allowedTopicIds', '_id name emoji channelType categoryName')
            .populate('sendableTopicIds', '_id name emoji channelType categoryName')
            .sort({ position: -1 })
            .lean();

        // Đếm số member đang dùng mỗi role
        const roleIds = roles.map(r => r._id);
        const counts = await ConversationMember.aggregate([
            { $match: { conversationId: new mongoose.Types.ObjectId(conversationId), customRoleId: { $in: roleIds }, leftAt: null } },
            { $group: { _id: '$customRoleId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));

        const data = roles.map(r => ({
            ...r,
            memberCount: countMap.get(r._id.toString()) || 0,
        }));

        return res.status(200).json({ data });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /conversations/:id/roles
// Tạo custom role mới cho nhóm.
// Body: { name, color?, permissions?, allowedTopicIds?, sendableTopicIds? }
// ─────────────────────────────────────────────────────────────────────────────
const createRole = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId } = req.params;
        const { name, color, permissions = {}, allowedTopicIds = [], sendableTopicIds = [] } = req.body;

        if (!isValidId(conversationId)) return res.status(400).json({ message: 'conversationId không hợp lệ' });
        if (!name || !name.trim()) return res.status(400).json({ message: 'Tên role là bắt buộc' });

        const conversation = await Conversation.findById(conversationId).select('type');
        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        if (conversation.type !== 'group') return res.status(400).json({ message: 'Chỉ nhóm mới có custom role' });

        const myMember = await requireOwnerOrAdmin(conversationId, userId);

        // Giới hạn số role
        const existingCount = await GroupRole.countDocuments({ conversationId });
        if (existingCount >= MAX_ROLES_PER_GROUP) {
            return res.status(400).json({ message: `Mỗi nhóm tối đa ${MAX_ROLES_PER_GROUP} custom role` });
        }

        // Validate topicIds thuộc nhóm này
        if (allowedTopicIds.length) {
            const validTopics = await ConversationTopic.countDocuments({
                _id: { $in: allowedTopicIds },
                conversationId,
            });
            if (validTopics !== allowedTopicIds.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều kênh không thuộc nhóm này' });
            }
        }

        // Position = max hiện tại + 1
        const maxPos = await GroupRole.findOne({ conversationId }).sort({ position: -1 }).select('position').lean();
        const position = (maxPos?.position ?? -1) + 1;

        const role = await GroupRole.create({
            conversationId,
            name: name.trim(),
            color: color || '#5865f2',
            position,
            permissions: {
                canSendMessages:  permissions.canSendMessages  ?? true,
                canInviteMembers: permissions.canInviteMembers ?? false,
                canManageMembers: permissions.canManageMembers ?? false,
            },
            allowedTopicIds,
            sendableTopicIds,
            createdBy: userId,
        });

        await role.populate('allowedTopicIds', '_id name emoji channelType');
        await role.populate('sendableTopicIds', '_id name emoji channelType');

        return res.status(201).json({ message: 'Tạo role thành công', data: role });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên role đã tồn tại trong nhóm này' });
        }
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /conversations/:id/roles/:roleId
// Cập nhật role: name, color, permissions, allowedTopicIds, sendableTopicIds.
// ─────────────────────────────────────────────────────────────────────────────
const updateRole = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId, roleId } = req.params;
        const { name, color, permissions, allowedTopicIds, sendableTopicIds, position } = req.body;

        if (!isValidId(conversationId) || !isValidId(roleId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        await requireOwnerOrAdmin(conversationId, userId);

        const role = await GroupRole.findOne({ _id: roleId, conversationId });
        if (!role) return res.status(404).json({ message: 'Không tìm thấy role' });

        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ message: 'Tên role không được trống' });
            role.name = name.trim();
        }
        if (color !== undefined) role.color = color;
        if (position !== undefined) role.position = Number(position);

        if (permissions !== undefined) {
            if (permissions.canSendMessages  !== undefined) role.permissions.canSendMessages  = !!permissions.canSendMessages;
            if (permissions.canInviteMembers !== undefined) role.permissions.canInviteMembers = !!permissions.canInviteMembers;
            if (permissions.canManageMembers !== undefined) role.permissions.canManageMembers = !!permissions.canManageMembers;
        }

        if (allowedTopicIds !== undefined) {
            if (allowedTopicIds.length) {
                const validTopics = await ConversationTopic.countDocuments({
                    _id: { $in: allowedTopicIds }, conversationId,
                });
                if (validTopics !== allowedTopicIds.length) {
                    return res.status(400).json({ message: 'Một hoặc nhiều kênh không thuộc nhóm này' });
                }
            }
            role.allowedTopicIds = allowedTopicIds;
        }

        if (sendableTopicIds !== undefined) {
            role.sendableTopicIds = sendableTopicIds;
        }

        await role.save();
        await role.populate('allowedTopicIds', '_id name emoji channelType categoryName');
        await role.populate('sendableTopicIds', '_id name emoji channelType categoryName');

        return res.status(200).json({ message: 'Cập nhật role thành công', data: role });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên role đã tồn tại trong nhóm này' });
        }
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /conversations/:id/roles/:roleId
// Xóa role → tự động gỡ role khỏi tất cả member đang dùng.
// ─────────────────────────────────────────────────────────────────────────────
const deleteRole = async (req, res, next) => {
    try {
        const userId = getCurrentUserId(req);
        const { id: conversationId, roleId } = req.params;

        if (!isValidId(conversationId) || !isValidId(roleId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        await requireOwnerOrAdmin(conversationId, userId);

        const role = await GroupRole.findOneAndDelete({ _id: roleId, conversationId });
        if (!role) return res.status(404).json({ message: 'Không tìm thấy role' });

        // Gỡ role khỏi tất cả member đang dùng
        await ConversationMember.updateMany(
            { conversationId, customRoleId: roleId },
            { $set: { customRoleId: null } }
        );

        return res.status(200).json({ message: 'Đã xóa role thành công' });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /conversations/:id/members/:userId/role-assign
// Gán hoặc gỡ custom role cho 1 member.
// Body: { customRoleId: string | null }
// ─────────────────────────────────────────────────────────────────────────────
const assignMemberRole = async (req, res, next) => {
    try {
        const callerId = getCurrentUserId(req);
        const { id: conversationId, userId: targetUserId } = req.params;
        const { customRoleId } = req.body;

        if (!isValidId(conversationId) || !isValidId(targetUserId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        const myMember = await requireOwnerOrAdmin(conversationId, callerId);

        const targetMember = await ConversationMember.findOne({
            conversationId, userId: targetUserId, leftAt: null,
        });
        if (!targetMember) return res.status(404).json({ message: 'Không tìm thấy thành viên trong nhóm' });

        if (targetMember.role === 'owner') {
            return res.status(400).json({ message: 'Không thể gán custom role cho owner' });
        }
        // Admin chỉ gán role cho member thường, không gán cho admin khác
        if (myMember.role === 'admin' && targetMember.role === 'admin') {
            return res.status(403).json({ message: 'Admin không thể thay đổi role của admin khác' });
        }

        if (customRoleId === null || customRoleId === undefined || customRoleId === '') {
            // Gỡ role
            targetMember.customRoleId = null;
        } else {
            if (!isValidId(customRoleId)) return res.status(400).json({ message: 'customRoleId không hợp lệ' });

            const role = await GroupRole.findOne({ _id: customRoleId, conversationId });
            if (!role) return res.status(404).json({ message: 'Role không tồn tại trong nhóm này' });

            targetMember.customRoleId = customRoleId;
        }

        await targetMember.save();

        return res.status(200).json({
            message: customRoleId ? 'Gán role thành công' : 'Đã gỡ role thành công',
            data: {
                userId: targetUserId,
                customRoleId: targetMember.customRoleId,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /conversations/:id/members/:userId/topic-overrides
// Cập nhật override quyền kênh riêng cho 1 member.
// Body: { overrides: [{ topicId, canAccess, canSend }] }
// ─────────────────────────────────────────────────────────────────────────────
const updateMemberTopicOverrides = async (req, res, next) => {
    try {
        const callerId = getCurrentUserId(req);
        const { id: conversationId, userId: targetUserId } = req.params;
        const { overrides = [] } = req.body;

        if (!isValidId(conversationId) || !isValidId(targetUserId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }
        if (!Array.isArray(overrides)) {
            return res.status(400).json({ message: 'overrides phải là mảng' });
        }

        await requireOwnerOrAdmin(conversationId, callerId);

        const targetMember = await ConversationMember.findOne({
            conversationId, userId: targetUserId, leftAt: null,
        });
        if (!targetMember) return res.status(404).json({ message: 'Không tìm thấy thành viên' });

        // Validate topicIds
        const topicIds = overrides.map(o => o.topicId).filter(Boolean);
        if (topicIds.length) {
            const validCount = await ConversationTopic.countDocuments({
                _id: { $in: topicIds }, conversationId,
            });
            if (validCount !== topicIds.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều kênh không thuộc nhóm này' });
            }
        }

        // Merge overrides: upsert theo topicId
        const overrideMap = new Map(
            targetMember.topicOverrides.map(o => [o.topicId.toString(), o])
        );

        for (const ov of overrides) {
            if (!isValidId(ov.topicId)) continue;
            const existing = overrideMap.get(ov.topicId.toString());
            if (existing) {
                if (ov.canAccess !== undefined) existing.canAccess = !!ov.canAccess;
                if (ov.canSend   !== undefined) existing.canSend   = !!ov.canSend;
            } else {
                overrideMap.set(ov.topicId.toString(), {
                    topicId:   ov.topicId,
                    canAccess: ov.canAccess ?? true,
                    canSend:   ov.canSend   ?? true,
                });
            }
        }

        targetMember.topicOverrides = Array.from(overrideMap.values());
        await targetMember.save();

        return res.status(200).json({
            message: 'Cập nhật override kênh thành công',
            data: { userId: targetUserId, topicOverrides: targetMember.topicOverrides },
        });
    } catch (error) {
        next(error);
    }
};

const getEffectivePermissions = async (req, res, next) => {
  try {
    const callerId     = getCurrentUserId(req);
    const { id: conversationId, userId: targetUserId } = req.params;

    const callerMember = await ConversationMember.findOne({ conversationId, userId: callerId, leftAt: null });
    if (!callerMember) return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });

    const member = await ConversationMember.findOne({ conversationId, userId: targetUserId, leftAt: null })
      .populate('customRoleId');
    if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên' });

    const allTopics = await ConversationTopic.find({ conversationId }).select('_id name channelType emoji').lean();

    const effectiveTopics = allTopics.map(topic => {
      const tid = topic._id.toString();

      // 1. Personal override — highest priority
      const override = (member.topicOverrides || []).find(o => o.topicId?.toString() === tid);
      if (override) {
        return {
          ...topic,
          canAccess: override.canAccess,
          canSend:   override.canSend && member.canSendMessages !== false,
          source:    'override',
        };
      }

      // 2. owner/admin full quyền
      if (member.role === 'owner' || member.role === 'admin') {
        return { ...topic, canAccess: true, canSend: true, source: 'system_role' };
      }

      // 3. Custom role
      if (member.customRoleId) {
        const cr = member.customRoleId;
        const allowedIds  = (cr.allowedTopicIds  || []).map(id => id.toString());
        const sendableIds = (cr.sendableTopicIds || []).map(id => id.toString());

        const canAccess = allowedIds.length === 0 || allowedIds.includes(tid);
        let canSend = false;
        if (canAccess) {
          canSend = sendableIds.length === 0
            ? cr.permissions?.canSendMessages !== false
            : sendableIds.includes(tid) && cr.permissions?.canSendMessages !== false;
        }

        return { ...topic, canAccess, canSend, source: 'custom_role' };
      }

      // 4. Default member
      return {
        ...topic,
        canAccess: true,
        canSend: member.canSendMessages !== false,
        source: 'default',
      };
    });

    return res.status(200).json({
      data: {
        userId:      targetUserId,
        systemRole:  member.role,
        customRole:  member.customRoleId ? {
          _id:   member.customRoleId._id,
          name:  member.customRoleId.name,
          color: member.customRoleId.color,
        } : null,
        globalPermissions: {
          canSendMessages:  member.role === 'owner' || member.role === 'admin' || member.canSendMessages,
          canInviteMembers: member.role === 'owner' || member.role === 'admin' || member.customRoleId?.permissions?.canInviteMembers,
          canManageMembers: member.role === 'owner' || member.role === 'admin' || member.canManageMembers,
        },
        topicPermissions: effectiveTopics,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    assignMemberRole,
    updateMemberTopicOverrides,
    getEffectivePermissions,
};