import apiClient from './apiClient';

export const getSessions = async () => {
    const res = await apiClient.get('/sessions/list');
    return res.data;
};

export const logoutSession = async (sessionId) => {
    const res = await apiClient.post('/sessions/logout-session', { sessionId });
    return res.data;
};

export const logoutAllOthers = async (payload = {}) => {
    const res = await apiClient.post('/sessions/logout-others', payload);
    return res.data;
};
