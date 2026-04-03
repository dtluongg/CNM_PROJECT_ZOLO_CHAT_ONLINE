import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import AuthCallback from './pages/AuthCallback';
import CompleteProfile from './pages/CompleteProfile';

const NO_NAVBAR_ROUTES = ['/chat'];

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

const Home = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <div className="text-center">
      <h1 className="text-5xl font-bold text-white mb-6">ZOLO Chat</h1>
      <p className="text-xl text-blue-100 mb-8">Ứng dụng chat online hiện đại</p>
      <div className="space-x-4">
        <a href="/signin" className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-blue-50 transition">Đăng Nhập</a>
        <a href="/signup" className="inline-block bg-blue-400 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-500 transition">Đăng Ký</a>
      </div>
    </div>
  </div>
);

const App = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
