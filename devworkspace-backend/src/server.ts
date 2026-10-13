// Must be the first import: ES modules evaluate imports before the module body,
// so env vars have to be loaded before any other module reads process.env.
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { CLIENT_URL } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import notionRoutes from "./routes/notionRoutes.js";
import filesRoutes from "./routes/filesRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupTerminalWebSocket } from "./websocket/terminalServer.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: CLIENT_URL, credentials: true }));

app.use("/auth", authRoutes);
app.use("/auth/notion", notionRoutes);
app.use("/files", filesRoutes);

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

setupTerminalWebSocket(server, CLIENT_URL);
