// syncEscrow.js
// Run this script with: node syncEscrow.js

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import models (adjust paths based on your project structure)
import Booking from "../models/Booking.js";
import Escrow from "../models/Escrow.js";

const syncBookingWithEscrow = async (bookingId) => {
  try {
    console.log("🔄 Starting sync...");
    console.log("📝 Booking ID:", bookingId);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error("❌ Booking not found");
      process.exit(1);
    }

    console.log("\n📊 Current Booking State:");
    console.log("- Status:", booking.status);
    console.log("- Payment Status:", booking.paymentStatus);
    console.log("- Payment Released At:", booking.paymentReleasedAt || "N/A");

    // Find escrow
    const escrow = await Escrow.findOne({ booking: booking._id });
    if (!escrow) {
      console.error("❌ Escrow not found");
      process.exit(1);
    }

    console.log("\n💰 Escrow State:");
    console.log("- Status:", escrow.status);
    console.log("- Amount:", escrow.amount);
    console.log("- Released At:", escrow.releasedAt || "N/A");

    // Check if sync needed
    let updated = false;
    const changes = [];

    if (escrow.status === "released") {
      console.log("\n🔍 Escrow is released, checking booking...");

      if (booking.paymentStatus !== "released") {
        booking.paymentStatus = "released";
        changes.push("✓ paymentStatus: paid → released");
        updated = true;
      }

      if (booking.status === "completed") {
        booking.status = "payment_released";
        changes.push("✓ status: completed → payment_released");
        updated = true;
      }

      if (!booking.paymentReleasedAt && escrow.releasedAt) {
        booking.paymentReleasedAt = escrow.releasedAt;
        changes.push(`✓ paymentReleasedAt: ${escrow.releasedAt}`);
        updated = true;
      }
    } else if (escrow.status === "refunded") {
      console.log("\n🔍 Escrow is refunded, checking booking...");

      if (booking.paymentStatus !== "refunded") {
        booking.paymentStatus = "refunded";
        changes.push("✓ paymentStatus → refunded");
        updated = true;
      }

      if (booking.status !== "cancelled") {
        booking.status = "cancelled";
        booking.cancelledBy = "system";
        booking.cancelledAt = new Date();
        changes.push("✓ status → cancelled");
        updated = true;
      }
    }

    if (updated) {
      await booking.save();
      console.log("\n✅ Booking Updated Successfully!");
      console.log("\n📝 Changes Made:");
      changes.forEach((change) => console.log("  ", change));

      console.log("\n📊 New Booking State:");
      console.log("- Status:", booking.status);
      console.log("- Payment Status:", booking.paymentStatus);
      console.log("- Payment Released At:", booking.paymentReleasedAt);
    } else {
      console.log("\n✅ Booking already in sync with escrow");
      console.log("No changes needed.");
    }

    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ Done! Connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

// Get booking ID from command line argument
const bookingId = process.argv[2] || "693dcce22a6510ee25d14b5a";

console.log("╔════════════════════════════════════════╗");
console.log("║   Escrow & Booking Sync Script         ║");
console.log("╚════════════════════════════════════════╝\n");

syncBookingWithEscrow(bookingId);
