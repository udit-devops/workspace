import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/DashboardPage";
import type { JSX } from "react";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LandingPage from "./pages/LandingPage";
import './App.css'
function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
