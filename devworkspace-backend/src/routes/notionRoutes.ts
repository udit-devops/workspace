import { Router } from "express";
import { connect, callback, status, pages, disconnect } from "../controllers/notionController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/connect", requireAuth, connect);
router.get("/callback", callback);
router.get("/status", requireAuth, status);
router.get("/pages", requireAuth, pages);
router.post("/disconnect", requireAuth, disconnect);

export default router;
