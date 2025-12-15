import app from "./app.js";
import connectDB from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { testConnection as testCloudinary } from "./config/cloudinary.js";
import { testPaystackConnection } from "./config/paystack.js";
import { startAutoDeclineJob } from "./jobs/autoDeclineJob.js";
import { startAutoReleaseJob } from "./jobs/autoReleaseJob.js";
import { startPayoutProcessingJob } from "./jobs/payoutProcessingJob.js";
import { startReminderJob } from "./jobs/reminderJob.js";
import { startCleanupNotificationsJob } from "./jobs/cleanupNotificationsJob.js";

import "colors";

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();
await import("./models/Customer.js");
await import("./models/Artisan.js");

// Connect to Redis
connectRedis();

// Test Cloudinary connection
testCloudinary();

// Test Paystack connection
testPaystackConnection();

// Start all cron jobs
startAutoDeclineJob(); // Runs every minute
startAutoReleaseJob(); // Runs every hour
startPayoutProcessingJob(); // Runs daily at 2 AM
startReminderJob(); // Runs at scheduled times
startCleanupNotificationsJob();

// Start server
const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.green
      .bold
  );
  console.log(`📡 API: http://localhost:${PORT}`.blue);
  console.log(`💻 Health Check: http://localhost:${PORT}/health`.blue);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`❌ Error: ${err.message}`.red.bold);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Process terminated");
  });
});
