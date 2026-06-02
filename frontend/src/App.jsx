import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PresenceProvider } from './context/PresenceContext';
import { NotificationProvider } from './context/NotificationContext';
import { CallProvider } from './features/call/CallContext';
import { VoiceRoomProvider } from './features/voice/VoiceRoomContext';
import { GroupCallProvider } from './features/call/GroupCallContext';

import IncomingCallModal from './features/call/components/IncomingCallModal';
import OutgoingCallScreen from './features/call/components/OutgoingCallScreen';
import ActiveCallScreen from './features/call/components/ActiveCallScreen';
import CallNotification from './features/call/components/CallNotification';
import IncomingGroupCallModal from './features/call/components/IncomingGroupCallModal';
import GroupCallScreen from './features/call/components/GroupCallScreen';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './features/auth/Signup';
import Signin from './features/auth/Signin';
import Dashboard from './features/chat/Dashboard';
import Chat from './features/chat/Chat';
import AuthCallback from './features/auth/AuthCallback';
import CompleteProfile from './features/auth/CompleteProfile';
import ForgotPassword from './features/auth/ForgotPassword';
import Home from './pages/Home';
import UserProfilePage from './features/user/UserProfilePage';
import ChangePassword from './features/auth/ChangePassword';
import FriendsPage from './features/friends/FriendsPage';
import SidebarNav from './components/SidebarNav';
import NotificationToast from './features/notifications/components/NotificationToast';
import StoriesPage from './features/stories/StoriesPage';

// Các route có Sidebar bên trái kiểu AppShell (Zalo)
const APP_SHELL_ROUTES = ['/chat', '/friends', '/user', '/stories'];

const ThemeSyncHandler = () => {
  const { user } = useAuth();
  const { syncTheme } = useTheme();

  React.useEffect(() => {
    if (user) {
      syncTheme(user.themeName || 'dark', user.themeColors || null);
    } else {
      syncTheme('dark', null); // Reset khi đăng xuất
    }
  }, [user, syncTheme]);

  return null;
};

const Layout = ({ children }) => {
  const location = useLocation();
  const isAppShell = APP_SHELL_ROUTES.some((r) => location.pathname.startsWith(r));

  if (isAppShell) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* Lớp vỏ Zalo chuẩn Theme màu */}
        <SidebarNav />
        {/* Khu vực render trang chức năng */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
          {children}
        </div>
      </div>
    );
  }

  // Layout thường (Trang chủ, Đăng nhập) có Navbar ngang
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <ThemeSyncHandler />
            <PresenceProvider>
              <NotificationProvider>
                <CallProvider>
                  <VoiceRoomProvider>
                    <GroupCallProvider>
                      <CallNotification />
                      <NotificationToast />
                      <IncomingCallModal />
                      <OutgoingCallScreen />
                      <ActiveCallScreen />
                      <IncomingGroupCallModal />
                      <GroupCallScreen />
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/signup" element={<Signup />} />
                          <Route path="/signin" element={<Signin />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />

                  {/* Giữ route cũ /dashboard nhưng chuyển hướng về /chat */}
                  <Route path="/dashboard" element={<Navigate to="/chat" replace />} />

                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <Chat />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/user/:userId"
                    element={
                      <ProtectedRoute>
                        <UserProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/change-password"
                    element={
                      <ProtectedRoute>
                        <ChangePassword />
                      </ProtectedRoute>
                    }
                  />

                  {/* MODULE BẠN BÈ */}
                  <Route
                    path="/friends"
                    element={
                      <ProtectedRoute>
                        <FriendsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/stories"
                    element={
                      <ProtectedRoute>
                        <StoriesPage />
                      </ProtectedRoute>
                    }
                  />


                          <Route path="/auth/callback" element={<AuthCallback />} />
                          <Route path="/complete-profile" element={<CompleteProfile />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Layout>
                    </GroupCallProvider>
                  </VoiceRoomProvider>
                </CallProvider>
              </NotificationProvider>
            </PresenceProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;