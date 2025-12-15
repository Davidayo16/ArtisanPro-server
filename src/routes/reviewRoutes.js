import express from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  respondToReview,
  markReviewHelpful,
  getArtisanReviews,
  getCustomerReviews,
  getArtisanReceivedReviews,
  flagReview,
  getArtisanReviewStats,
} from "../controllers/review/reviewController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleCheck.js";

const router = express.Router();

// ============================================
// CRITICAL: Specific paths MUST come before dynamic params
// ============================================

// ✅ ARTISAN'S RECEIVED REVIEWS - Must be FIRST (protected)
router.get(
  "/artisan/received",
  protect,
  authorize("artisan"),
  getArtisanReceivedReviews
);

// ✅ Public artisan review stats (specific path before dynamic param)
router.get("/artisan/:artisanId/stats", getArtisanReviewStats);

// ✅ Get reviews for a specific artisan (public, dynamic param last)
router.get("/artisan/:artisanId", getArtisanReviews);

// ============================================
// OTHER PROTECTED ROUTES
// ============================================

router.use(protect); // All routes below require authentication

// Customer's reviews (reviews they've written)
router.get("/customer/my-reviews", authorize("customer"), getCustomerReviews);

// Create review for a booking
router.post("/:bookingId", createReview);

// Update review
router.put("/:id", updateReview);

// Delete review
router.delete("/:id", deleteReview);

// Respond to review (artisan responds to customer review)
router.post("/:id/respond", respondToReview);

// Mark review as helpful
router.post("/:id/helpful", markReviewHelpful);

// Flag review for moderation
router.post("/:id/flag", flagReview);

export default router;
