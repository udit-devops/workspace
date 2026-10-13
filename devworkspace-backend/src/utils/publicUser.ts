import type { User } from "@prisma/client";

/** Fields that are safe to send to the browser (never the password hash). */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  provider: true,
  isVerified: true,
  createdAt: true,
} as const;

export const toPublicUser = ({ id, email, name, provider, isVerified, createdAt }: User) => ({
  id,
  email,
  name,
  provider,
  isVerified,
  createdAt,
});
