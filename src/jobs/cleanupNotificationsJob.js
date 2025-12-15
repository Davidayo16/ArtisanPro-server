import cron from "node-cron";
import Notification from "../models/Notification.js";
import "colors";

// Delete read notifications older than 30 days
const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      isRead: true,
      createdAt: { $lt: thirtyDaysAgo },
    });

    console.log(`🗑️  Deleted ${result.deletedCount} old notifications`.green);

    return result.deletedCount;
  } catch (error) {
    console.error("❌ Cleanup notifications error:", error);
    throw new Error(`Failed to cleanup notifications: ${error.message}`);
  }
};

// Run daily at 3 AM
export const startCleanupNotificationsJob = () => {
  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("⏰ Running notification cleanup job...".yellow);
      await cleanupOldNotifications();
    } catch (error) {
      console.error("❌ Notification cleanup job error:", error);
    }
  });

  console.log(
    "📅 Notification cleanup job scheduled (runs daily at 3 AM)".cyan
  );
};
