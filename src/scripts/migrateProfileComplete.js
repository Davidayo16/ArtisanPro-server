// ============================================
// backend/scripts/migrateInitialSetup.js
// Migration to add hasCompletedInitialSetup field
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import Artisan from "../models/Artisan.js";
import ArtisanService from "../models/ArtisanService.js";

dotenv.config();

/**
 * Check if artisan profile is complete (WITHOUT services requirement)
 */
const checkProfileCompletion = async (artisan) => {
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
 * Check if artisan can receive jobs (profile complete + has services)
 */
const checkCanReceiveJobs = async (artisan) => {
  const profileComplete = await checkProfileCompletion(artisan);

  const serviceCount = await ArtisanService.countDocuments({
    artisan: artisan._id,
    enabled: true,
  });

  return profileComplete && serviceCount > 0;
};

/**
 * Migration function
 */
const migrateInitialSetup = async () => {
  try {
    console.log("🚀 Starting hasCompletedInitialSetup migration...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find all artisans
    const artisans = await Artisan.find({});
    console.log(`📊 Found ${artisans.length} artisans to migrate\n`);

    let updatedCount = 0;
    let completedSetupCount = 0;
    let notCompletedSetupCount = 0;
    let canReceiveJobsCount = 0;

    // Process each artisan
    for (const artisan of artisans) {
      const profileComplete = await checkProfileCompletion(artisan);
      const canReceiveJobs = await checkCanReceiveJobs(artisan);

      // 🔥 MIGRATION LOGIC:
      // If profile was EVER completed (has bank details), mark setup as complete
      const hasCompletedSetup = !!(
        artisan.bankDetails?.accountNumber &&
        artisan.bankDetails?.accountName &&
        artisan.bankDetails?.bankName
      );

      let changed = false;

      // Update hasCompletedInitialSetup
      if (artisan.hasCompletedInitialSetup !== hasCompletedSetup) {
        artisan.hasCompletedInitialSetup = hasCompletedSetup;
        changed = true;
      }

      // Update profileComplete (new logic without services)
      if (artisan.profileComplete !== profileComplete) {
        artisan.profileComplete = profileComplete;
        changed = true;
      }

      // Set completion date if becoming complete for first time
      if (profileComplete && !artisan.profileCompletedAt) {
        artisan.profileCompletedAt = new Date();
        changed = true;
      }

      // Save if changed
      if (changed) {
        await artisan.save();
        updatedCount++;

        console.log(
          `${hasCompletedSetup ? "✅" : "⚠️"} Updated ${
            artisan.businessName || artisan.email
          }:`
        );
        console.log(`   - hasCompletedInitialSetup: ${hasCompletedSetup}`);
        console.log(`   - profileComplete: ${profileComplete}`);
        console.log(`   - canReceiveJobs: ${canReceiveJobs}\n`);
      }

      // Count totals
      if (hasCompletedSetup) completedSetupCount++;
      else notCompletedSetupCount++;

      if (canReceiveJobs) canReceiveJobsCount++;
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(70));
    console.log(`Total Artisans:                  ${artisans.length}`);
    console.log(`Updated:                         ${updatedCount}`);
    console.log(`Completed Initial Setup:         ${completedSetupCount}`);
    console.log(`Not Completed Initial Setup:     ${notCompletedSetupCount}`);
    console.log(`Can Receive Jobs:                ${canReceiveJobsCount}`);
    console.log("=".repeat(70));

    console.log("\n✅ Migration completed successfully!");
    console.log(
      "\n💡 Next: Existing users with bank details can now login to dashboard."
    );
    console.log("💡 New users will need to complete profile wizard first.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
};

// Run migration
migrateInitialSetup();
