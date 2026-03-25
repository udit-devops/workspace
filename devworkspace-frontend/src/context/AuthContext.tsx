import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/api";
import type { User } from "../types/user";
import type { AuthContextType } from "../types/auth";


const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ SAFE auth check (runs once)
  useEffect(() => {
    debugger;
    const initAuth = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.user);
  };

  const signup = async (email: string, password: string, captcha: string): Promise<string> => {
    const res = await api.post("/auth/signup", { email, password, captcha });
    return res.data.userId;
  };

const googleLogin = async (credential: string) => {
  const res = await api.post("/auth/google", { credential });
  setUser(res.data.user);
  return res.data.user; // important
};


  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, signup, googleLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

