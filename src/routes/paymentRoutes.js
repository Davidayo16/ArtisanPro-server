// backend/routes/paymentRoutes.js
import express from "express";
import {
  initializePaymentHandler,
  verifyPaymentHandler,
  getPayment,
  verifyPaymentStream, // ✅ NEW IMPORT
} from "../controllers/payment/paystackController.js";
import {
  releaseEscrowHandler,
  requestRefund,
  getEscrow,
} from "../controllers/payment/escrowController.js";
import { paystackWebhook } from "../controllers/payment/webhookController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleCheck.js";

const router = express.Router();

// Webhook (public but verified)
router.post("/webhook", paystackWebhook);

// Protected routes
router.use(protect);

// Payment routes
router.post("/initialize", authorize("customer"), initializePaymentHandler);

// ✅ NEW: SSE stream verification (use this for real-time progress)
router.get("/verify-stream/:reference", verifyPaymentStream);

// Original verify (keep as fallback)
router.get("/verify/:reference", verifyPaymentHandler);

router.get("/:id", getPayment);

// Escrow routes
router.post(
  "/escrow/:bookingId/release",
  authorize("customer"),
  releaseEscrowHandler
);
router.post("/escrow/:bookingId/refund", authorize("customer"), requestRefund);
router.get("/escrow/:bookingId", getEscrow);

export default router;
