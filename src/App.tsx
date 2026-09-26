import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { StudentDashboard } from './pages/StudentDashboard.tsx';
import { ChallengeWorkspace } from './pages/ChallengeWorkspace.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { PublicLeaderboardPage } from './pages/PublicLeaderboardPage.tsx';

const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8F5]">
        <div className="w-8 h-8 border-4 border-[#DA627D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8F5]">
        <div className="w-8 h-8 border-4 border-[#A53860] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const WorkspaceRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8F5]">
        <div className="w-8 h-8 border-4 border-[#DA627D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function AppShell() {
  const location = useLocation();
  const showFooter = location.pathname !== '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF8F5] text-[#220914]">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<AuthPage initialMode="register" initialRole="student" />} />
          <Route path="/login" element={<AuthPage initialMode="login" initialRole="student" />} />
          <Route path="/leaderboard" element={<PublicLeaderboardPage />} />

          <Route
            path="/student"
            element={
              <StudentRoute>
                <StudentDashboard />
              </StudentRoute>
            }
          />

          <Route
            path="/workspace/:roundId"
            element={
              <WorkspaceRoute>
                <ChallengeWorkspace />
              </WorkspaceRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
