import express from "express";
import {
  uploadProfilePhotoHandler,
  uploadPortfolioImages,
  uploadIdDocument,
  uploadCertificationDocument,
  uploadBookingPhotos,
  deleteImageHandler,
} from "../controllers/upload/uploadController.js";
import { uploadSingle, uploadMultiple } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleCheck.js";

const router = express.Router();

// All upload routes require authentication
router.use(protect);

// Profile photo (all users)
router.post("/profile-photo", uploadSingle("photo"), uploadProfilePhotoHandler);

// Portfolio images (artisans only)
router.post(
  "/portfolio",
  authorize("artisan"),
  uploadMultiple("images", 5),
  uploadPortfolioImages
);

// ID document (artisans only)
router.post(
  "/id-document",
  authorize("artisan"),
  uploadSingle("document"),
  uploadIdDocument
);

// Certification document (artisans only)
router.post(
  "/certification",
  authorize("artisan"),
  uploadSingle("document"),
  uploadCertificationDocument
);

// Booking photos (customers and artisans)
router.post(
  "/booking-photos",
  uploadMultiple("photos", 5),
  uploadBookingPhotos
);

// Delete image
router.delete("/image", deleteImageHandler);

export default router;
