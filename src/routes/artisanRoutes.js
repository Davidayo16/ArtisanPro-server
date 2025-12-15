import express from "express";
import {
  getMyProfile,
  updateBasicInfo,
  updateServices,
  updateWorkingHours,
  updateBankDetails,
  updateVerification,
  toggleAvailability,
  getArtisanProfile,
  getArtisans,
  getMyServices,
  addServiceToArtisan,
  updateArtisanService,
  removeServiceFromArtisan,
  toggleArtisanService,
} from "../controllers/artisan/artisanController.js";

import {
  getMyPortfolio,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getArtisanPortfolio,
} from "../controllers/artisan/portfolioController.js";
import { getDashboardOverview } from "../controllers/artisan/dashboardController.js";

import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleCheck.js";
import {
  getArtisanAnalytics,
  exportAnalytics,
  getTopServices,
} from "../controllers/artisan/artisanAnalyticsController.js";

const router = express.Router();

// ========== PRIVATE ROUTES (Artisan only) - MUST COME FIRST ==========
// Apply auth middleware
router.use("/me", protect, authorize("artisan"));

// Profile management
router.get("/me/profile", getMyProfile);
router.put("/me/basic-info", updateBasicInfo);
router.put("/me/services", updateServices); // Bulk update (for wizard)
router.put("/me/working-hours", updateWorkingHours);
router.put("/me/bank-details", updateBankDetails);
router.put("/me/verification", updateVerification);
router.put("/me/availability", toggleAvailability);

// Service management (Individual CRUD)
router.get("/me/services", getMyServices);
router.post("/me/services", addServiceToArtisan);
router.put("/me/services/:id", updateArtisanService);
router.delete("/me/services/:id", removeServiceFromArtisan);
router.put("/me/services/:id/toggle", toggleArtisanService);

// Dashboard & Analytics
router.get("/me/dashboard/overview", getDashboardOverview);
router.get("/me/analytics", getArtisanAnalytics);
router.get("/me/analytics/export", exportAnalytics);
router.get("/me/analytics/top-services", getTopServices);

// Portfolio management
router.get("/me/portfolio", getMyPortfolio);
router.post("/me/portfolio", addPortfolioItem);
router.put("/me/portfolio/:id", updatePortfolioItem);
router.delete("/me/portfolio/:id", deletePortfolioItem);

// ========== PUBLIC ROUTES - MUST COME AFTER /me ROUTES ==========
router.get("/", getArtisans); // Get all artisans with filters
router.get("/:id", getArtisanProfile); // Get specific artisan profile
router.get("/:artisanId/portfolio", getArtisanPortfolio); // Get artisan's public portfolio

export default router;