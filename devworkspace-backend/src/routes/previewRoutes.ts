import { Router } from "express";
import { createSession, serveFile } from "../controllers/previewController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Creating a session requires login; the returned token then authorizes
// read-only GETs for that one workspace (see services/previewService).
router.post("/sessions", requireAuth, createSession);
router.use("/:token", serveFile);

export default router;
