const userModel = require('../models/userModel');
const { getIO }  = require('../socket/socketManager');

// ════════════════════════════════════════════════════════════════
//  CẬP NHẬT PROFILE (avatar, displayName, and extended settings)
// ════════════════════════════════════════════════════════════════
const updateProfile = async (req, res) => {
    try {
        const {
            avatar, displayName,
            bio, status, statusText, banner, usernameColor, themeName, themeColors,
        } = req.body;
        const userId = req.user._id;

        const updates = {};
        if (displayName !== undefined && displayName.trim()) {
            updates.displayName = displayName.trim();
        }
        if (avatar !== undefined) {
            // Chấp nhận URL hoặc base64 data URL
            if (avatar && avatar.length > 5 * 1024 * 1024) {
                return res.status(400).json({ message: 'Ảnh quá lớn, tối đa 5MB' });
            }
            updates.avatar = avatar;
        }
        if (bio !== undefined) updates.bio = bio;
        if (status !== undefined) updates.status = status;
        if (statusText !== undefined) updates.statusText = statusText;
        if (banner !== undefined) updates.banner = banner;
        if (usernameColor !== undefined) updates.usernameColor = usernameColor;
        if (themeName !== undefined) updates.themeName = themeName;
        if (themeColors !== undefined) updates.themeColors = themeColors;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updates,
            { new: true, select: '-passwordHash' }
        );

        // ── Broadcast status change via socket ──────────────────────────────
        if (updates.status !== undefined || updates.statusText !== undefined) {
            try {
                const io  = getIO();
                const uid = userId.toString();
                const newStatus     = updatedUser.status     || 'online';
                const newStatusText = updatedUser.statusText || '';
                if (newStatus === 'invisible') {
                    // Appear offline to everyone else (no lastSeen = user is just hidden)
                    io.emit('presence:offline', { userId: uid });
                } else {
                    io.emit('presence:status-changed', {
                        userId:     uid,
                        status:     newStatus,
                        statusText: newStatusText,
                    });
                }
            } catch (_) { /* socket may not be ready in test environments */ }
        }

        return res.status(200).json({
            message: 'Cập nhật profile thành công',
            user: {
                _id: updatedUser._id,
                username: updatedUser.username || null,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                phone: updatedUser.phone || null,
                avatar: updatedUser.avatar || null,
                banner: updatedUser.banner || null,
                bio: updatedUser.bio || '',
                status: updatedUser.status || 'online',
                statusText: updatedUser.statusText || '',
                usernameColor: updatedUser.usernameColor || '#5865f2',
                themeName: updatedUser.themeName || 'dark',
                themeColors: updatedUser.themeColors || null,
                authProvider: updatedUser.authProvider,
                isEmailVerified: updatedUser.isEmailVerified,
                isPhoneVerified: updatedUser.isPhoneVerified,
                createdAt: updatedUser.createdAt,
            },
        });

    } catch (error) {
        console.error('updateProfile error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
    }
};

// ════════════════════════════════════════════════════════════════
//  TÌM KIẾM USER (theo username, email, displayName)
// ════════════════════════════════════════════════════════════════
const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự' });
        }

        const keyword = q.trim();
        const regex = new RegExp(keyword, 'i');

        const users = await userModel.find({
            _id: { $ne: req.user._id }, // Không tìm bản thân
            $or: [
                { displayName: regex },
                { username: regex },
                { email: regex },
            ],
        })
        .select('_id displayName username email avatar usernameColor status statusText bio')
        .limit(20);

        return res.status(200).json({
            users: users.map(u => ({
                _id: u._id,
                displayName: u.displayName,
                username: u.username || null,
                email: u.email,
                avatar: u.avatar || null,
                usernameColor: u.usernameColor || '#5865f2',
                status: u.status === 'invisible' ? 'offline' : u.status,
                statusText: u.status === 'invisible' ? '' : (u.statusText || ''),
                bio: u.bio || '',
            })),
        });
    } catch (error) {
        console.error('searchUsers error:', error.message);
        return res.status(500).json({ message: 'Lỗi server khi tìm kiếm' });
    }
};

// ════════════════════════════════════════════════════════════════
//  PUBLIC PROFILE - Cho người dùng khác xem hồ sơ
// ════════════════════════════════════════════════════════════════
const getPublicProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || !userId.match(/^[a-f\d]{24}$/i)) {
            return res.status(400).json({ message: 'userId không hợp lệ' });
        }

        const user = await userModel.findById(userId).select(
            'displayName username email avatar banner bio status statusText usernameColor createdAt'
        );

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const visibleStatus = user.status === 'invisible' ? 'offline' : user.status;

        return res.status(200).json({
            user: {
                _id: user._id,
                displayName: user.displayName,
                username: user.username || null,
                email: user.email,
                avatar: user.avatar || null,
                banner: user.banner || null,
                bio: user.bio || '',
                status: visibleStatus,
                statusText: user.status === 'invisible' ? '' : (user.statusText || ''),
                usernameColor: user.usernameColor || '#5865f2',
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('getPublicProfile error:', error.message);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};


module.exports = {
    updateProfile,
    searchUsers,
    getPublicProfile
};
