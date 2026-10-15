import { Router } from "express";
import {
  connect, callback, status, disconnect, repos, cloneRepo,
  gitStatus, gitDiff, gitStage, gitUnstage, gitCommit,
  gitPush, gitPull, gitFetch, gitBranches, gitCheckout, gitLog, gitShow,
} from "../controllers/githubController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Sign-in
router.get("/connect", requireAuth, connect);
router.get("/callback", callback);
router.get("/status", requireAuth, status);
router.post("/disconnect", requireAuth, disconnect);

// GitHub API
router.get("/repos", requireAuth, repos);
router.post("/clone", requireAuth, cloneRepo);

// Local git (workspace = project folder inside WORKSPACE_ROOT)
router.get("/git/status", requireAuth, gitStatus);
router.get("/git/diff", requireAuth, gitDiff);
router.get("/git/branches", requireAuth, gitBranches);
router.get("/git/log", requireAuth, gitLog);
router.get("/git/show", requireAuth, gitShow);
router.post("/git/stage", requireAuth, gitStage);
router.post("/git/unstage", requireAuth, gitUnstage);
router.post("/git/commit", requireAuth, gitCommit);
router.post("/git/push", requireAuth, gitPush);
router.post("/git/pull", requireAuth, gitPull);
router.post("/git/fetch", requireAuth, gitFetch);
router.post("/git/checkout", requireAuth, gitCheckout);

export default router;
