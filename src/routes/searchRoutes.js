import express from "express";
import {
  searchArtisansHandler,
  findNearbyArtisansHandler,
  getRecommendedArtisansHandler,
  geocodeAddressHandler,
  reverseGeocodeHandler,
} from "../controllers/customer/searchController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/artisans", searchArtisansHandler);
router.get("/nearby", findNearbyArtisansHandler);
router.post("/geocode", geocodeAddressHandler);
router.post("/reverse-geocode", reverseGeocodeHandler);

// Protected routes
router.get("/recommended", protect, getRecommendedArtisansHandler);

export default router;
