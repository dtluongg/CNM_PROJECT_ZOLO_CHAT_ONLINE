// src/features/notifications/utils/notificationHelper.js

export const calculateMuteUntil = (type) => {
    if (type === 'forever' || type === 'off') return null;

    const now = new Date();
    const durations = {
        '15m': 15 * 60000,
        '1h': 60 * 60000,
        '8h': 8 * 60 * 60000,
    };

    return durations[type] ? new Date(now.getTime() + durations[type]).toISOString() : null;
};