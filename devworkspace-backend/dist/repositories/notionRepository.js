import { prisma } from "../config/prisma.js";
export const notionRepository = {
    async findByUserId(userId) {
        return prisma.integration.findUnique({
            where: { userId_provider: { userId, provider: "notion" } },
        });
    },
    async upsert(userId, data) {
        return prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "notion" } },
            create: { userId, provider: "notion", ...data },
            update: { ...data, updatedAt: new Date() },
        });
    },
    async delete(userId) {
        return prisma.integration.deleteMany({
            where: { userId, provider: "notion" },
        });
    },
};
