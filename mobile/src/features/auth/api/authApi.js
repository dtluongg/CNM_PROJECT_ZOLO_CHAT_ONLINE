import apiClient from '../../../services/apiClient';

const authApi = {
  signin: (data) => apiClient.post('/auth/signin', data),
  signup: (data) => apiClient.post('/auth/signup', data),
  signout: () => apiClient.post('/auth/signout', {}),
  
  sendEmailOtp: (data) => apiClient.post('/auth/send-email-otp', data),
  sendPhoneOtp: (data) => apiClient.post('/auth/send-phone-otp', data),
  
  completeOAuthProfile: (data) => apiClient.post('/auth/complete-oauth-profile', data),
  syncOAuth: (data) => apiClient.post('/auth/sync-oauth', data),
  
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
  
  authMe: () => apiClient.get('/auth/authme'),
  refreshMe: () => apiClient.post('/auth/refreshme', {})
};

export default authApi;
