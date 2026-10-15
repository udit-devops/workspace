import { prisma } from "../config/prisma.js";

/**
 * GitHub integration row. Reuses the generic Integration table:
 *   workspaceId   -> GitHub user id
 *   workspaceName -> GitHub login
 *   botId         -> GitHub email used for commits
 * Tokens are stored encrypted (see utils/tokenCrypto).
 */
export const githubRepository = {
  async findByUserId(userId: string) {
    return prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: "github" } },
    });
  },

  async upsert(userId: string, data: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    workspaceId?: string | null;
    workspaceName?: string | null;
    botId?: string | null;
  }) {
    return prisma.integration.upsert({
      where: { userId_provider: { userId, provider: "github" } },
      create: { userId, provider: "github", ...data },
      update: { ...data, updatedAt: new Date() },
    });
  },

  async delete(userId: string) {
    return prisma.integration.deleteMany({
      where: { userId, provider: "github" },
    });
  },
};
