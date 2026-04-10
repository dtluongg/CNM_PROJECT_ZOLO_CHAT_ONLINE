const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');

const {
    createDmConversationEndpoint,
    createGroupConversationEndpoint,
    listMyConversations,
    getConversationById,
    updateConversationInfo,
    setConversationLock,
    setConversationArchived,
} = require('../controllers/conversationController');

const {
    addConversationMembers,
    listConversationMembers,
    disbandConversation,
    leaveConversation,
    kickConversationMember,
    updateMember,
    transferOwner,
} = require('../controllers/conversationMemberController');

// Mọi endpoint conversation đều yêu cầu đăng nhập.
router.use(verifyToken);

// Tạo DM theo chuẩn endpoint tường minh
router.post('/dm', createDmConversationEndpoint);

// Tạo Group theo chuẩn endpoint tường minh
router.post('/group', createGroupConversationEndpoint);

// Danh sách conversation của user hiện tại
// Query archive hỗ trợ: exclude | only | all
router.get('/', listMyConversations);

// Chi tiết 1 conversation
router.get('/:id', getConversationById);

// Cập nhật thông tin group (name/avatar)
router.patch('/:id', updateConversationInfo);

// Khóa/mở khóa group conversation
router.patch('/:id/lock', setConversationLock);

// Archive/unarchive conversation theo từng user
router.patch('/:id/archive', setConversationArchived);

// Lấy danh sách thành viên trong group (includeLeft=true để lấy cả thành viên đã rời)
router.get('/:id/members', listConversationMembers);

// Thêm thành viên vào group (1 hoặc nhiều user)
router.post('/:id/members', addConversationMembers);

// Thành viên tự rời nhóm
router.post('/:id/leave', leaveConversation);

// Owner giải tán nhóm
router.post('/:id/disband', disbandConversation);

// Owner/Admin đuổi thành viên (admin chỉ đuổi member thường)
router.delete('/:id/members/:userId', kickConversationMember);

// Owner chuyển quyền owner cho thành viên khác
router.patch('/:id/transfer-owner', transferOwner);

// Endpoint chuẩn để cập nhật role + quyền đặc biệt
router.patch('/:id/members/:userId/role', updateMember);

module.exports = router;
