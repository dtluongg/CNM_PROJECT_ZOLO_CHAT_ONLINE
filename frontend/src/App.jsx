import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PresenceProvider } from './context/PresenceContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import AuthCallback from './pages/AuthCallback';
import CompleteProfile from './pages/CompleteProfile';
import Home from './pages/Home';
import UserProfilePage from './pages/UserProfilePage';
const NO_NAVBAR_ROUTES = ['/chat', '/user'];

const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavbar = NO_NAVBAR_ROUTES.some(r => location.pathname.startsWith(r));
  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
};


const App = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <PresenceProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/signin" element={<Signin />} />
              <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route
                path="/user/:userId"
                element={
                  <ProtectedRoute>
                    <UserProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          </PresenceProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
