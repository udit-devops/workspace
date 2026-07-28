import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import notionRoutes from "./routes/notionRoutes.js";

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use("/auth", authRoutes);
app.use("/auth/notion", notionRoutes);
