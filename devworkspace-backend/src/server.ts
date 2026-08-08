import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import notionRoutes from "./routes/notionRoutes.js";
import filesRoutes from "./routes/filesRoutes.js";



const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL,
//     credentials: true,
//   })
// );
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true, // 🔥 allow cookies
}));

// MOUNT ROUTES
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
