import { cloudinary } from "../../config/cloudinary.js";
import DatauriParser from "datauri/parser.js";
import path from "path";

const parser = new DatauriParser();

// Convert buffer to base64 data URI
const bufferToDataURI = (buffer, mimetype) => {
  const ext = mimetype.split("/")[1];
  return parser.format(`.${ext}`, buffer);
};

// Upload single image to Cloudinary
export const uploadImage = async (file, folder = "artisan-marketplace") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Convert buffer to data URI
    const fileDataURI = bufferToDataURI(file.buffer, file.mimetype);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileDataURI.content, {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { width: 1000, height: 1000, crop: "limit" }, // Max dimensions
        { quality: "auto:good" }, // Auto quality optimization
        { fetch_format: "auto" }, // Auto format (WebP when supported)
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

// Upload multiple images
export const uploadMultipleImages = async (
  files,
  folder = "artisan-marketplace"
) => {
  try {
    if (!files || files.length === 0) {
      throw new Error("No files provided");
    }

    const uploadPromises = files.map((file) => uploadImage(file, folder));
    const results = await Promise.all(uploadPromises);

    console.log("✅ Cloudinary uploads completed:", results.length);
    console.log("✅ Results:", JSON.stringify(results, null, 2));

    return results;
  } catch (error) {
    console.error("❌ Multiple images upload error:", error);
    throw new Error(`Multiple images upload failed: ${error.message}`);
  }
};

// Delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error("No public ID provided");
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      throw new Error("Failed to delete image");
    }

    return result;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

// Delete multiple images
export const deleteMultipleImages = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) {
      throw new Error("No public IDs provided");
    }

    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    const results = await Promise.all(deletePromises);

    return results;
  } catch (error) {
    console.error("❌ Multiple images deletion error:", error);
    throw new Error(`Multiple images deletion failed: ${error.message}`);
  }
};

// Upload profile photo (circular crop)
export const uploadProfilePhoto = async (file) => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    const fileDataURI = bufferToDataURI(file.buffer, file.mimetype);

    const result = await cloudinary.uploader.upload(fileDataURI.content, {
      folder: "artisan-marketplace/profiles",
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" }, // Square crop with face detection
        // { radius: "max" }, // Make it circular
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("❌ Profile photo upload error:", error);
    throw new Error(`Profile photo upload failed: ${error.message}`);
  }
};

// Upload document (PDF, etc.)
export const uploadDocument = async (file) => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    const fileDataURI = bufferToDataURI(file.buffer, file.mimetype);

    const result = await cloudinary.uploader.upload(fileDataURI.content, {
      folder: "artisan-marketplace/documents",
      resource_type: "auto",
      format: file.mimetype === "application/pdf" ? "pdf" : undefined,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
    };
  } catch (error) {
    console.error("❌ Document upload error:", error);
    throw new Error(`Document upload failed: ${error.message}`);
  }
};

// Get optimized image URL with transformations
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 800,
    height = 800,
    crop = "limit",
    quality = "auto:good",
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop },
      { quality },
      { fetch_format: "auto" },
    ],
  });
};
