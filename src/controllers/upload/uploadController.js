import User from "../../models/User.js";
import Artisan from "../../models/Artisan.js";
import {
  uploadProfilePhoto,
  uploadImage,
  uploadMultipleImages,
  uploadDocument,
  deleteImage,
} from "../../services/upload/cloudinaryService.js";

// @desc    Upload profile photo
// @route   POST /api/v1/upload/profile-photo
// @access  Private
export const uploadProfilePhotoHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    // Upload to Cloudinary
    const result = await uploadProfilePhoto(req.file);

    // Update user profile photo
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete old profile photo if exists and not default
    if (user.profilePhoto && user.profilePhoto !== "default-avatar.png") {
      try {
        // Extract public ID from old photo URL
        const oldPublicId = user.profilePhoto
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await deleteImage(oldPublicId);
      } catch (error) {
        console.log("Could not delete old profile photo:", error.message);
      }
    }

    user.profilePhoto = result.url;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile photo",
      error: error.message,
    });
  }
};

// @desc    Upload portfolio images
// @route   POST /api/v1/upload/portfolio
// @access  Private/Artisan
export const uploadPortfolioImages = async (req, res) => {
  try {
    console.log("🔍 Backend received files:", req.files.length);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    const results = await uploadMultipleImages(
      req.files,
      "artisan-marketplace/portfolio"
    );

    console.log("📤 Sending response with results:", results.length);
    console.log("📤 Response data:", JSON.stringify(results, null, 2));

    res.status(200).json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to upload portfolio images",
      error: error.message,
    });
  }
};

// @desc    Upload ID document
// @route   POST /api/v1/upload/id-document
// @access  Private/Artisan
export const uploadIdDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    // Upload to Cloudinary
    const result = await uploadDocument(req.file);

    // Update artisan verification document
    const artisan = await Artisan.findById(req.user.id);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    if (!artisan.verification) {
      artisan.verification = {};
    }

    artisan.verification.idDocument = result.url;
    await artisan.save();

    res.status(200).json({
      success: true,
      message: "ID document uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to upload ID document",
      error: error.message,
    });
  }
};

// @desc    Upload certification document
// @route   POST /api/v1/upload/certification
// @access  Private/Artisan
export const uploadCertificationDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    // Upload to Cloudinary
    const result = await uploadDocument(req.file);

    res.status(200).json({
      success: true,
      message: "Certification document uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        size: result.size,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to upload certification document",
      error: error.message,
    });
  }
};

// @desc    Upload booking photos (for customers)
// @route   POST /api/v1/upload/booking-photos
// @access  Private
export const uploadBookingPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one photo",
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 photos allowed",
      });
    }

    // 🚀 OPTIMIZATION: Parallel upload already handled by uploadMultipleImages
    // This function should already be uploading in parallel
    const results = await uploadMultipleImages(
      req.files,
      "artisan-marketplace/bookings"
    );

    res.status(200).json({
      success: true,
      message: `${results.length} photos uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to upload booking photos",
      error: error.message,
    });
  }
};

// @desc    Delete image
// @route   DELETE /api/v1/upload/image
// @access  Private
export const deleteImageHandler = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Please provide public ID",
      });
    }

    await deleteImage(publicId);

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
};
