import mongoose from "mongoose";

const PriceNegotiationSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "artisan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "agreed", "rejected", "expired"],
      default: "active",
    },
    rounds: [
      {
        roundNumber: Number,
        proposedBy: {
          type: String,
          enum: ["customer", "artisan"],
          required: true,
        },
        proposedAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        message: {
          type: String,
          maxlength: 500,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        response: {
          type: String,
          enum: ["accepted", "countered", "rejected", "pending"],
          default: "pending",
        },
      },
    ],
    initialPrice: {
      type: Number,
      required: true,
    },
    agreedPrice: {
      type: Number,
    },
    maxRounds: {
      type: Number,
      default: 3,
    },
    currentRound: {
      type: Number,
      default: 1,
    },
    expiresAt: {
      type: Date, // Negotiation expires after 24 hours
    },
  },
  {
    timestamps: true,
  }
);

// Set expiry time when negotiation starts
PriceNegotiationSchema.pre("save", function (next) {
  if (this.isNew) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

const PriceNegotiation = mongoose.model(
  "PriceNegotiation",
  PriceNegotiationSchema
);

export default PriceNegotiation;
