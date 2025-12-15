import express from "express";
import {
  getServices,
  getService,
  getServiceBySlug,
  calculateServicePrice,
  searchServices,
  getPopularServices,
} from "../controllers/customer/serviceController.js";

const router = express.Router();

router.get("/", getServices);
router.get("/search", searchServices);
router.get("/popular", getPopularServices);
router.get("/:id", getService);
router.get("/slug/:slug", getServiceBySlug);
router.post("/:id/calculate-price", calculateServicePrice);

export default router;
