import { Router } from "express";
import {
  getRoot,
  getDirs,
  getTree,
  readFile,
  writeFile,
  createItem,
  deleteItem,
} from "../controllers/filesController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/root", requireAuth, getRoot);
router.get("/dirs", requireAuth, getDirs);
router.get("/tree", requireAuth, getTree);
router.get("/read", requireAuth, readFile);
router.put("/write", requireAuth, writeFile);
router.post("/create", requireAuth, createItem);
router.delete("/delete", requireAuth, deleteItem);

export default router;