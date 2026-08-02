import { prisma } from "../config/prisma.js";

export const notionRepository = {
  async findByUserId(userId: string) {
    return prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: "notion" } },
    });
  },

  async upsert(userId: string, data: {
    accessToken: string;
    workspaceId?: string | null;
    workspaceName?: string | null;
    botId?: string | null;
  }) {
    return prisma.integration.upsert({
      where: { userId_provider: { userId, provider: "notion" } },
      create: { userId, provider: "notion", ...data },
      update: { ...data, updatedAt: new Date() },
    });
  },

  async delete(userId: string) {
    return prisma.integration.deleteMany({
      where: { userId, provider: "notion" },
    });
  },
};
