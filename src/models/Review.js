import mongoose from "mongoose";
import Artisan from "./Artisan.js";
import Customer from "./Customer.js";
const ReviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewerRole: {
      type: String,
      enum: ["customer", "artisan"],
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Please provide a rating"],
      min: 1,
      max: 5,
    },
    // Detailed ratings (for artisan reviews)
    detailedRatings: {
      quality: {
        type: Number,
        min: 1,
        max: 5,
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: String,
      maxlength: [500, "Review cannot exceed 500 characters"],
    },
    photos: [
      {
        url: String,
        publicId: String,
      },
    ],
    isRecommended: {
      type: Boolean,
      default: true,
    },
    // Response from reviewee
    response: {
      text: {
        type: String,
        maxlength: [300, "Response cannot exceed 300 characters"],
      },
      respondedAt: Date,
    },
    // Moderation
    isApproved: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    flaggedAt: Date,
    // Helpfulness
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
ReviewSchema.index({ booking: 1 });
ReviewSchema.index({ reviewer: 1 });
ReviewSchema.index({ reviewee: 1, isApproved: 1 });
ReviewSchema.index({ rating: -1, createdAt: -1 });
// Existing indices are good, just add this one:
ReviewSchema.index({ reviewer: 1, isApproved: 1, createdAt: -1 });
// Prevent duplicate reviews for same booking by same user
ReviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

// Update reviewee's average rating after save
ReviewSchema.post("save", async function () {
  await this.constructor.updateAverageRating(this.reviewee, this.reviewerRole);
});

// Update reviewee's average rating after remove
ReviewSchema.post("remove", async function () {
  await this.constructor.updateAverageRating(this.reviewee, this.reviewerRole);
});

// Static method to calculate average rating
ReviewSchema.statics.updateAverageRating = async function (
  userId,
  reviewerRole
) {
  try {
    const result = await this.aggregate([
      {
        $match: {
          reviewee: userId,
          reviewerRole: reviewerRole,
          isApproved: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          // Average detailed ratings
          avgQuality: { $avg: "$detailedRatings.quality" },
          avgProfessionalism: { $avg: "$detailedRatings.professionalism" },
          avgTimeliness: { $avg: "$detailedRatings.timeliness" },
          avgCommunication: { $avg: "$detailedRatings.communication" },
          avgValue: { $avg: "$detailedRatings.value" },
        },
      },
    ]);

    if (result.length > 0) {
const Model = reviewerRole === "customer" ? Artisan : Customer;

      await Model.findByIdAndUpdate(userId, {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews,
      });

      // Update detailed ratings for artisans
      if (reviewerRole === "customer") {
        await Model.findByIdAndUpdate(userId, {
          "detailedRatings.quality": Math.round(result[0].avgQuality * 10) / 10,
          "detailedRatings.professionalism":
            Math.round(result[0].avgProfessionalism * 10) / 10,
          "detailedRatings.timeliness":
            Math.round(result[0].avgTimeliness * 10) / 10,
          "detailedRatings.communication":
            Math.round(result[0].avgCommunication * 10) / 10,
          "detailedRatings.value": Math.round(result[0].avgValue * 10) / 10,
        });
      }
    } else {
      const Model = mongoose.model(
        reviewerRole === "customer" ? "Artisan" : "Customer"
      );
      await Model.findByIdAndUpdate(userId, {
        averageRating: 0,
        totalReviews: 0,
      });
    }
  } catch (error) {
    console.error("Error updating average rating:", error);
  }
};
ReviewSchema.index({ reviewee: 1, createdAt: -1, isApproved: 1 });
ReviewSchema.index({ reviewer: 1, reviewerRole: 1, createdAt: -1 });

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
