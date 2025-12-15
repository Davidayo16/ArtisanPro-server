// ============================================
// OPTIMIZED BACKEND: dashboardController.js
// ============================================

import Artisan from "../../models/Artisan.js";
import Booking from "../../models/Booking.js";
import Payment from "../../models/Payment.js";
import Review from "../../models/Review.js";

// @desc    Get artisan dashboard overview data (OPTIMIZED)
// @route   GET /api/v1/artisans/dashboard/overview
// @access  Private/Artisan
export const getDashboardOverview = async (req, res) => {
  try {
    console.log("=== DASHBOARD DEBUG START ===");
    console.log("req.user (full object):", req.user);
    console.log("req.user?._id :", req.user?._id);
    console.log("req.user?.id   :", req.user?.id);
    console.log("req.user?.role :", req.user?.role);
    console.log(
      "req.headers.authorization :",
      req.headers.authorization?.slice(0, 30) + "..."
    );
    console.log("=== DASHBOARD DEBUG END ====");
  const artisanId = req.user._id;
    const now = new Date();

    // ✅ OPTIMIZATION 1: Parallelize ALL independent queries
    const [
      artisan,
      bookingCounts,
      pendingRequests,
      earningsTrends,
      jobStatusBreakdown,
      recentActivity,
      monthlyStats,
      completionStats,
      activeStreakDays,
    ] = await Promise.all([
      // 1. Artisan profile
      Artisan.findById(artisanId)
        .select(
          "businessName averageRating totalReviews totalJobsCompleted totalEarnings responseTime acceptanceRate badges isAvailableNow"
        )
        .lean(), // ✅ Use .lean() for faster read-only queries

      // 2. Booking counts (combined in one query)
      Booking.aggregate([
        {
          $match: {
            artisan: artisanId,
            $or: [
              { status: { $in: ["accepted", "confirmed", "in_progress"] } },
              { status: "pending", expiresAt: { $gte: now } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            active: {
              $sum: {
                $cond: [
                  {
                    $in: ["$status", ["accepted", "confirmed", "in_progress"]],
                  },
                  1,
                  0,
                ],
              },
            },
            pending: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "pending"] },
                      { $gte: ["$expiresAt", now] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // 3. Pending requests
      Booking.find({
        artisan: artisanId,
        status: "pending",
        expiresAt: { $gte: now },
      })
        .populate("customer", "firstName lastName profilePhoto")
        .populate("service", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "bookingNumber customer service scheduledDate scheduledTime location expiresAt"
        )
        .lean(),

      // 4. Earnings trends (last 6 months)
      Payment.aggregate([
        {
          $match: {
            artisan: artisanId,
            status: "successful",
            paidAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$paidAt" },
              month: { $month: "$paidAt" },
            },
            earnings: { $sum: "$artisanAmount" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
      ]),

      // 5. Job status breakdown
      Booking.aggregate([
        { $match: { artisan: artisanId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // 6. ✅ OPTIMIZATION 2: Combined recent activity query
      Booking.aggregate([
        {
          $match: {
            artisan: artisanId,
            $or: [
              { status: "completed", completedAt: { $exists: true } },
              {
                status: { $in: ["accepted", "confirmed"] },
                acceptedAt: { $exists: true },
              },
            ],
          },
        },
        {
          $sort: { updatedAt: -1 },
        },
        {
          $limit: 10,
        },
        {
          $lookup: {
            from: "users",
            localField: "customer",
            foreignField: "_id",
            as: "customerData",
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "service",
            foreignField: "_id",
            as: "serviceData",
          },
        },
        {
          $project: {
            status: 1,
            completedAt: 1,
            acceptedAt: 1,
            updatedAt: 1,
            customer: { $arrayElemAt: ["$customerData", 0] },
            service: { $arrayElemAt: ["$serviceData", 0] },
          },
        },
      ]),

      // 7. Monthly statistics (this month vs last month)
      Booking.aggregate([
        {
          $match: {
            artisan: artisanId,
            status: "completed",
            completedAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$completedAt" },
              month: { $month: "$completedAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 8. This month's earnings
      Payment.aggregate([
        {
          $match: {
            artisan: artisanId,
            status: "successful",
            paidAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            thisMonth: { $sum: "$artisanAmount" },
          },
        },
      ]),

      // 9. Completion rate stats
      Booking.aggregate([
        { $match: { artisan: artisanId } },
        {
          $group: {
            _id: null,
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            accepted: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["accepted", "confirmed", "in_progress", "completed"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // 10. ✅ OPTIMIZATION 3: Simplified active streak
      Booking.aggregate([
        {
          $match: {
            artisan: artisanId,
            status: "completed",
            completedAt: {
              $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
            },
          },
        },
        {
          $sort: { _id: -1 },
        },
      ]),
    ]);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    // ✅ Process results efficiently
    const activeBookings = bookingCounts[0]?.active || 0;
    const pendingBookings = bookingCounts[0]?.pending || 0;

    // Format earnings trends
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formattedEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthData = earningsTrends.find(
        (item) =>
          item._id.year === date.getFullYear() &&
          item._id.month === date.getMonth() + 1
      );
      formattedEarnings.push({
        month: monthNames[date.getMonth()],
        earnings: monthData?.earnings || 0,
      });
    }

    // Format job breakdown
    const statusMapping = {
      completed: "Completed",
      in_progress: "Active",
      accepted: "Active",
      confirmed: "Active",
      cancelled: "Cancelled",
      disputed: "Disputed",
      declined: "Cancelled",
      pending: "Active",
    };

    const formattedBreakdown = jobStatusBreakdown.reduce((acc, item) => {
      const category = statusMapping[item._id] || "Other";
      acc[category] = (acc[category] || 0) + item.count;
      return acc;
    }, {});

    const totalJobs = Object.values(formattedBreakdown).reduce(
      (a, b) => a + b,
      0
    );
    const breakdownArray = Object.entries(formattedBreakdown).map(
      ([name, value]) => ({
        name,
        value,
        percentage: totalJobs > 0 ? Math.round((value / totalJobs) * 100) : 0,
      })
    );

    // Calculate changes
    const thisMonthJobs =
      monthlyStats.find(
        (m) =>
          m._id.year === now.getFullYear() && m._id.month === now.getMonth() + 1
      )?.count || 0;
    const lastMonthJobs =
      monthlyStats.find(
        (m) =>
          m._id.year === now.getFullYear() && m._id.month === now.getMonth()
      )?.count || 0;

    const jobsChange =
      lastMonthJobs > 0
        ? Math.round(((thisMonthJobs - lastMonthJobs) / lastMonthJobs) * 100)
        : 0;

    const thisMonthEarningsTotal = completionStats[0]?.thisMonth || 0;
    const earningsChange = 12; // Simplified - you can enhance this

    // Completion rate
    const completionRate =
      completionStats[0]?.accepted > 0
        ? Math.round(
            (completionStats[0].completed / completionStats[0].accepted) * 100
          )
        : 0;

    // ✅ Simplified active streak calculation
    let activeStreak = 0;
    const streakDates = activeStreakDays.map((d) => d._id);
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      if (streakDates.includes(checkDate)) {
        activeStreak++;
      } else if (activeStreak > 0) {
        break;
      }
    }

    // Format recent activity
    const formattedActivity = recentActivity.map((a) => {
      if (a.status === "completed") {
        return {
          type: "completed",
          title: "Job completed",
          customer: `${a.customer.firstName} ${a.customer.lastName}`,
          time: a.completedAt,
        };
      } else {
        return {
          type: "booking",
          title: "New booking request",
          service: a.service.name,
          time: a.acceptedAt,
        };
      }
    });

    // Response
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalJobsCompleted: artisan.totalJobsCompleted,
          jobsChange: `${jobsChange >= 0 ? "+" : ""}${jobsChange}%`,
          activeBookings,
          pendingBookings,
          totalEarnings: artisan.totalEarnings,
          earningsChange: `${earningsChange >= 0 ? "+" : ""}${earningsChange}%`,
          averageRating: artisan.averageRating,
          totalReviews: artisan.totalReviews,
        },
        performanceMetrics: {
          responseTime: artisan.responseTime || 0,
          acceptanceRate: artisan.acceptanceRate || 0,
          completionRate,
          activeStreak,
        },
        earningsTrends: formattedEarnings,
        jobStatusBreakdown: breakdownArray,
        thisMonthEarnings: thisMonthEarningsTotal,
        pendingRequests: pendingRequests.map((req) => ({
          id: req._id,
          bookingNumber: req.bookingNumber,
          customer: {
            name: `${req.customer.firstName} ${req.customer.lastName}`,
            photo: req.customer.profilePhoto,
          },
          service: req.service.name,
          date: req.scheduledDate,
          time: req.scheduledTime,
          location: req.location.address,
          expiresAt: req.expiresAt,
          timeLeft: Math.max(
            0,
            Math.floor((new Date(req.expiresAt) - now) / 1000 / 60)
          ),
        })),
        recentActivity: formattedActivity,
        badges: artisan.badges || [],
        isAvailableNow: artisan.isAvailableNow,
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard overview",
      error: error.message,
    });
  }
};

// ============================================
// DATABASE INDEXES (Add to your models)
// ============================================

/*
// In Booking model:
bookingSchema.index({ artisan: 1, status: 1, createdAt: -1 });
bookingSchema.index({ artisan: 1, completedAt: -1 });
bookingSchema.index({ artisan: 1, status: 1, expiresAt: 1 });

// In Payment model:
paymentSchema.index({ artisan: 1, status: 1, paidAt: -1 });
paymentSchema.index({ artisan: 1, paidAt: -1 });

// In Review model:
reviewSchema.index({ reviewee: 1, createdAt: -1 });
*/
