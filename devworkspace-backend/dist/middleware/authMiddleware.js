import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
export const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token)
            return res.status(401).json({ message: "Not authorized" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user)
            return res.status(401).json({ message: "Invalid token" });
        req.user = user;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Token expired or invalid" });
    }
};
