// backend/controllers/auth/profileController.js
import Artisan from "../../models/Artisan.js";
import Customer from "../../models/Customer.js";
import ArtisanService from "../../models/ArtisanService.js";
import {
  checkProfileCompletion,
  checkCanReceiveJobs,
} from "../../utils/artisanHelpers.js";

// @desc    Check profile completion status
// @route   GET /api/v1/auth/profile-status
// @access  Private
export const getProfileStatus = async (req, res) => {
  try {
    const user = req.user;

    if (user.role === "customer") {
      return res.status(200).json({
        success: true,
        data: {
          profileComplete: true,
          completionPercentage: 100,
          missingRequired: [],
          canReceiveJobs: true,
          hasCompletedInitialSetup: true,
        },
      });
    }

    if (user.role === "artisan") {
      const artisan = await Artisan.findById(user._id);

      // Check services count
      const serviceCount = await ArtisanService.countDocuments({
        artisan: user._id,
        enabled: true,
      });

      // 🔥 REQUIRED FIELDS (No services!)
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

      const missingRequired = Object.keys(requiredFields).filter(
        (key) => !requiredFields[key]
      );

      const profileComplete = missingRequired.length === 0;

      // 🔥 NEW: Can receive jobs = profileComplete + has services
      const canReceiveJobs = profileComplete && serviceCount > 0;

      console.log("✅ PROFILE STATUS:", {
        profileComplete,
        canReceiveJobs,
        hasCompletedInitialSetup: artisan.hasCompletedInitialSetup,
        serviceCount,
      });

      return res.status(200).json({
        success: true,
        data: {
          profileComplete,
          completionPercentage: Math.round(
            (Object.values(requiredFields).filter(Boolean).length /
              Object.keys(requiredFields).length) *
              100
          ),
          missingRequired,
          canReceiveJobs,
          hasCompletedInitialSetup: artisan.hasCompletedInitialSetup || false, // 🔥 NEW
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profileComplete: true,
        completionPercentage: 100,
        hasCompletedInitialSetup: true,
      },
    });
  } catch (error) {
    console.error("❌ Profile status check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check profile status",
      error: error.message,
    });
  }
};
