import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  signup,
  verifyEmail,
  login,
  googleLogin,
  refreshToken,
  logout,
  me,
  resendOtp,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const limit = (max: number, minutes: number) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
  });

const credentialsLimit = limit(10, 15);
const otpLimit = limit(5, 10);

const router = Router();

router.post("/signup", credentialsLimit, signup);
router.post("/verify-email", otpLimit, verifyEmail);
router.post("/resend-otp", otpLimit, resendOtp);
router.post("/login", credentialsLimit, login);
router.post("/google", googleLogin);
router.get("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
