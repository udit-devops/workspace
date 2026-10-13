import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { publicUserSelect } from "../utils/publicUser.js";

/** Resolve an access token to its user, or null if the token is invalid/expired. */
export async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: publicUserSelect,
    });
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  const user = await getUserFromToken(req.cookies?.accessToken);
  if (!user) return res.status(401).json({ message: "Not authenticated" });

  req.user = user;
  next();
};
