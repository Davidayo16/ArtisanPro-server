// backend/routes/booking.js
import express from "express";
import {
  createBookingHandler,
  getBooking,
  getCustomerBookings,
  cancelBooking,
} from "../controllers/booking/bookingController.js";
import {
  acceptBooking,
  declineBooking,
  proposePrice,
  startJob,
  completeJob,
} from "../controllers/artisan/jobController.js";
import {
  customerCounterOffer,
  artisanCounterOffer,
  acceptNegotiatedPrice,
  rejectNegotiationHandler,
  getNegotiation,
} from "../controllers/booking/negotiationController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleCheck.js";

// NEW IMPORT
import {
  getArtisanBookings,
  getBookingStats,
} from "../controllers/booking/artisanBookingController.js";
import { getCustomerStats } from "../controllers/booking/customerBookingController.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Customer routes
router.post("/", authorize("customer"), createBookingHandler);
router.get("/customer/my-bookings", authorize("customer"), getCustomerBookings);

// Artisan routes
// Artisan routes
router.get("/artisan/my-bookings", authorize("artisan"), getArtisanBookings); // NEW
router.get("/artisan/stats", authorize("artisan"), getBookingStats); // ✅ ADD THIS
router.get("/customer/stats", authorize("customer"), getCustomerStats);
router.put("/:id/accept", authorize("artisan"), acceptBooking);
router.put("/:id/decline", authorize("artisan"), declineBooking);
router.post("/:id/propose-price", authorize("artisan"), proposePrice);
router.put("/:id/start", authorize("artisan"), startJob);
router.put("/:id/complete", authorize("artisan"), completeJob);

// Negotiation routes
router.post("/:id/counter-offer", authorize("customer"), customerCounterOffer);
router.post("/:id/artisan-counter", authorize("artisan"), artisanCounterOffer);
router.post("/:id/accept-price", acceptNegotiatedPrice);
router.post("/:id/reject-negotiation", rejectNegotiationHandler);
router.get("/:id/negotiation", getNegotiation);

// Common
router.get("/:id", getBooking);
router.put("/:id/cancel", cancelBooking);

export default router;
