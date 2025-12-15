import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    // ===== DENORMALIZED FIELDS (For Performance) =====
    customerName: {
      type: String,
      index: true,
    },
    customerPhone: String,
    customerEmail: String,
    customerPhoto: String,
    serviceName: {
      type: String,
      index: true,
    },
    serviceSlug: String,

    // ===== Link to ArtisanService for pricing =====
    artisanService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtisanService",
      required: true,
    },

    // ===== Booking details =====
    description: {
      type: String,
      required: [true, "Please provide job description"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    photos: [
      {
        url: String,
        publicId: String,
      },
    ],
    location: {
      address: {
        type: String,
        required: true,
      },
      city: String,
      state: String,
      coordinates: {
        type: { type: String, default: "Point" },
        coordinates: [Number],
      },
    },

    // ===== Scheduling =====
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    urgency: {
      type: String,
      enum: ["normal", "urgent", "emergency"],
      default: "normal",
    },

    // ===== Customer Selections =====
    customerSelections: {
      type: mongoose.Schema.Types.Mixed,
    },

    // ===== Pricing =====
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
        "negotiated",
      ],
      required: true,
    },

    priceBreakdown: {
      basePrice: Number,
      modifiers: {
        urgency: String,
        timeOfDay: String,
        dayType: String,
      },
      multiplier: Number,
      subtotal: Number,
      materialsIncluded: Boolean,
      depositAmount: Number,
    },

    estimatedPrice: {
      type: Number,
      min: 0,
    },
    agreedPrice: {
      type: Number,
      min: 0,
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },

    // ===== Status tracking =====
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "declined",
        "negotiating",
        "confirmed",
        "in_progress",
        "completed",
        "payment_released", // ✅ ADDED THIS
        "cancelled",
        "disputed",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "released"],
      default: "unpaid",
    },

    // ===== Timers =====
    expiresAt: {
      type: Date,
      index: true,
    },
    acceptedAt: Date,
    declinedAt: Date,
    confirmedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    paymentReleasedAt: Date, // ✅ ADDED THIS

    // ===== Completion details =====
    completionPhotos: [
      {
        url: String,
        publicId: String,
        type: {
          type: String,
          enum: ["before", "after", "during"],
        },
      },
    ],
    completionNotes: String,
    workDuration: Number,
    materialsUsed: [
      {
        name: String,
        cost: Number,
      },
    ],

    // ===== Cancellation/Decline =====
    cancellationReason: String,
    cancelledBy: {
      type: String,
      enum: ["customer", "artisan", "admin", "system"],
    },
    declineReason: String,

    // ===== Payment references =====
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
    },

    // ===== Reviews =====
    customerReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
    artisanReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },

    // ===== Negotiation =====
    negotiation: {
      isNegotiating: {
        type: Boolean,
        default: false,
      },
      rounds: [
        {
          proposedBy: {
            type: String,
            enum: ["customer", "artisan"],
          },
          amount: Number,
          message: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      maxRounds: {
        type: Number,
        default: 3,
      },
    },

    // ===== Admin fields =====
    isDisputed: {
      type: Boolean,
      default: false,
    },
    dispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
    },

    // ===== Metadata =====
    distance: Number,
    eta: String,
  },
  {
    timestamps: true,
  }
);

// ===== INDEXES =====
BookingSchema.index({ artisan: 1, status: 1, createdAt: -1 });
BookingSchema.index({ artisan: 1, status: 1, expiresAt: 1 });
BookingSchema.index({ artisan: 1, customerName: 1 });
BookingSchema.index({ artisan: 1, serviceName: 1 });
BookingSchema.index({ artisan: 1, bookingNumber: 1 });
BookingSchema.index({ customer: 1, status: 1, createdAt: -1 });
BookingSchema.index({ customer: 1, scheduledDate: 1 });
BookingSchema.index({ customer: 1, completedAt: -1 });
BookingSchema.index({ artisan: 1, completedAt: -1 });
BookingSchema.index({ artisanService: 1 });

// ===== PRE-SAVE HOOKS =====
BookingSchema.pre("save", async function (next) {
  if (!this.bookingNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.bookingNumber = `BK-${Date.now()}-${String(count + 1).padStart(
        4,
        "0"
      )}`;
    } catch (error) {
      console.error("❌ Error generating booking number:", error);
      return next(error);
    }
  }
  next();
});

BookingSchema.pre("save", function (next) {
  if (this.isNew && this.status === "pending") {
    this.expiresAt = new Date(Date.now() + 2 * 60 * 1000);
  }
  next();
});

BookingSchema.pre("save", async function (next) {
  if (
    this.isModified("customer") ||
    this.isModified("service") ||
    !this.customerName ||
    !this.serviceName
  ) {
    try {
      if (this.customer && !this.customerName) {
        await this.populate(
          "customer",
          "firstName lastName email phone profilePhoto"
        );
        if (this.customer) {
          this.customerName = `${this.customer.firstName} ${this.customer.lastName}`;
          this.customerEmail = this.customer.email;
          this.customerPhone = this.customer.phone;
          this.customerPhoto = this.customer.profilePhoto;
        }
      }

      if (this.service && !this.serviceName) {
        await this.populate("service", "name slug");
        if (this.service) {
          this.serviceName = this.service.name;
          this.serviceSlug = this.service.slug;
        }
      }
    } catch (error) {
      console.error("❌ Error denormalizing data:", error);
    }
  }
  next();
});

const Booking = mongoose.model("Booking", BookingSchema);

export default Booking;
