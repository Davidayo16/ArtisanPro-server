// backend/controllers/booking/artisanBookingController.js
import Booking from "../../models/Booking.js";
import mongoose from "mongoose";

/**
 * @desc    Get all bookings for the logged-in artisan (ENTERPRISE OPTIMIZED)
 * @route   GET /api/v1/bookings/artisan/my-bookings
 * @access  Private/Artisan
 *
 * Performance Features:
 * - Single aggregation pipeline (no multiple queries)
 * - Uses denormalized fields (no populate needed)
 * - Efficient filtering at database level
 * - Strategic indexing support
 * - Query performance monitoring
 * - Scales to millions of records
 */
export const getArtisanBookings = async (req, res) => {
  const startTime = Date.now();

  try {
    const artisanId = new mongoose.Types.ObjectId(req.user.id);
    const { status, page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ===== BUILD MATCH STAGE =====
    const matchStage = {
      artisan: artisanId,
    };

    // Status filtering (now done on backend)
    if (status === "pending") {
      matchStage.status = "pending";
      matchStage.expiresAt = { $gte: new Date() };
    } else if (status === "active") {
      matchStage.status = {
        $in: ["accepted", "confirmed", "in_progress", "negotiating"],
      };
    } else if (status === "history") {
      matchStage.status = {
        $in: ["completed", "cancelled", "declined", "disputed"],
      };
    }

    // Search across denormalized fields (FAST - no joins needed)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { bookingNumber: searchRegex },
        { customerName: searchRegex },
        { serviceName: searchRegex },
      ];
    }

    // ===== AGGREGATION PIPELINE (Single Query) =====
    const pipeline = [
      // Stage 1: Filter bookings
      { $match: matchStage },

      // Stage 2: Sort by creation date (newest first)
      { $sort: { createdAt: -1 } },

      // Stage 3: Add computed fields
      {
        $addFields: {
          // Calculate time left for pending bookings
          timeLeftSeconds: {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $gte: ["$expiresAt", new Date()] },
                ],
              },
              then: {
                $divide: [{ $subtract: ["$expiresAt", new Date()] }, 1000],
              },
              else: 0,
            },
          },
        },
      },

      // Stage 4: Facet for pagination + count (single query)
      {
        $facet: {
          metadata: [{ $count: "total" }],
          bookings: [
            { $skip: skip },
            { $limit: limitNum },
            // Project only needed fields (reduce bandwidth)
            {
              $project: {
                bookingNumber: 1,
                customerName: 1,
                customerEmail: 1,
                customerPhone: 1,
                customerPhoto: 1,
                serviceName: 1,
                serviceSlug: 1,
                description: 1,
                photos: 1,
                location: 1,
                scheduledDate: 1,
                scheduledTime: 1,
                urgency: 1,
                estimatedPrice: 1,
                agreedPrice: 1,
                finalPrice: 1,
                status: 1,
                paymentStatus: 1,
                expiresAt: 1,
                timeLeftSeconds: 1,
                distance: 1,
                eta: 1,
                negotiation: 1,
                createdAt: 1,
                updatedAt: 1,
                // Include IDs for potential populate if needed
                customer: 1,
                service: 1,
                artisan: 1,
              },
            },
          ],
        },
      },
    ];

    // Execute aggregation
    const result = await Booking.aggregate(pipeline);

    // Extract results
    const total = result[0]?.metadata[0]?.total || 0;
    const bookings = result[0]?.bookings || [];

    // Calculate query time
    const queryTime = Date.now() - startTime;

    // Log slow queries (production monitoring)
    if (queryTime > 1000) {
      console.warn(`⚠️ Slow query detected: ${queryTime}ms`, {
        artisanId: req.user.id,
        status,
        search,
        total,
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      _performance: {
        queryTime: `${queryTime}ms`,
        recordsReturned: bookings.length,
      },
    });
  } catch (error) {
    console.error("❌ getArtisanBookings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single booking details (optimized)
 * @route   GET /api/v1/bookings/artisan/:id
 * @access  Private/Artisan
 */
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const artisanId = req.user.id;

    // Use aggregation for consistency
    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          artisan: new mongoose.Types.ObjectId(artisanId),
        },
      },
      {
        $addFields: {
          timeLeftSeconds: {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $gte: ["$expiresAt", new Date()] },
                ],
              },
              then: {
                $divide: [{ $subtract: ["$expiresAt", new Date()] }, 1000],
              },
              else: 0,
            },
          },
        },
      },
    ];

    const result = await Booking.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking: result[0],
    });
  } catch (error) {
    console.error("❌ getBookingById error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Get booking stats (dashboard metrics)
 * @route   GET /api/v1/bookings/artisan/stats
 * @access  Private/Artisan
 */
export const getBookingStats = async (req, res) => {
  try {
    const artisanId = new mongoose.Types.ObjectId(req.user.id);

    // Single aggregation for all stats
    const pipeline = [
      { $match: { artisan: artisanId } },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          totalEarnings: [
            {
              $match: { status: "completed" },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$finalPrice" },
              },
            },
          ],
          recentBookings: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                bookingNumber: 1,
                customerName: 1,
                serviceName: 1,
                status: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ];

    const result = await Booking.aggregate(pipeline);

    res.status(200).json({
      success: true,
      stats: result[0],
    });
  } catch (error) {
    console.error("❌ getBookingStats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message,
    });
  }
};
