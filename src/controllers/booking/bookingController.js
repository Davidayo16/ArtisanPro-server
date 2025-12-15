// ============================================
// 📁 backend/controllers/bookingController.js
// OPTIMIZED: Single aggregation pipeline (like artisan controller)
// ============================================

import Booking from "../../models/Booking.js";
import mongoose from "mongoose";
import {
  createBooking,
  getBookingById,
  isBookingExpired,
} from "../../services/booking/bookingService.js";
import { sendNotification } from "../../services/notification/notificationService.js";

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private/Customer
export const createBookingHandler = async (req, res) => {
  try {
    const {
      artisanId,
      serviceId,
      description,
      photos,
      location,
      scheduledDate,
      scheduledTime,
      urgency,
    } = req.body;

    // Fast validation
    if (
      !artisanId ||
      !serviceId ||
      !description ||
      !location ||
      !scheduledDate ||
      !scheduledTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (description.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 20 characters",
      });
    }

    // Create booking
    const booking = await createBooking({
      customerId: req.user.id,
      artisanId,
      serviceId,
      description,
      photos: photos || [],
      location,
      scheduledDate,
      scheduledTime,
      urgency: urgency || "normal",
    });

    // 🚀 Use lean() for faster population
    const populatedBooking = await Booking.findById(booking._id)
      .populate(
        "artisan",
        "firstName lastName businessName profilePhoto averageRating"
      )
      .populate("service", "name slug")
      .populate("customer", "firstName lastName profilePhoto")
      .lean();

    // 🚀 RESPOND IMMEDIATELY
    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });

    // 🚀 Send notification AFTER response (non-blocking)
    setImmediate(async () => {
      try {
        await sendNotification(artisanId, "booking_created", {
          booking: populatedBooking,
          customer: req.user,
        });
        console.log(`📧 Notification sent to artisan: ${artisanId}`.cyan);
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
    });
  }
};

// 🔥 OPTIMIZED: Get booking by ID (single aggregation)
// @desc    Get booking by ID
// @route   GET /api/v1/bookings/:id
// @access  Private
export const getBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Single aggregation with lookups
    const result = await Booking.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(bookingId),
        },
      },
      // Lookup artisan details
      {
        $lookup: {
          from: "users",
          localField: "artisan",
          foreignField: "_id",
          as: "artisanDetails",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                businessName: 1,
                profilePhoto: 1,
                averageRating: 1,
                email: 1,
                phone: 1,
              },
            },
          ],
        },
      },
      // Lookup customer details
      {
        $lookup: {
          from: "users",
          localField: "customer",
          foreignField: "_id",
          as: "customerDetails",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                profilePhoto: 1,
                email: 1,
                phone: 1,
              },
            },
          ],
        },
      },
      // Lookup service details
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "serviceDetails",
          pipeline: [
            {
              $project: {
                name: 1,
                slug: 1,
                category: 1,
              },
            },
          ],
        },
      },
      // Unwind and replace
      {
        $addFields: {
          artisan: { $arrayElemAt: ["$artisanDetails", 0] },
          customer: { $arrayElemAt: ["$customerDetails", 0] },
          service: { $arrayElemAt: ["$serviceDetails", 0] },
        },
      },
      // Remove temporary fields
      {
        $project: {
          artisanDetails: 0,
          customerDetails: 0,
          serviceDetails: 0,
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const booking = result[0];

    // Authorization check
    if (
      booking.customer._id.toString() !== req.user.id &&
      booking.artisan._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this booking",
      });
    }

    // Check if expired (only for pending bookings)
    if (
      booking.status === "pending" &&
      booking.expiresAt &&
      new Date(booking.expiresAt) < new Date()
    ) {
      // Update status to declined
      await Booking.findByIdAndUpdate(bookingId, {
        status: "declined",
        declineReason: "Expired - No response",
      });

      booking.status = "declined";
      booking.declineReason = "Expired - No response";
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get booking",
      error: error.message,
    });
  }
};

// 🔥 FULLY OPTIMIZED: Get customer's bookings (SINGLE AGGREGATION)
// @desc    Get customer's bookings
// @route   GET /api/v1/bookings/customer/my-bookings
// @access  Private/Customer
export const getCustomerBookings = async (req, res) => {
  const startTime = Date.now();

  try {
    const customerId = new mongoose.Types.ObjectId(req.user.id);
    const { status, page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ===== BUILD MATCH STAGE =====
    const matchStage = {
      customer: customerId,
    };

    // Status filtering
    if (status && status !== "all") {
      matchStage.status = status;
    }

    // Search across denormalized fields (FAST - no joins needed)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { bookingNumber: searchRegex },
        { customerName: searchRegex }, // Already on booking doc
        { serviceName: searchRegex }, // Already on booking doc
      ];
    }

    console.time("📊 Single Aggregation Query");

    // ===== SINGLE AGGREGATION PIPELINE =====
    const pipeline = [
      // Stage 1: Filter bookings
      { $match: matchStage },

      // Stage 2: Sort by creation date (newest first)
      { $sort: { createdAt: -1 } },

      // Stage 3: Lookup artisan details (OPTIONAL - only if you need more than denormalized fields)
      {
        $lookup: {
          from: "users",
          localField: "artisan",
          foreignField: "_id",
          as: "artisanDetails",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                businessName: 1,
                profilePhoto: 1,
                averageRating: 1,
              },
            },
          ],
        },
      },

      // Stage 4: Lookup service details (OPTIONAL)
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "serviceDetails",
          pipeline: [
            {
              $project: {
                name: 1,
                slug: 1,
              },
            },
          ],
        },
      },

      // Stage 5: Unwind lookup results
      {
        $addFields: {
          artisan: { $arrayElemAt: ["$artisanDetails", 0] },
          service: { $arrayElemAt: ["$serviceDetails", 0] },
        },
      },

      // Stage 6: Facet for pagination + count (single query)
      {
        $facet: {
          metadata: [{ $count: "total" }],
          bookings: [
            { $skip: skip },
            { $limit: limitNum },
            // Project only needed fields
            {
              $project: {
                bookingNumber: 1,
                customerName: 1,
                serviceName: 1,
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
                createdAt: 1,
                updatedAt: 1,
                artisan: 1,
                service: 1,
                negotiation: 1,
              },
            },
          ],
        },
      },
    ];

    // Execute aggregation
    const result = await Booking.aggregate(pipeline);

    console.timeEnd("📊 Single Aggregation Query");

    // Extract results
    const total = result[0]?.metadata[0]?.total || 0;
    const bookings = result[0]?.bookings || [];

    // Calculate query time
    const queryTime = Date.now() - startTime;

    // Log slow queries
    if (queryTime > 1000) {
      console.warn(`⚠️ Slow query detected: ${queryTime}ms`, {
        customerId: req.user.id,
        status,
        search,
        total,
      });
    }

    console.log(
      `✅ Query completed in ${queryTime}ms, returned ${bookings.length} bookings`
    );

    res.set("Cache-Control", "private, max-age=60");

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: bookings,
      _performance: {
        queryTime: `${queryTime}ms`,
      },
    });
  } catch (error) {
    console.error("❌ Error in getCustomerBookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get bookings",
      error: error.message,
    });
  }
};

// 🔥 OPTIMIZED: Get artisan's bookings (unchanged - already optimal)
// @desc    Get artisan's bookings
// @route   GET /api/v1/bookings/artisan/my-bookings
// @access  Private/Artisan
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

    // Status filtering
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

    // Search across denormalized fields
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { bookingNumber: searchRegex },
        { customerName: searchRegex },
        { serviceName: searchRegex },
      ];
    }

    // ===== AGGREGATION PIPELINE =====
    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
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
      {
        $facet: {
          metadata: [{ $count: "total" }],
          bookings: [
            { $skip: skip },
            { $limit: limitNum },
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
                customer: 1,
                service: 1,
                artisan: 1,
              },
            },
          ],
        },
      },
    ];

    const result = await Booking.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const bookings = result[0]?.bookings || [];
    const queryTime = Date.now() - startTime;

    if (queryTime > 1000) {
      console.warn(`⚠️ Slow query detected: ${queryTime}ms`, {
        artisanId: req.user.id,
        status,
        search,
        total,
      });
    }

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

// @desc    Cancel booking
// @route   PUT /api/v1/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.customer.toString() !== req.user.id &&
      booking.artisan.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this booking",
      });
    }

    if (["completed", "cancelled", "disputed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`,
      });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "No reason provided";
    booking.cancelledBy = req.user.role;
    await booking.save();

    // ✅ CLEAR STATS CACHE FOR BOTH USERS
    clearUserStatsCache(booking.customer.toString());
    clearUserStatsCache(booking.artisan.toString());

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};

// 🔥 SIMPLIFIED: Get customer stats (no cache, just fast query)
// @desc    Get customer booking stats
// @route   GET /api/v1/bookings/customer/stats
// @access  Private/Customer
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
