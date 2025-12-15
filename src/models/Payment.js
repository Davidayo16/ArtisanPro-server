import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artisan",
      required: true,
    },
    paymentReference: {
      type: String,
      unique: true,
      required: true,
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },
    artisanAmount: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "ussd", "mobile_money", "bank"],
      default: "card",
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed", "cancelled"],
      default: "pending",
    },
    paidAt: Date,
    failedAt: Date,
    failureReason: String,
    paystackResponse: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Generate unique payment reference
PaymentSchema.pre("save", async function (next) {
  if (!this.paymentReference) {
    this.paymentReference = `PAY-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
  }
  next();
});

PaymentSchema.index({ booking: 1 });
PaymentSchema.index({ customer: 1, status: 1 });
PaymentSchema.index({ paystackReference: 1 });
PaymentSchema.index({ artisan: 1, status: 1, paidAt: -1 });
PaymentSchema.index({ customer: 1, status: 1, paidAt: -1 });

const Payment = mongoose.model("Payment", PaymentSchema);

export default Payment;
