import mongoose from "mongoose";

const ArtisanServiceSchema = new mongoose.Schema(
  {
    // ===== RELATIONSHIPS =====
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artisan",
      required: [true, "Artisan is required"],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service is required"],
    },

    // ===== ENABLE/DISABLE =====
    enabled: {
      type: Boolean,
      default: true,
    },

    // ===== CUSTOM PRICING CONFIGURATION =====
    // If null, uses the service's default pricingConfig
    customPricingConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ===== CUSTOM UNIVERSAL FEATURES =====
    customUniversalFeatures: {
      materialsIncluded: {
        type: Boolean,
        default: null, // null = use service's default
      },
      minimumCharge: {
        type: Number,
        default: null,
        min: 0,
      },
      depositRequired: {
        enabled: {
          type: Boolean,
          default: null,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
          default: null,
        },
      },
    },

    // ===== CUSTOM MODIFIERS =====
    customModifiers: {
      urgent: {
        enabled: {
          type: Boolean,
          default: null,
        },
        multiplier: {
          type: Number,
          min: 1,
          default: null,
        },
      },
      emergency: {
        enabled: {
          type: Boolean,
          default: null,
        },
        multiplier: {
          type: Number,
          min: 1,
          default: null,
        },
      },
      afterHours: {
        enabled: {
          type: Boolean,
          default: null,
        },
        multiplier: {
          type: Number,
          min: 1,
          default: null,
        },
      },
      weekend: {
        enabled: {
          type: Boolean,
          default: null,
        },
        multiplier: {
          type: Number,
          min: 1,
          default: null,
        },
      },
    },

    // ===== PERSONALIZED DESCRIPTIONS =====
    customDescription: {
      type: String,
      maxlength: [500, "Custom description cannot exceed 500 characters"],
      trim: true,
    },

    specialNotes: {
      type: String,
      maxlength: [200, "Special notes cannot exceed 200 characters"],
      trim: true,
    },

    // ===== STATISTICS =====
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ===== INDEXES =====
// Prevent duplicate: One artisan can't add the same service twice
ArtisanServiceSchema.index({ artisan: 1, service: 1 }, { unique: true });

// Performance: Query by artisan
ArtisanServiceSchema.index({ artisan: 1, enabled: 1 });

// Performance: Query by service
ArtisanServiceSchema.index({ service: 1, enabled: 1 });

// Performance: Find popular services by artisan
ArtisanServiceSchema.index({ artisan: 1, totalBookings: -1 });

// ===== METHODS =====

// Get effective pricing config (custom or default)
ArtisanServiceSchema.methods.getEffectivePricingConfig = async function () {
  if (this.customPricingConfig) {
    return this.customPricingConfig;
  }

  const service = await mongoose.model("Service").findById(this.service);
  return service.pricingConfig;
};

// Get effective modifiers (custom or default)
ArtisanServiceSchema.methods.getEffectiveModifiers = async function () {
  const service = await mongoose.model("Service").findById(this.service);

  // Merge custom modifiers with service defaults
  const effectiveModifiers = {};

  for (const modifierKey of ["urgent", "emergency", "afterHours", "weekend"]) {
    effectiveModifiers[modifierKey] = {
      enabled:
        this.customModifiers?.[modifierKey]?.enabled !== null
          ? this.customModifiers[modifierKey].enabled
          : service.modifiers[modifierKey].enabled,
      multiplier:
        this.customModifiers?.[modifierKey]?.multiplier !== null
          ? this.customModifiers[modifierKey].multiplier
          : service.modifiers[modifierKey].multiplier,
      description: service.modifiers[modifierKey].description,
    };
  }

  return effectiveModifiers;
};

// Get effective universal features (custom or default)
ArtisanServiceSchema.methods.getEffectiveUniversalFeatures = async function () {
  const service = await mongoose.model("Service").findById(this.service);

  return {
    materialsIncluded:
      this.customUniversalFeatures?.materialsIncluded !== null
        ? this.customUniversalFeatures.materialsIncluded
        : service.universalFeatures.materialsIncluded,
    minimumCharge:
      this.customUniversalFeatures?.minimumCharge !== null
        ? this.customUniversalFeatures.minimumCharge
        : service.universalFeatures.minimumCharge,
    depositRequired: {
      enabled:
        this.customUniversalFeatures?.depositRequired?.enabled !== null
          ? this.customUniversalFeatures.depositRequired.enabled
          : service.universalFeatures.depositRequired.enabled,
      percentage:
        this.customUniversalFeatures?.depositRequired?.percentage !== null
          ? this.customUniversalFeatures.depositRequired.percentage
          : service.universalFeatures.depositRequired.percentage,
    },
  };
};

// Update statistics
ArtisanServiceSchema.methods.updateStats = async function () {
  const Booking = mongoose.model("Booking");

  this.totalBookings = await Booking.countDocuments({
    artisan: this.artisan,
    service: this.service,
    status: "completed",
  });

  // Calculate total revenue from completed bookings
  const bookings = await Booking.find({
    artisan: this.artisan,
    service: this.service,
    status: "completed",
  }).select("finalPrice");

  this.totalRevenue = bookings.reduce(
    (sum, booking) => sum + (booking.finalPrice || 0),
    0
  );

  await this.save();
};

const ArtisanService = mongoose.model("ArtisanService", ArtisanServiceSchema);

export default ArtisanService;
