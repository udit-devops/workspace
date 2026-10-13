import type { Prisma, User } from "@prisma/client";

/** Fields that are safe to send to the browser (never the password hash). */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  provider: true,
  isVerified: true,
  createdAt: true,
} as const;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const toPublicUser = ({ id, email, name, provider, isVerified, createdAt }: User): PublicUser => ({
  id,
  email,
  name,
  provider,
  isVerified,
  createdAt,
});
