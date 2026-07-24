
import AppShell from "../components/layouts/Appshell";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  const normalizedUser = user ? {
    name: user.name ?? undefined,
    email: user.email ?? undefined,
  } : undefined;

  return <AppShell user={normalizedUser} />;
}