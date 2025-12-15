import cron from "node-cron";
import { processExpiredBookings } from "../services/booking/autoDeclineService.js";
import "colors";

// Run every minute to check for expired bookings
export const startAutoDeclineJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      console.log("⏰ Running auto-decline job...".yellow);
      const results = await processExpiredBookings();

      if (results.success.length > 0) {
        console.log(
          `✅ Auto-declined ${results.success.length} bookings`.green
        );
      }

      if (results.failed.length > 0) {
        console.log(
          `❌ Failed to decline ${results.failed.length} bookings`.red
        );
      }
    } catch (error) {
      console.error("❌ Auto-decline job error:", error);
    }
  });

  console.log("📅 Auto-decline job scheduled (runs every minute)".cyan);
};
