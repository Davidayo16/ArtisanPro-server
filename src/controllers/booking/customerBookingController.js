import Booking from "../../models/Booking.js";
import mongoose from "mongoose";

/**
 * @desc    Get customer booking stats
 * @route   GET /api/v1/bookings/customer/stats
 * @access  Private/Customer
 * 
 * 
 */


// backend/controllers/bookingController.js

export const getCustomerStats = async (req, res) => {
  try {
    const customerId = req.user.id;

    console.time("⏱️ Stats Query");

    // 🚀 Simple aggregation - no cache needed (140ms is fast enough)
    const result = await Booking.aggregate([
      {
        $match: {
          customer: new mongoose.Types.ObjectId(customerId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          spent: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$finalPrice", 0],
            },
          },
        },
      },
    ]);

    console.timeEnd("⏱️ Stats Query");

    const stats = {
      statusCounts: result.map((r) => ({
        _id: r._id,
        count: r.count,
      })),
      totalSpent: result
        .filter((r) => r._id === "completed")
        .reduce((sum, r) => sum + (r.spent || 0), 0),
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ getCustomerStats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message,
    });
  }
};