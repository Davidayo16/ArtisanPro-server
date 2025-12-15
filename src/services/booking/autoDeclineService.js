import Booking from "../../models/Booking.js";
import { autoDeclineBooking } from "./bookingService.js";

// Find and auto-decline expired bookings
export const processExpiredBookings = async () => {
  try {
    const now = new Date();

    // Find all pending bookings that have expired
    const expiredBookings = await Booking.find({
      status: "pending",
      expiresAt: { $lte: now },
    });

    console.log(`Found ${expiredBookings.length} expired bookings`.yellow);

    const results = {
      success: [],
      failed: [],
    };

    for (const booking of expiredBookings) {
      try {
        await autoDeclineBooking(booking._id);
        results.success.push(booking.bookingNumber);
        console.log(`✅ Auto-declined: ${booking.bookingNumber}`.green);
      } catch (error) {
        results.failed.push({
          bookingNumber: booking.bookingNumber,
          error: error.message,
        });
        console.error(
          `❌ Failed to auto-decline: ${booking.bookingNumber}`.red
        );
      }
    }

    return results;
  } catch (error) {
    console.error("❌ Process expired bookings error:", error);
    throw new Error(`Failed to process expired bookings: ${error.message}`);
  }
};
