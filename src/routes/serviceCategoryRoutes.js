import express from "express";
import {
  getServiceCategories,
  getServiceCategory,
  getCategoryBySlug,
} from "../controllers/customer/serviceCategoryController.js";

const router = express.Router();

router.get("/", getServiceCategories);
router.get("/:id", getServiceCategory);
router.get("/slug/:slug", getCategoryBySlug);

export default router;
