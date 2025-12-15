import express from "express";
import passport from "../config/passport.js";
import {
  register,
  login,
  getMe,
  logout,
  googleAuthSuccess,
  googleAuthFailure,
} from "../controllers/auth/authController.js";
import {
  sendEmailOTP,
  verifyEmail,
  sendPhoneOTP,
  verifyPhone,
  resendOTP,
} from "../controllers/auth/verificationController.js";
import { getProfileStatus } from "../controllers/auth/profileController.js";
import {
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  changePassword,
} from "../controllers/auth/passwordController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ========== TRADITIONAL AUTH ==========
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/logout", protect, logout);
router.get("/profile-status", protect, getProfileStatus);

// ========== GOOGLE OAUTH ==========
// Google OAuth - Customer
router.get(
  "/google/customer",
  (req, res, next) => {
    // Set role in session before redirecting to Google
    req.query.state = "customer";
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: "customer",
  })
);

// Google OAuth - Artisan
router.get(
  "/google/artisan",
  (req, res, next) => {
    req.query.state = "artisan";
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: "artisan",
  })
);

// Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/v1/auth/google/failure",
    session: false, // We use JWT, not sessions
  }),
  googleAuthSuccess
);

// Google OAuth Failure
router.get("/google/failure", googleAuthFailure);

// ========== EMAIL/PHONE VERIFICATION ==========
router.post("/send-email-otp", protect, sendEmailOTP);
router.post("/verify-email", protect, verifyEmail);
router.post("/send-phone-otp", protect, sendPhoneOTP);
router.post("/verify-phone", protect, verifyPhone);
router.post("/resend-otp", protect, resendOTP);

// ========== PASSWORD MANAGEMENT ==========
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);

export default router;
