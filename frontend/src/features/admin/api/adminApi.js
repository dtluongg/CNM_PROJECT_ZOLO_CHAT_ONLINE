import apiClient from '../../../services/apiClient';

export const getStats = () =>
    apiClient.get('/admin/stats').then((r) => r.data);

export const listUsers = (params = {}) =>
    apiClient.get('/admin/users', { params }).then((r) => r.data);

export const banUser = (id, reason) =>
    apiClient.patch(`/admin/users/${id}/ban`, { reason }).then((r) => r.data);

export const unbanUser = (id) =>
    apiClient.patch(`/admin/users/${id}/unban`).then((r) => r.data);

export const changeRole = (id, role) =>
    apiClient.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data);

export const deleteUser = (id) =>
    apiClient.delete(`/admin/users/${id}`).then((r) => r.data);

export const listReports = (params = {}) =>
    apiClient.get('/admin/reports', { params }).then((r) => r.data);

export const updateReport = (id, data) =>
    apiClient.patch(`/admin/reports/${id}`, data).then((r) => r.data);

export const createReport = (data) =>
    apiClient.post('/reports', data).then((r) => r.data);

export const getReportTarget = (targetType, targetId) =>
    apiClient.get(`/admin/reports/target/${targetType}/${targetId}`).then((r) => r.data);

export const banFromReport = (userId, reason) =>
    apiClient.patch(`/admin/reports/ban-user/${userId}`, { reason }).then((r) => r.data);