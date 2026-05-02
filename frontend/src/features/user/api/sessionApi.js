import apiClient from '../../../services/apiClient';

const sessionApi = {
    getSessions: () => apiClient.get(`/sessions/list?t=${Date.now()}`),
    logoutSession: (sessionId) => apiClient.post('/sessions/logout-session', { sessionId }),
    logoutAllOthers: (payload) => apiClient.post('/sessions/logout-others', payload),
};

export default sessionApi;
