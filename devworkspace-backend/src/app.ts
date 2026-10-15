import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import notionRoutes from "./routes/notionRoutes.js";
import filesRoutes from "./routes/filesRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import previewRoutes from "./routes/previewRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

// CORS first so parser errors (413 etc.) still reach the client readable.
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use("/files", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/auth/notion", notionRoutes);
app.use("/files", filesRoutes);
app.use("/github", githubRoutes);
app.use("/preview", previewRoutes);
app.use(errorHandler);
