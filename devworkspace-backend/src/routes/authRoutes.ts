import { Router } from "express";
import {
  signup,
  verifyEmail,
  login,
  googleLogin,
  refreshToken,
  logout,
  me,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
