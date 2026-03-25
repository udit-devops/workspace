export interface User {
  id: string;
  email: string;
  name?: string | null;
  provider: "credentials" | "google";
  isVerified: boolean;
  createdAt?: string;
}
