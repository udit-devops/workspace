export interface User {
  id: string;
  email: string;
  name?: string | null;
  provider: "credentials" | "google";
  isVerified: boolean;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;

  login: (email: string, password: string, turnstileToken: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    captcha: string
  ) => Promise<string>; // ✅ RETURN userId
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth?: () => Promise<void>;
}
