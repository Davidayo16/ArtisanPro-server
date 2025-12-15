import Review from "../../models/Review.js";
import Booking from "../../models/Booking.js";
import { sendNotification } from "../../services/notification/notificationService.js";
import mongoose from "mongoose";
// ========== SIMPLE IN-MEMORY CACHE FOR REVIEWS ==========
const reviewsCache = new Map();
const REVIEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getReviewsCacheKey(userId, type) {
  return `reviews_${userId}_${type}`;
}

function getReviewsFromCache(key) {
  const cached = reviewsCache.get(key);
  if (cached && Date.now() - cached.timestamp < REVIEWS_CACHE_TTL) {
    return cached.data;
  }
  reviewsCache.delete(key);
  return null;
}

function setReviewsCache(key, data) {
  reviewsCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  
  // Keep cache size manageable
  if (reviewsCache.size > 500) {
    const firstKey = reviewsCache.keys().next().value;
    reviewsCache.delete(firstKey);
  }
}

function clearUserReviewsCache(userId) {
  const keys = Array.from(reviewsCache.keys());
  keys.forEach((key) => {
    if (key.includes(userId)) {
      reviewsCache.delete(key);
    }
  });
}

// @desc    Create review (customer reviews artisan OR artisan reviews customer)
// @route   POST /api/v1/reviews/:bookingId
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { rating, detailedRatings, comment, photos, isRecommended } =
      req.body;
    const { bookingId } = req.params;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rating (1-5)",
      });
    }

    // Get booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if booking is completed
  if (!["completed", "payment_released"].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: "Can only review completed bookings",
    });
  }

    // Check authorization and determine reviewer/reviewee
    let reviewer, reviewee, reviewerRole;

    if (booking.customer.toString() === req.user.id) {
      reviewer = booking.customer;
      reviewee = booking.artisan;
      reviewerRole = "customer";
    } else if (booking.artisan.toString() === req.user.id) {
      reviewer = booking.artisan;
      reviewee = booking.customer;
      reviewerRole = "artisan";
    } else {
      return res.status(403).json({
        success: false,
        message: "Not authorized to review this booking",
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewer: reviewer,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this booking",
      });
    }

    // Create review
    const review = await Review.create({
      booking: bookingId,
      reviewer,
      reviewee,
      reviewerRole,
      rating,
      detailedRatings:
        reviewerRole === "customer" ? detailedRatings : undefined,
      comment,
      photos: photos || [],
      isRecommended: isRecommended !== undefined ? isRecommended : true,
    });

    // Update booking with review reference
    if (reviewerRole === "customer") {
      booking.customerReview = review._id;
    } else {
      booking.artisanReview = review._id;
    }
    await booking.save();

    // Populate review
    await review.populate("reviewer", "firstName lastName profilePhoto");
    await review.populate(
      "reviewee",
      "firstName lastName businessName profilePhoto"
    );

    // Send notification to reviewee
    await sendNotification(reviewee.toString(), "review_received", {
      review: await review.populate("reviewer", "firstName lastName"),
      customer: reviewerRole === "customer" ? req.user : undefined,
    });
    // ✅ CLEAR CACHE for both reviewer and reviewee
    clearUserReviewsCache(reviewer.toString());
    clearUserReviewsCache(reviewee.toString());
    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create review",
      error: error.message,
    });
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const { rating, detailedRatings, comment, photos, isRecommended } =
      req.body;

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check authorization
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (detailedRatings) review.detailedRatings = detailedRatings;
    if (comment !== undefined) review.comment = comment;
    if (photos) review.photos = photos;
    if (isRecommended !== undefined) review.isRecommended = isRecommended;
    

    await review.save();

    clearUserReviewsCache(req.user.id);
    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check authorization
    if (
      review.reviewer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    await review.deleteOne();

    clearUserReviewsCache(req.user.id);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

// @desc    Respond to review (reviewee responds)
// @route   POST /api/v1/reviews/:id/respond
// @access  Private
export const respondToReview = async (req, res) => {
  try {
    const { responseText } = req.body;

    if (!responseText || responseText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a response",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check authorization (only reviewee can respond)
    if (review.reviewee.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the reviewee can respond to this review",
      });
    }

    // Check if already responded
    if (review.response && review.response.text) {
      return res.status(400).json({
        success: false,
        message: "You have already responded to this review",
      });
    }

    review.response = {
      text: responseText,
      respondedAt: new Date(),
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: "Response added successfully",
      data: review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to review",
      error: error.message,
    });
  }
};

// @desc    Mark review as helpful/not helpful
// @route   POST /api/v1/reviews/:id/helpful
// @access  Private
export const markReviewHelpful = async (req, res) => {
  try {
    const { isHelpful } = req.body; // true or false

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if user already marked this review
    const alreadyMarked = review.helpfulBy.includes(req.user.id);

    if (alreadyMarked) {
      return res.status(400).json({
        success: false,
        message: "You have already marked this review",
      });
    }

    // Add user to helpfulBy array
    review.helpfulBy.push(req.user.id);

    // Increment count
    if (isHelpful) {
      review.helpfulCount += 1;
    } else {
      review.notHelpfulCount += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review marked successfully",
      data: {
        helpfulCount: review.helpfulCount,
        notHelpfulCount: review.notHelpfulCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to mark review",
      error: error.message,
    });
  }
};

// @desc    Get artisan reviews
// @route   GET /api/v1/reviews/artisan/:artisanId
// @access  Public
export const getArtisanReviews = async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { rating, page = 1, limit = 10, sortBy = "recent" } = req.query;

    // Build filter
    const filter = {
      reviewee: artisanId,
      reviewerRole: "customer",
      isApproved: true,
    };

    if (rating) {
      filter.rating = parseInt(rating);
    }

    // Build sort
    let sort = { createdAt: -1 }; // Default: most recent
    if (sortBy === "highest") {
      sort = { rating: -1, createdAt: -1 };
    } else if (sortBy === "lowest") {
      sort = { rating: 1, createdAt: -1 };
    } else if (sortBy === "helpful") {
      sort = { helpfulCount: -1, createdAt: -1 };
    }

    const reviews = await Review.find(filter)
      .populate("reviewer", "firstName lastName profilePhoto")
      .populate("booking", "bookingNumber service")
      .populate({
        path: "booking",
        populate: { path: "service", select: "name" },
      })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(filter);

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      ratingDistribution,
      data: reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get reviews",
      error: error.message,
    });
  }
};

// @desc    Get customer reviews (reviews given by customer)
// @route   GET /api/v1/reviews/customer/my-reviews
// @access  Private/Customer
// @desc    Get customer reviews (reviews given by customer)
// @route   GET /api/v1/reviews/customer/my-reviews
// @access  Private/Customer
export const getCustomerReviews = async (req, res) => {
  try {
    // ✅ CHECK CACHE FIRST
    const cacheKey = getReviewsCacheKey(req.user.id, "customer");
    const cachedData = getReviewsFromCache(cacheKey);

    if (cachedData) {
      console.log("✅ Returning cached customer reviews");
      return res.status(200).json({
        success: true,
        ...cachedData,
        fromCache: true,
      });
    }

    // 🔥 OPTIMIZED: Use aggregation for better performance
    const reviews = await Review.find({
      reviewer: req.user.id,
      reviewerRole: "customer",
    })
      .populate("reviewee", "firstName lastName businessName profilePhoto")
      .populate("booking", "bookingNumber service")
      .populate({
        path: "booking",
        populate: { path: "service", select: "name" },
      })
      .sort({ createdAt: -1 })
      .lean(); // ✅ Add .lean() for 30-50% faster queries

    // Calculate stats
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
    const fiveStarReviews = reviews.filter((r) => r.rating === 5).length;
    const totalHelpful = reviews.reduce(
      (sum, r) => sum + (r.helpfulCount || 0),
      0
    );

    // Reviews this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const reviewsThisMonth = reviews.filter(
      (r) => new Date(r.createdAt) >= startOfMonth
    ).length;

    // Calculate last month's count for comparison
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const reviewsLastMonth = reviews.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }).length;

    // Helpful this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const helpfulThisWeek = reviews
      .filter((r) => new Date(r.createdAt) >= startOfWeek)
      .reduce((sum, r) => sum + (r.helpfulCount || 0), 0);

    // Rating distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
      percentage:
        totalReviews > 0
          ? (
              (reviews.filter((r) => r.rating === star).length / totalReviews) *
              100
            ).toFixed(1)
          : 0,
    }));

    const responseData = {
      count: reviews.length,
      data: reviews,
      stats: {
        totalReviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        fiveStarReviews,
        fiveStarPercentage:
          totalReviews > 0
            ? parseFloat(((fiveStarReviews / totalReviews) * 100).toFixed(1))
            : 0,
        totalHelpful,
        reviewsThisMonth,
        reviewsLastMonth,
        helpfulThisWeek,
      },
      ratingDistribution,
    };

    // ✅ CACHE THE RESULT
    setReviewsCache(cacheKey, responseData);

    // ✅ ADD CACHE HEADERS
    res.set("Cache-Control", "private, max-age=300"); // 5 minutes

    res.status(200).json({
      success: true,
      ...responseData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get reviews",
      error: error.message,
    });
  }
};
// @desc    Get reviews received by artisan
// @route   GET /api/v1/reviews/artisan/received
// @access  Private/Artisan
export const getArtisanReceivedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({
      reviewee: req.user.id,
      reviewerRole: "customer",
    })
      .populate("reviewer", "firstName lastName profilePhoto")
      .populate("booking", "bookingNumber service")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments({
      reviewee: req.user.id,
      reviewerRole: "customer",
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get reviews",
      error: error.message,
    });
  }
};

// @desc    Flag review
// @route   POST /api/v1/reviews/:id/flag
// @access  Private
export const flagReview = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for flagging",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.isFlagged) {
      return res.status(400).json({
        success: false,
        message: "Review already flagged",
      });
    }

    review.isFlagged = true;
    review.flagReason = reason;
    review.flaggedBy = req.user.id;
    review.flaggedAt = new Date();

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review flagged successfully. Admin will review it.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to flag review",
      error: error.message,
    });
  }
};
// @desc    Get artisan review stats
// @route   GET /api/v1/reviews/artisan/:artisanId/stats
// @access  Public
export const getArtisanReviewStats = async (req, res) => {
  try {
    const { artisanId } = req.params;

    const stats = await Review.aggregate([
      {
        $match: {
          reviewee: new mongoose.Types.ObjectId(artisanId),
          reviewerRole: "customer",
          isApproved: true,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          fourStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          threeStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          twoStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          oneStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      averageRating: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get review stats",
      error: error.message,
    });
  }
};