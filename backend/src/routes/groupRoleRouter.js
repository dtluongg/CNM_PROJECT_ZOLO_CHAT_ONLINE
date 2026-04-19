const express = require('express');
const router = express.Router({ mergeParams: true }); // ← FIX
const verifyToken = require('../middlewares/verifyToken');
const {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    assignMemberRole,
    updateMemberTopicOverrides,
    getEffectivePermissions,
} = require('../controllers/groupRoleController');

router.get('/roles', verifyToken, listRoles);
router.post('/roles', verifyToken, createRole);
router.patch('/roles/:roleId', verifyToken, updateRole);
router.delete('/roles/:roleId', verifyToken, deleteRole);
router.patch('/members/:userId/role-assign', verifyToken, assignMemberRole);
router.patch('/members/:userId/topic-overrides', verifyToken, updateMemberTopicOverrides);
router.get('/members/:userId/effective-permissions', verifyToken, getEffectivePermissions);

module.exports = router;