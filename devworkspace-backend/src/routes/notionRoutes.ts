import { Router } from "express";
import {
  connect, callback, status, pages, pageContent,
  updateBlock, addBlocks, removeBlock, createPage, disconnect,
} from "../controllers/notionController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/connect", requireAuth, connect);
router.get("/callback", callback);
router.get("/status", requireAuth, status);
router.get("/pages", requireAuth, pages);
router.get("/pages/:pageId", requireAuth, pageContent);
router.patch("/blocks/:blockId", requireAuth, updateBlock);
router.post("/pages/:pageId/blocks", requireAuth, addBlocks);
router.delete("/blocks/:blockId", requireAuth, removeBlock);
router.post("/pages", requireAuth, createPage);
router.post("/disconnect", requireAuth, disconnect);

export default router;
