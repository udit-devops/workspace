import { prisma } from "./src/config/prisma.ts";

async function run() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users:", users);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
