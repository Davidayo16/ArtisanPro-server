import cron from "node-cron";
import { processBatchPayouts } from "../services/payment/payoutService.js";
import "colors";

// Run daily at 2 AM to process payouts
export const startPayoutProcessingJob = () => {
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("⏰ Running payout processing job...".yellow);
      const results = await processBatchPayouts();

      if (results.success.length > 0) {
        console.log(`✅ Processed ${results.success.length} payouts`.green);
      }

      if (results.failed.length > 0) {
        console.log(
          `❌ Failed to process ${results.failed.length} payouts`.red
        );
      }
    } catch (error) {
      console.error("❌ Payout processing job error:", error);
    }
  });

  console.log("📅 Payout processing job scheduled (runs daily at 2 AM)".cyan);
};
