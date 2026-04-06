// Helper function to format user object consistently across APIs
const userResponse = (user) => {
    return {
        _id: user._id,
        username: user.username || null,
        email: user.email,
        displayName: user.displayName,
        phone: user.phone || null,
        avatar: user.avatar || null,
        banner: user.banner || null,
        bio: user.bio || '',
        status: user.status || 'online',
        statusText: user.statusText || '',
        usernameColor: user.usernameColor || '#5865f2',
        themeName: user.themeName || 'dark', // the default value
        themeColors: Object.keys(user.themeColors || {}).length > 0 ? user.themeColors : null,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
    };
};

module.exports = {
    userResponse,
};
