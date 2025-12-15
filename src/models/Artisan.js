// backend/models/Artisan.js
import mongoose from "mongoose";
import User from "./User.js";

const ArtisanSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      trim: true,
    },
    profileComplete: {
      type: Boolean,
      default: false,
      index: true,
    },
    profileCompletedAt: {
      type: Date,
    },
    hasCompletedInitialSetup: {
      type: Boolean,
      default: false,
      index: true,
    },
    totalBookingRequests: {
      type: Number,
      default: 0,
    },
    totalAcceptedBookings: {
      type: Number,
      default: 0,
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot be more than 500 characters"],
    },
    paystackRecipientCode: {
      type: String,
      sparse: true,
    },
    detailedRatings: {
      quality: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      professionalism: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      timeliness: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      communication: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    serviceCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceCategory",
      },
    ],
    workingHours: {
      monday: { start: String, end: String, isAvailable: Boolean },
      tuesday: { start: String, end: String, isAvailable: Boolean },
      wednesday: { start: String, end: String, isAvailable: Boolean },
      thursday: { start: String, end: String, isAvailable: Boolean },
      friday: { start: String, end: String, isAvailable: Boolean },
      saturday: { start: String, end: String, isAvailable: Boolean },
      sunday: { start: String, end: String, isAvailable: Boolean },
    },
    serviceRadius: {
      type: Number,
      default: 10,
    },
    location: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: "Nigeria" },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      bankCode: String,
    },
    verification: {
      status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      idType: {
        type: String,
        enum: [
          "nin",
          "drivers_license",
          "voters_card",
          "international_passport",
        ],
      },
      idNumber: String,
      idDocument: String,
      verifiedAt: Date,
      rejectionReason: String,
    },
    certifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Certification",
      },
    ],
    portfolio: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portfolio",
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalJobsCompleted: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    responseTime: {
      type: Number,
      default: 0,
    },
    acceptanceRate: {
      type: Number,
      default: 0,
    },
    badges: [
      {
        type: String,
        enum: ["top_rated", "verified", "quick_response", "new_artisan"],
      },
    ],
    isAvailableNow: {
      type: Boolean,
      default: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumExpiresAt: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ VIRTUAL: Get artisan's services
ArtisanSchema.virtual("services", {
  ref: "ArtisanService",
  localField: "_id",
  foreignField: "artisan",
  match: { enabled: true },
});

// ✅ EXISTING INDEX: Location-based queries
ArtisanSchema.index({ "location.coordinates": "2dsphere" });

// ✅ EXISTING INDEX: Service category + rating queries
ArtisanSchema.index({ serviceCategories: 1, averageRating: -1 });

// ✅ NEW PERFORMANCE INDEX: Saved artisans sorting by rating + jobs
ArtisanSchema.index({ averageRating: -1, totalJobsCompleted: -1 });

// ✅ NEW PERFORMANCE INDEX: Saved artisans sorting by response time
ArtisanSchema.index({ responseTime: 1, averageRating: -1 });

// ✅ NEW PERFORMANCE INDEX: Service category filtering with rating
ArtisanSchema.index({
  serviceCategories: 1,
  averageRating: -1,
  totalReviews: -1,
});

const Artisan = User.discriminator("artisan", ArtisanSchema);

export default Artisan;
