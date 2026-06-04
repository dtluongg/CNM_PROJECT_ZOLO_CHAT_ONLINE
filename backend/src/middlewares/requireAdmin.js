const requireAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!['admin', 'moderator'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    next();
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Super admin only' });
    }
    next();
};

module.exports = { requireAdmin, requireSuperAdmin };