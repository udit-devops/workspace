import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/DashboardPage";
import type { JSX } from "react";
import VerifyEmailPage from "./pages/VerifyEmailPage";
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
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

    </Routes>
  );
}
