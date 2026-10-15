import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import notionRoutes from "./routes/notionRoutes.js";
import filesRoutes from "./routes/filesRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import previewRoutes from "./routes/previewRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";



const app = express();

// Middleware
// CORS must run before the body parsers: if a parser rejects a request
// (e.g. 413 Payload Too Large) the error response still needs CORS headers,
// otherwise the browser hides it and the client only sees "Network Error".
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
// File saves carry whole files (fileService caps them at MAX_FILE_SIZE = 1 MB);
// JSON escaping can inflate that, so this route gets extra headroom.
app.use("/files", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// MOUNT ROUTES
app.use("/auth", authRoutes);
app.use("/auth/notion", notionRoutes);
app.use("/files", filesRoutes);
app.use("/github", githubRoutes);
app.use("/preview", previewRoutes);

app.post("/ai/chat", (req, res) => {
  const { message } = req.body;
  res.json({ reply: `[AI Mock] Received: "${message}". AI integration coming soon.` });
});

app.get("/", (_req, res) => {
  res.send("API running");
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import { setupTerminalWebSocket } from "./websocket/terminalServer.js";
setupTerminalWebSocket(server);
