import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema(
  {
    // ===== BASIC INFO (Unchanged) =====
    name: {
      type: String,
      required: [true, "Please provide service name"],
      trim: true,
      maxlength: [100, "Service name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: [true, "Please provide service category"],
    },
    description: {
      type: String,
      required: [true, "Please provide service description"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },

    // ===== NEW PRICING SYSTEM =====
    pricingModel: {
      type: String,
      enum: [
        "simple_fixed",
        "unit_based",
        "tiered",
        "area_based",
        "component_based",
        "inspection_required",
        "fully_custom",
      ],
      required: [true, "Please select a pricing model"],
    },

    // Dynamic pricing configuration based on pricingModel
    pricingConfig: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (config) {
          // Validate structure based on pricingModel
          switch (this.pricingModel) {
            case "simple_fixed":
              return config.basePrice && typeof config.basePrice === "number";

            case "unit_based":
              return (
                config.basePrice &&
                config.pricePerAdditionalUnit &&
                config.unitName
              );

            case "tiered":
              return (
                Array.isArray(config.tiers) &&
                config.tiers.length > 0 &&
                config.tiers.every((t) => t.name && t.price)
              );

            case "area_based":
              return config.pricePerUnit && config.unitName;

            case "component_based":
              return (
                Array.isArray(config.components) && config.components.length > 0
              );

            case "inspection_required":
              return config.inspectionFee !== undefined;

            case "fully_custom":
              return true; // No specific structure required

            default:
              return false;
          }
        },
        message: "Invalid pricing configuration for the selected pricing model",
      },
    },

    // Universal features that apply to all pricing models
    universalFeatures: {
      materialsIncluded: {
        type: Boolean,
        default: false,
      },
      minimumCharge: {
        type: Number,
        default: 0,
        min: 0,
      },
      depositRequired: {
        enabled: {
          type: Boolean,
          default: false,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
      },
    },

    // Price modifiers (enhanced)
    modifiers: {
      urgent: {
        enabled: {
          type: Boolean,
          default: true,
        },
        multiplier: {
          type: Number,
          default: 1.5,
          min: 1,
        },
        description: {
          type: String,
          default: "Same-day service",
        },
      },
      emergency: {
        enabled: {
          type: Boolean,
          default: true,
        },
        multiplier: {
          type: Number,
          default: 2.0,
          min: 1,
        },
        description: {
          type: String,
          default: "Within 2 hours",
        },
      },
      afterHours: {
        enabled: {
          type: Boolean,
          default: true,
        },
        multiplier: {
          type: Number,
          default: 1.3,
          min: 1,
        },
        description: {
          type: String,
          default: "6PM - 8AM",
        },
      },
      weekend: {
        enabled: {
          type: Boolean,
          default: true,
        },
        multiplier: {
          type: Number,
          default: 1.2,
          min: 1,
        },
        description: {
          type: String,
          default: "Saturday/Sunday",
        },
      },
    },

    // ===== SERVICE REQUIREMENTS (Unchanged) =====
    requiresInspection: {
      type: Boolean,
      default: false,
    },
    requiresPhotos: {
      type: Boolean,
      default: true,
    },
    minPhotos: {
      type: Number,
      default: 1,
      min: 0,
      max: 10,
    },

    // ===== METADATA (Unchanged) =====
    commonTasks: [
      {
        type: String,
        trim: true,
      },
    ],
    typicalMaterials: [
      {
        name: String,
        estimatedCost: Number,
      },
    ],
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    icon: {
      type: String,
      default: "default-service-icon.png",
    },
    images: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },

    // ===== STATISTICS (Unchanged) =====
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalArtisans: {
      type: Number,
      default: 0,
    },
    averagePrice: {
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===== INDEXES =====
ServiceSchema.index({ category: 1, isActive: 1 });
ServiceSchema.index({ slug: 1 });
ServiceSchema.index({ tags: 1 });
ServiceSchema.index({ isPopular: -1, totalBookings: -1 });
ServiceSchema.index({ name: "text", description: "text", tags: "text" });
ServiceSchema.index({ pricingModel: 1 });

// ===== PRE-SAVE HOOK: Generate Slug =====
ServiceSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// ===== METHOD: Calculate Price =====
ServiceSchema.methods.calculatePrice = function (
  selections = {},
  artisanServiceOverride = null
) {
  // Use artisan's custom config if available, otherwise use service's default
  const config =
    artisanServiceOverride?.customPricingConfig || this.pricingConfig;
  const modifiers = artisanServiceOverride?.customModifiers || this.modifiers;
  const universalFeatures =
    artisanServiceOverride?.customUniversalFeatures || this.universalFeatures;

  let basePrice = 0;

  // Calculate base price based on pricing model
  switch (this.pricingModel) {
    case "simple_fixed":
      basePrice = config.basePrice;
      break;

    case "unit_based":
      const units = selections.units || 1;
      basePrice = config.basePrice;

      if (units > 1) {
        const additionalUnits = units - 1;

        // Check for bulk discount
        if (
          config.bulkDiscount?.enabled &&
          units >= config.bulkDiscount.threshold
        ) {
          basePrice += config.bulkDiscount.discountedPrice * additionalUnits;
        } else {
          basePrice += config.pricePerAdditionalUnit * additionalUnits;
        }
      }
      break;

    case "tiered":
      const selectedTier = config.tiers.find(
        (t) => t.id === selections.tierId || t.name === selections.tierName
      );
      basePrice = selectedTier ? selectedTier.price : 0;
      break;

    case "area_based":
      const area = selections.area || 0;
      basePrice = config.pricePerUnit * area;

      // Apply minimum charge if specified
      if (config.minimumCharge) {
        basePrice = Math.max(basePrice, config.minimumCharge);
      }
      break;

    case "component_based":
      if (selections.components && Array.isArray(selections.components)) {
        selections.components.forEach((selectedComp) => {
          const component = config.components.find(
            (c) => c.id === selectedComp.id || c.name === selectedComp.name
          );

          if (component) {
            if (component.pricing.type === "fixed") {
              basePrice += component.pricing.price;
            } else if (component.pricing.type === "per_unit") {
              const quantity = selectedComp.quantity || 1;
              basePrice += component.pricing.pricePerUnit * quantity;
            }
          }
        });
      }
      break;

    case "inspection_required":
      return {
        type: "inspection_required",
        inspectionFee: config.inspectionFee,
        inspectionFeeRefundable: config.inspectionFeeRefundable,
        estimatedRange: config.estimatedRange,
        message: config.message || "Final price determined after inspection",
      };

    case "fully_custom":
      return {
        type: "fully_custom",
        message: config.message || "Price negotiable based on requirements",
        suggestedRange: config.suggestedRange,
      };

    default:
      return {
        type: "error",
        message: "Invalid pricing model",
      };
  }

  // Apply modifiers
  let multiplier = 1;

  if (selections.urgency === "urgent" && modifiers.urgent?.enabled) {
    multiplier *= modifiers.urgent.multiplier;
  }
  if (selections.urgency === "emergency" && modifiers.emergency?.enabled) {
    multiplier *= modifiers.emergency.multiplier;
  }
  if (selections.timeOfDay === "after_hours" && modifiers.afterHours?.enabled) {
    multiplier *= modifiers.afterHours.multiplier;
  }
  if (selections.dayType === "weekend" && modifiers.weekend?.enabled) {
    multiplier *= modifiers.weekend.multiplier;
  }

  const finalPrice = Math.round(basePrice * multiplier);

  // Apply minimum charge from universal features
  const minimumCharge = universalFeatures?.minimumCharge || 0;
  const adjustedFinalPrice = Math.max(finalPrice, minimumCharge);

  // Calculate deposit if required
  let deposit = null;
  if (universalFeatures?.depositRequired?.enabled) {
    deposit = Math.round(
      (adjustedFinalPrice * universalFeatures.depositRequired.percentage) / 100
    );
  }

  return {
    type: this.pricingModel,
    basePrice,
    multiplier,
    finalPrice: adjustedFinalPrice,
    deposit,
    materialsIncluded: universalFeatures?.materialsIncluded,
    modifiersApplied: selections,
  };
};

// ===== METHOD: Update Statistics =====
ServiceSchema.methods.updateStats = async function () {
  const ArtisanService = mongoose.model("ArtisanService");
  const Booking = mongoose.model("Booking");

  // Total bookings
  this.totalBookings = await Booking.countDocuments({
    service: this._id,
  });

  // Total artisans offering this service (from ArtisanService model)
  this.totalArtisans = await ArtisanService.countDocuments({
    service: this._id,
    enabled: true,
  });

  await this.save();
};

const Service = mongoose.model("Service", ServiceSchema);

export default Service;
