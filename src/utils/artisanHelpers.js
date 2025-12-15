// backend/utils/artisanHelpers.js
import Artisan from "../models/Artisan.js";
import ArtisanService from "../models/ArtisanService.js";

/**
 * Check if artisan profile is complete
 * Returns TRUE if all REQUIRED fields are filled
 * @param {String} artisanId - Artisan ID
 * @returns {Boolean} - Whether profile is complete
 */
export const checkProfileCompletion = async (artisanId) => {
  const artisan = await Artisan.findById(artisanId);
  if (!artisan) return false;

  // ✅ REQUIRED FIELDS (No services required here!)
  const requiredFields = {
    phone: !!artisan.phone,
    businessName: !!artisan.businessName,
    bio: !!artisan.bio,
    yearsOfExperience: artisan.yearsOfExperience !== undefined,
    location: !!(artisan.location?.city && artisan.location?.state),
    workingHours: !!artisan.workingHours,
    bankDetails: !!(
      artisan.bankDetails?.accountNumber &&
      artisan.bankDetails?.accountName &&
      artisan.bankDetails?.bankName
    ),
  };

  return Object.values(requiredFields).every((field) => field === true);
};

/**
 * Check if artisan can receive jobs
 * Requires: profileComplete + has services + verified
 * @param {String} artisanId - Artisan ID
 * @returns {Boolean} - Whether artisan can receive jobs
 */
export const checkCanReceiveJobs = async (artisanId) => {
  const artisan = await Artisan.findById(artisanId);
  if (!artisan) return false;

  // Check profile completeness
  const profileComplete = await checkProfileCompletion(artisanId);

  // Check services
  const serviceCount = await ArtisanService.countDocuments({
    artisan: artisanId,
    enabled: true,
  });

  // Check verification (optional - you can remove this if not needed yet)
  const isVerified = artisan.verification?.status === "verified";

  // 🔥 Can receive jobs = profile complete + has services + (optionally) verified
  return profileComplete && serviceCount > 0; // Remove "&& isVerified" if not needed
};

/**
 * Update artisan's profile completion status
 * @param {String} artisanId - Artisan ID
 * @returns {Object} - Status object with profileComplete and canReceiveJobs
 */
export const updateProfileCompleteStatus = async (artisanId) => {
  const artisan = await Artisan.findById(artisanId);
  if (!artisan) return null;

  const isComplete = await checkProfileCompletion(artisanId);
  const canReceiveJobs = await checkCanReceiveJobs(artisanId);

  let updated = false;

  // Update profileComplete
  if (artisan.profileComplete !== isComplete) {
    artisan.profileComplete = isComplete;
    updated = true;

    // Set completion date only when becoming complete for the first time
    if (isComplete && !artisan.profileCompletedAt) {
      artisan.profileCompletedAt = new Date();
    }
  }

  if (updated) {
    await artisan.save();
    console.log(`✅ Profile status updated for ${artisanId}:`, {
      profileComplete: isComplete,
      canReceiveJobs,
    });
  }

  return {
    profileComplete: isComplete,
    canReceiveJobs,
  };
};
