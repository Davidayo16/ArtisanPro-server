// backend/routes/customerRoutes.js
import express from "express";
import { getCustomerDashboardOverview } from "../controllers/customer/customerDashboardController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleCheck.js";
import {
  // Profile Management
  getCustomerProfile,
  updateCustomerProfile,
  updateProfilePhoto,
  changePassword,
  updateNotificationPreferences,
  deactivateAccount,
  // Saved Artisans
  getSavedArtisans,
  addSavedArtisan,
  removeSavedArtisan,
} from "../controllers/customer/customerController.js";

const router = express.Router();

// ========== PROTECTED ROUTES (Customer only) ==========
// Apply middleware to all routes below
router.use(protect, authorize("customer"));

// ========== DASHBOARD ROUTES ==========
router.get("/dashboard/overview", getCustomerDashboardOverview);

// ========== PROFILE ROUTES ==========
router.get("/profile", getCustomerProfile);
router.put("/profile", updateCustomerProfile);
router.put("/profile/photo", updateProfilePhoto);
router.put("/profile/password", changePassword);
router.put("/profile/preferences", updateNotificationPreferences);
router.put("/profile/deactivate", deactivateAccount);

// ========== SAVED ARTISANS ROUTES ==========
router.get("/saved-artisans", getSavedArtisans);
router.post("/saved-artisans/:artisanId", addSavedArtisan);
router.delete("/saved-artisans/:artisanId", removeSavedArtisan);

export default router;
