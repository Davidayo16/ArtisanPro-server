import Review from "../../models/Review.js";
import Artisan from "../../models/Artisan.js";

// @desc    Get reviews for a specific artisan
// @route   GET /api/v1/artisans/:artisanId/reviews
// @access  Public
export const getArtisanReviews = async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { page = 1, limit = 10, rating, sortBy = "createdAt" } = req.query;

    // Check if artisan exists
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    // Build filter
    const filter = {
      reviewee: artisanId,
      reviewerRole: "customer", // Only customer reviews for artisans
      isApproved: true,
    };

    // Optional rating filter
    if (rating) {
      filter.rating = Number(rating);
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Sorting options
    let sort = {};
    switch (sortBy) {
      case "rating-high":
        sort = { rating: -1, createdAt: -1 };
        break;
      case "rating-low":
        sort = { rating: 1, createdAt: -1 };
        break;
      case "helpful":
        sort = { helpfulCount: -1, createdAt: -1 };
        break;
      case "recent":
      default:
        sort = { createdAt: -1 };
    }

    // Fetch reviews
    const reviews = await Review.find(filter)
      .populate("reviewer", "firstName lastName profilePhoto")
      .populate("booking", "service")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select("-__v");

    // Total count for pagination
    const total = await Review.countDocuments(filter);

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          reviewee: artisan._id,
          reviewerRole: "customer",
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    // Format rating distribution
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    ratingDistribution.forEach((item) => {
      distribution[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: reviews,
      ratingDistribution: distribution,
      summary: {
        averageRating: artisan.averageRating,
        totalReviews: artisan.totalReviews,
        detailedRatings: artisan.detailedRatings,
      },
    });
  } catch (error) {
    console.error("Error fetching artisan reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// @desc    Get review statistics for an artisan
// @route   GET /api/v1/artisans/:artisanId/reviews/stats
// @access  Public
export const getReviewStats = async (req, res) => {
  try {
    const { artisanId } = req.params;

    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          reviewee: artisan._id,
          reviewerRole: "customer",
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate percentages
    const total = artisan.totalReviews;
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratingDistribution.forEach((item) => {
      distribution[item._id] = total > 0 ? (item.count / total) * 100 : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        averageRating: artisan.averageRating,
        totalReviews: artisan.totalReviews,
        ratingDistribution: distribution,
        detailedRatings: artisan.detailedRatings,
      },
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch review statistics",
      error: error.message,
    });
  }
};
