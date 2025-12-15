import Booking from "../../models/Booking.js";
import Artisan from "../../models/Artisan.js";
import Service from "../../models/Service.js";

// ==================== HELPER FUNCTIONS ====================

/**
 * Get date range based on days parameter
 */
const getDateRange = (days) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
};

/**
 * Generate array of dates for the range
 */
const generateDateArray = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Format date for grouping (YYYY-MM-DD)
 */
const formatDateKey = (date) => {
  return date.toISOString().split("T")[0];
};

/**
 * Format date for display (e.g., "Mon", "Jan 15")
 */
const formatDateDisplay = (date, format = "short") => {
  if (format === "day") {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// ==================== MAIN CONTROLLER ====================

/**
 * @desc    Get artisan analytics
 * @route   GET /api/v1/artisan/analytics
 * @access  Private/Artisan
 */
export const getArtisanAnalytics = async (req, res) => {
  try {
    const artisanId = req.user.id;
    const days = parseInt(req.query.days) || 30; // Default 30 days

    // Validate days parameter
    if (![7, 30, 90].includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Invalid days parameter. Must be 7, 30, or 90",
      });
    }

    const { startDate, endDate } = getDateRange(days);

    // ==================== FETCH ARTISAN DATA ====================
    const artisan = await Artisan.findById(artisanId).select(
      "averageRating totalReviews totalJobsCompleted totalEarnings detailedRatings"
    );

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    // ==================== FETCH BOOKINGS IN DATE RANGE ====================
    const bookings = await Booking.find({
      artisan: artisanId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("service", "name")
      .select("status finalPrice totalAmount createdAt completedAt service")
      .lean();

    // ==================== CALCULATE SUMMARY STATS ====================
    const totalJobs = bookings.length;
   const completedJobs = bookings.filter(
     (b) => b.status === "completed" || b.status === "payment_released"
   ).length;
    const pendingJobs = bookings.filter((b) =>
      ["pending", "accepted", "confirmed", "in_progress"].includes(b.status)
    ).length;
    const cancelledJobs = bookings.filter((b) =>
      ["cancelled", "declined"].includes(b.status)
    ).length;

const totalEarnings = bookings
  .filter((b) => b.status === "completed" || b.status === "payment_released")
  .reduce((sum, b) => sum + (b.finalPrice || b.totalAmount || 0), 0);

    const completionRate =
      totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    // ==================== GENERATE DAILY TREND DATA ====================
    const dateArray = generateDateArray(startDate, endDate);
    const bookingsByDate = {};

    // Initialize all dates with zero values
    dateArray.forEach((date) => {
      const key = formatDateKey(date);
      bookingsByDate[key] = {
        date: formatDateDisplay(date),
        day: formatDateDisplay(date, "day"),
        jobs: 0,
        earnings: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
      };
    });

    // Fill in actual booking data
    bookings.forEach((booking) => {
      const key = formatDateKey(new Date(booking.createdAt));

      if (bookingsByDate[key]) {
        bookingsByDate[key].jobs += 1;

       if (
         booking.status === "completed" ||
         booking.status === "payment_released"
       ) {
         bookingsByDate[key].earnings +=
           booking.finalPrice || booking.totalAmount || 0;
         bookingsByDate[key].completed += 1;
       } else if (
         ["pending", "accepted", "confirmed", "in_progress"].includes(
           booking.status
         )
       ) {
         bookingsByDate[key].pending += 1;
       } else if (["cancelled", "declined"].includes(booking.status)) {
         bookingsByDate[key].cancelled += 1;
       }
      }
    });

    const trend = Object.values(bookingsByDate);

    // ==================== JOB STATUS BREAKDOWN ====================
    const jobStatus = [
      {
        name: "Completed",
        value: completedJobs,
        color: "#16a34a",
      },
      {
        name: "Pending",
        value: pendingJobs,
        color: "#f59e0b",
      },
      {
        name: "Cancelled",
        value: cancelledJobs,
        color: "#dc2626",
      },
    ];

    // ==================== SERVICE BREAKDOWN ====================
    const serviceStats = {};

    bookings.forEach((booking) => {
      if (booking.service && booking.service.name) {
        const serviceName = booking.service.name;

        if (!serviceStats[serviceName]) {
          serviceStats[serviceName] = {
            count: 0,
            revenue: 0,
          };
        }

        serviceStats[serviceName].count += 1;

      if (
        booking.status === "completed" ||
        booking.status === "payment_released"
      ) {
        serviceStats[serviceName].revenue +=
          booking.finalPrice || booking.totalAmount || 0;
      }
      }
    });

    // Convert to array and calculate percentages
    const totalServiceJobs = Object.values(serviceStats).reduce(
      (sum, s) => sum + s.count,
      0
    );

    const serviceBreakdown = Object.entries(serviceStats)
      .map(([name, stats]) => ({
        name,
        value:
          totalServiceJobs > 0
            ? Math.round((stats.count / totalServiceJobs) * 100)
            : 0,
        count: stats.count,
        revenue: Math.round(stats.revenue),
        color: getServiceColor(name),
      }))
      .sort((a, b) => b.count - a.count);

    // ==================== RESPONSE ====================
    res.status(200).json({
      success: true,
      data: {
        trend,
        summary: {
          totalEarnings: Math.round(totalEarnings),
          totalJobs,
          completedJobs,
          avgRating: artisan.averageRating || 0,
          completionRate,
          totalReviews: artisan.totalReviews || 0,
        },
        jobStatus,
        serviceBreakdown,
        detailedRatings: artisan.detailedRatings || {
          quality: 0,
          professionalism: 0,
          timeliness: 0,
          communication: 0,
          value: 0,
        },
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching artisan analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};

/**
 * @desc    Export analytics data to CSV
 * @route   GET /api/v1/artisan/analytics/export
 * @access  Private/Artisan
 */
export const exportAnalytics = async (req, res) => {
  try {
    const artisanId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    if (![7, 30, 90].includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Invalid days parameter. Must be 7, 30, or 90",
      });
    }

    const { startDate, endDate } = getDateRange(days);

    const bookings = await Booking.find({
      artisan: artisanId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("service", "name")
      .populate("customer", "firstName lastName")
      .select(
        "bookingNumber status finalPrice totalAmount createdAt completedAt service customer scheduledDate"
      )
      .lean()
      .sort({ createdAt: -1 });

    // Generate CSV
    const csvRows = [
      [
        "Booking Number",
        "Date",
        "Customer",
        "Service",
        "Status",
        "Amount (₦)",
        "Scheduled Date",
        "Completed Date",
      ],
    ];

    bookings.forEach((booking) => {
      csvRows.push([
        booking.bookingNumber || "N/A",
        new Date(booking.createdAt).toLocaleDateString(),
        booking.customer
          ? `${booking.customer.firstName} ${booking.customer.lastName}`
          : "N/A",
        booking.service?.name || "N/A",
        booking.status,
        booking.finalPrice || booking.totalAmount || 0,
        booking.scheduledDate
          ? new Date(booking.scheduledDate).toLocaleDateString()
          : "N/A",
        booking.completedAt
          ? new Date(booking.completedAt).toLocaleDateString()
          : "N/A",
      ]);
    });

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=analytics-${days}d-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );

    res.status(200).send(csvContent);
  } catch (error) {
    console.error("❌ Error exporting analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export analytics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get top performing services for artisan
 * @route   GET /api/v1/artisan/analytics/top-services
 * @access  Private/Artisan
 */
export const getTopServices = async (req, res) => {
  try {
    const artisanId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const topServices = await Booking.aggregate([
      {
        $match: {
          artisan: artisanId,
          status: { $in: ["completed", "payment_released"] },
        },
      },
      {
        $group: {
          _id: "$service",
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$finalPrice" },
          avgPrice: { $avg: "$finalPrice" },
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "serviceDetails",
        },
      },
      {
        $unwind: "$serviceDetails",
      },
      {
        $project: {
          serviceName: "$serviceDetails.name",
          totalBookings: 1,
          totalRevenue: { $round: ["$totalRevenue", 0] },
          avgPrice: { $round: ["$avgPrice", 0] },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    res.status(200).json({
      success: true,
      count: topServices.length,
      data: topServices,
    });
  } catch (error) {
    console.error("❌ Error fetching top services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top services",
      error: error.message,
    });
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Assign colors to services (you can customize this)
 */
const getServiceColor = (serviceName) => {
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // yellow
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#14b8a6", // teal
  ];

  // Simple hash function to consistently assign colors
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = serviceName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
