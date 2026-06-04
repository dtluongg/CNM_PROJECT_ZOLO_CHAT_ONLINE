const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const { checkCanInvite } = require('../middlewares/checkTopicPermission');
const { createJoinRequest, listJoinRequests, reviewJoinRequest } = require('../controllers/joinRequestController');

const {
    createDmConversationEndpoint,
    createGroupConversationEndpoint,
    listMyConversations,
    getConversationById,
    updateConversationInfo,
    setConversationLock,
    setConversationArchived,
    deleteConversationForMe,
    pinMessage,
    unpinMessage,
} = require('../controllers/conversationController');

const {
    addConversationMembers,
    listConversationMembers,
    disbandConversation,
    leaveConversation,
    kickConversationMember,
    updateMember,
    transferOwner,
    listArchivedConversations,
} = require('../controllers/conversationMemberController');

const {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    assignMemberRole,
    updateMemberTopicOverrides,
    getEffectivePermissions,
} = require('../controllers/groupRoleController');

const { listTopics, createTopic, updateTopic, deleteTopic } = require('../controllers/topicController');

router.use(verifyToken);

// ── Conversation CRUD ────────────────────────────────────────────────
router.post('/dm',    createDmConversationEndpoint);
router.post('/group', createGroupConversationEndpoint);
router.get('/',       listMyConversations);
router.get('/archived', listArchivedConversations);
router.get('/:id',    getConversationById);
router.patch('/:id',  updateConversationInfo);
router.patch('/:id/lock',    setConversationLock);
router.patch('/:id/archive', setConversationArchived);
router.delete('/:id',        deleteConversationForMe);

// ── Members ──────────────────────────────────────────────────────────
router.get('/:id/members',              listConversationMembers);
router.post('/:id/members',             checkCanInvite, addConversationMembers);
router.post('/:id/leave',               leaveConversation);
router.post('/:id/disband',             disbandConversation);
router.delete('/:id/members/:userId',   kickConversationMember);
router.patch('/:id/transfer-owner',     transferOwner);

// ── Member permissions (specific routes trước /:userId/role chung) ───
router.get('/:id/members/:userId/effective-permissions', getEffectivePermissions);
router.patch('/:id/members/:userId/role-assign',         assignMemberRole);
router.patch('/:id/members/:userId/topic-overrides',     updateMemberTopicOverrides);
router.patch('/:id/members/:userId/role',                updateMember);

// ── Custom Roles ─────────────────────────────────────────────────────
router.get('/:id/roles',           listRoles);
router.post('/:id/roles',          createRole);
router.patch('/:id/roles/:roleId', updateRole);
router.delete('/:id/roles/:roleId',deleteRole);

// ── Pin/Unpin ────────────────────────────────────────────────────────
router.post('/:id/pin/:messageId',   pinMessage);
router.post('/:id/unpin/:messageId', unpinMessage);

// ── Topics ───────────────────────────────────────────────────────────
router.get('/:id/topics',              listTopics);
router.post('/:id/topics',             createTopic);
router.patch('/:id/topics/:topicId',   updateTopic);
router.delete('/:id/topics/:topicId',  deleteTopic);
router.post('/:id/join-requests',                    createJoinRequest);
router.get('/:id/join-requests',                     listJoinRequests);
router.patch('/:id/join-requests/:requestId',        reviewJoinRequest);
module.exports = router;