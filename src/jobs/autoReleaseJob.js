import cron from "node-cron";
import Escrow from "../models/Escrow.js";
import Booking from "../models/Booking.js";
import { releaseEscrow } from "../services/payment/escrowService.js";
import "colors";

// Find and auto-release escrows after 48 hours
const processAutoRelease = async () => {
  try {
    const now = new Date();

    // Find all held escrows that should be auto-released
    const escrowsToRelease = await Escrow.find({
      status: "held",
      autoReleaseAt: { $lte: now },
    });

    console.log(
      `Found ${escrowsToRelease.length} escrows to auto-release`.yellow
    );

    const results = {
      success: [],
      failed: [],
    };

    for (const escrow of escrowsToRelease) {
      try {
        await releaseEscrow(escrow._id, "auto", null);

        // Update booking payment status
        await Booking.findByIdAndUpdate(escrow.booking, {
          paymentStatus: "released",
        });

        results.success.push(escrow._id);
        console.log(`✅ Auto-released escrow: ${escrow._id}`.green);
      } catch (error) {
        results.failed.push({
          escrowId: escrow._id,
          error: error.message,
        });
        console.error(`❌ Failed to auto-release: ${escrow._id}`.red);
      }
    }

    return results;
  } catch (error) {
    console.error("❌ Process auto-release error:", error);
    throw new Error(`Failed to process auto-release: ${error.message}`);
  }
};

// Run every hour to check for escrows to release
export const startAutoReleaseJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("⏰ Running auto-release job...".yellow);
      const results = await processAutoRelease();

      if (results.success.length > 0) {
        console.log(`✅ Auto-released ${results.success.length} escrows`.green);
      }

      if (results.failed.length > 0) {
        console.log(
          `❌ Failed to release ${results.failed.length} escrows`.red
        );
      }
    } catch (error) {
      console.error("❌ Auto-release job error:", error);
    }
  });

  console.log("📅 Auto-release job scheduled (runs every hour)".cyan);
};
