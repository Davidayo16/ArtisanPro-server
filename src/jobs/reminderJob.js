import cron from "node-cron";
import Booking from "../models/Booking.js";
import { sendBookingReminderEmail } from "../services/notification/emailService.js";
import "colors";

const sendBookingReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const upcomingBookings = await Booking.find({
      status: "confirmed",
      scheduledDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow,
      },
    })
      .populate("customer", "firstName lastName email phone")
      .populate("artisan", "firstName lastName businessName email phone")
      .populate("service", "name");

    console.log(
      `Found ${upcomingBookings.length} bookings for tomorrow`.yellow
    );

    for (const booking of upcomingBookings) {
      try {
        // Send reminder to customer
        await sendBookingReminderEmail(booking.customer, booking, "customer");

        // Send reminder to artisan
        await sendBookingReminderEmail(booking.artisan, booking, "artisan");

        console.log(
          `📧 Reminders sent for booking: ${booking.bookingNumber}`.green
        );
      } catch (error) {
        console.error(
          `❌ Failed to send reminder for: ${booking.bookingNumber}`.red
        );
      }
    }

    return upcomingBookings.length;
  } catch (error) {
    console.error("❌ Send reminders error:", error);
    throw new Error(`Failed to send reminders: ${error.message}`);
  }
};

const sendPaymentReminders = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const unpaidBookings = await Booking.find({
      status: "accepted",
      paymentStatus: "unpaid",
      acceptedAt: { $lte: oneHourAgo },
    }).populate("customer", "firstName lastName email phone");

    console.log(`Found ${unpaidBookings.length} unpaid bookings`.yellow);

    for (const booking of unpaidBookings) {
      try {
        // TODO: Send payment reminder email
        console.log(
          `💰 Payment reminder sent for: ${booking.bookingNumber}`.cyan
        );
      } catch (error) {
        console.error(
          `❌ Failed to send payment reminder: ${booking.bookingNumber}`.red
        );
      }
    }

    return unpaidBookings.length;
  } catch (error) {
    console.error("❌ Send payment reminders error:", error);
    throw new Error(`Failed to send payment reminders: ${error.message}`);
  }
};

export const startReminderJob = () => {
  cron.schedule("0 9 * * *", async () => {
    try {
      console.log("⏰ Running booking reminder job...".yellow);
      await sendBookingReminders();
    } catch (error) {
      console.error("❌ Booking reminder job error:", error);
    }
  });

  cron.schedule("0 */2 * * *", async () => {
    try {
      console.log("⏰ Running payment reminder job...".yellow);
      await sendPaymentReminders();
    } catch (error) {
      console.error("❌ Payment reminder job error:", error);
    }
  });

  console.log("📅 Reminder jobs scheduled".cyan);
  console.log("   - Booking reminders: Daily at 9 AM".gray);
  console.log("   - Payment reminders: Every 2 hours".gray);
};
